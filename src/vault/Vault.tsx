import { useEffect, useMemo, useState } from "react";
import { useCopyPassword } from "../hooks/useCopyPassword";
import { useIsMobile } from "../hooks/useIsMobile";
import { listActivityForCredential, logActivity } from "../lib/activityService";
import type { UnlockedSession } from "../lib/authService";
import {
	createCredential,
	decryptCredentialPassword,
	deleteCredential,
	listCredentials,
	updateCredential,
	type CredentialFormValues,
	type CredentialRow,
} from "../lib/credentialService";
import { createGroup, listGroups, unwrapMyGroupKey, type GroupSummary } from "../lib/groupService";
import { createSubgroup, deleteSubgroup, listSubgroups, type Subgroup } from "../lib/subgroupService";
import { ConfirmDialog } from "./ConfirmDialog";
import { CreateGroupDialog } from "./CreateGroupDialog";
import { CredentialFormDialog } from "./CredentialFormDialog";
import { DesktopVault } from "./DesktopVault";
import { GroupSettingsDialog } from "./GroupSettingsDialog";
import { MobileVault } from "./MobileVault";
import { NO_SUBGROUP, type CredentialSection } from "./types";

interface VaultProps {
	session: UnlockedSession;
	onLock: () => void;
	onLogout: () => void;
}

export function Vault({ session, onLock, onLogout }: VaultProps) {
	const isMobile = useIsMobile();

	const [groups, setGroups] = useState<GroupSummary[]>([]);
	const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
	const [groupKeys, setGroupKeys] = useState<Map<string, CryptoKey>>(new Map());

	const [subgroups, setSubgroups] = useState<Subgroup[]>([]);
	const [credentials, setCredentials] = useState<CredentialRow[]>([]);
	const [query, setQuery] = useState("");
	const [selectedCredentialId, setSelectedCredentialId] = useState<string | null>(null);

	const [showCreateGroup, setShowCreateGroup] = useState(false);
	const [showGroupSettings, setShowGroupSettings] = useState(false);
	const [credentialDialog, setCredentialDialog] = useState<
		| { mode: "create" }
		| { mode: "edit"; credentialId: string; row: CredentialRow; password: string }
		| null
	>(null);
	const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
	const [confirmDeleteSubgroup, setConfirmDeleteSubgroup] = useState<Subgroup | null>(null);

	const selectedGroup = groups.find((g) => g.id === selectedGroupId) ?? null;
	const groupKey = selectedGroupId ? (groupKeys.get(selectedGroupId) ?? null) : null;
	const { copy, status: copyStatus } = useCopyPassword(groupKey);

	useEffect(() => {
		listGroups(session).then((loaded) => {
			setGroups(loaded);
			if (loaded.length > 0 && loaded[0]) setSelectedGroupId(loaded[0].id);
		});
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	useEffect(() => {
		if (!selectedGroupId) return;
		if (!groupKeys.has(selectedGroupId)) {
			unwrapMyGroupKey(session, selectedGroupId).then((key) => {
				setGroupKeys((prev) => new Map(prev).set(selectedGroupId, key));
			});
		}
		refreshGroupContents(selectedGroupId);
		setSelectedCredentialId(null);
		setQuery("");
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [selectedGroupId]);

	async function refreshGroupContents(groupId: string) {
		const [s, c] = await Promise.all([listSubgroups(groupId), listCredentials(groupId)]);
		setSubgroups(s);
		setCredentials(c);
	}

	async function refreshGroups() {
		setGroups(await listGroups(session));
	}

	const sections = useMemo<CredentialSection[]>(() => {
		const q = query.trim().toLowerCase();
		const filtered = q
			? credentials.filter((c) =>
					[c.title, c.username ?? "", c.url ?? ""].some((field) => field.toLowerCase().includes(q)),
				)
			: credentials;

		const bySubgroup = new Map<string, CredentialRow[]>();
		for (const row of filtered) {
			const key = row.subgroup_id ?? NO_SUBGROUP;
			const bucket = bySubgroup.get(key) ?? [];
			bucket.push(row);
			bySubgroup.set(key, bucket);
		}

		const result: CredentialSection[] = [];
		for (const subgroup of subgroups) {
			const rows = bySubgroup.get(subgroup.id);
			if (rows?.length) result.push({ key: subgroup.id, label: subgroup.name, rows });
		}
		const noSubgroupRows = bySubgroup.get(NO_SUBGROUP);
		if (noSubgroupRows?.length) result.push({ key: NO_SUBGROUP, label: "Sin carpeta", rows: noSubgroupRows });
		return result;
	}, [credentials, subgroups, query]);

	const selectedCredential = credentials.find((c) => c.id === selectedCredentialId) ?? null;

	async function handleCreateGroup(name: string) {
		const id = await createGroup(session, name);
		await logActivity(id, session.userId, "group_created");
		await refreshGroups();
		setSelectedGroupId(id);
		setShowCreateGroup(false);
	}

	function handleGroupRenamed(name: string) {
		if (!selectedGroupId) return;
		setGroups((prev) => prev.map((g) => (g.id === selectedGroupId ? { ...g, name } : g)));
	}

	async function handleGroupDeleted() {
		setShowGroupSettings(false);
		const remaining = groups.filter((g) => g.id !== selectedGroupId);
		setGroups(remaining);
		setSelectedGroupId(remaining[0]?.id ?? null);
	}

	async function handleAddSubgroup(name: string) {
		if (!selectedGroupId) return;
		await createSubgroup(selectedGroupId, name);
		await logActivity(selectedGroupId, session.userId, "subgroup_created", name);
		setSubgroups(await listSubgroups(selectedGroupId));
	}

	async function handleConfirmDeleteSubgroup() {
		if (!confirmDeleteSubgroup || !selectedGroupId) return;
		await deleteSubgroup(confirmDeleteSubgroup.id);
		await logActivity(selectedGroupId, session.userId, "subgroup_deleted", confirmDeleteSubgroup.name);
		await refreshGroupContents(selectedGroupId);
		setConfirmDeleteSubgroup(null);
	}

	async function handleSaveCredential(values: CredentialFormValues) {
		if (!selectedGroupId || !groupKey) return;
		if (credentialDialog?.mode === "edit") {
			await updateCredential(groupKey, credentialDialog.credentialId, values);
			await logActivity(selectedGroupId, session.userId, "credential_updated", values.title, credentialDialog.credentialId);
		} else {
			const id = await createCredential(groupKey, selectedGroupId, session.userId, values);
			await logActivity(selectedGroupId, session.userId, "credential_created", values.title, id);
		}
		await refreshGroupContents(selectedGroupId);
		setCredentialDialog(null);
	}

	async function handleStartEdit(row: CredentialRow) {
		if (!groupKey) return;
		const password = await decryptCredentialPassword(groupKey, row);
		setCredentialDialog({ mode: "edit", credentialId: row.id, row, password });
	}

	async function handleConfirmDelete() {
		if (!confirmDeleteId || !selectedGroupId) return;
		const title = credentials.find((c) => c.id === confirmDeleteId)?.title ?? "";
		await deleteCredential(confirmDeleteId);
		await logActivity(selectedGroupId, session.userId, "credential_deleted", title);
		await refreshGroupContents(selectedGroupId);
		if (selectedCredentialId === confirmDeleteId) setSelectedCredentialId(null);
		setConfirmDeleteId(null);
	}

	const sharedProps = {
		session,
		groups,
		selectedGroup,
		onSelectGroup: setSelectedGroupId,
		onAddGroup: () => setShowCreateGroup(true),
		onLock,
		onLogout,
		sections,
		query,
		onQueryChange: setQuery,
		selectedCredentialId,
		onSelectCredential: setSelectedCredentialId,
		selectedCredential,
		onCopy: (row: CredentialRow) => copy(row),
		onReveal: (row: CredentialRow) => {
			if (!groupKey) throw new Error("Clave de grupo no disponible todavía");
			return decryptCredentialPassword(groupKey, row);
		},
		copyStatus,
		onEdit: handleStartEdit,
		onDelete: setConfirmDeleteId,
		onAddCredential: () => setCredentialDialog({ mode: "create" }),
		onAddSubgroup: handleAddSubgroup,
		onDeleteSubgroup: (id: string, name: string) => setConfirmDeleteSubgroup({ id, name }),
		onOpenGroupSettings: () => setShowGroupSettings(true),
		onLoadCredentialActivity: listActivityForCredential,
	};

	return (
		<div className="app-shell">
			{isMobile ? <MobileVault {...sharedProps} /> : <DesktopVault {...sharedProps} />}

			{showCreateGroup ? (
				<CreateGroupDialog onCreate={handleCreateGroup} onClose={() => setShowCreateGroup(false)} />
			) : null}

			{showGroupSettings && selectedGroup ? (
				<GroupSettingsDialog
					session={session}
					group={selectedGroup}
					onRenamed={handleGroupRenamed}
					onDeleted={handleGroupDeleted}
					onClose={() => setShowGroupSettings(false)}
				/>
			) : null}

			{credentialDialog ? (
				<CredentialFormDialog
					title={credentialDialog.mode === "edit" ? "Editar credencial" : "Nueva credencial"}
					subgroups={subgroups}
					submitLabel={credentialDialog.mode === "edit" ? "Guardar" : "Crear"}
					initialValues={
						credentialDialog.mode === "edit"
							? {
									title: credentialDialog.row.title,
									username: credentialDialog.row.username ?? "",
									url: credentialDialog.row.url ?? "",
									notes: credentialDialog.row.notes ?? "",
									subgroupId: credentialDialog.row.subgroup_id,
									password: credentialDialog.password,
								}
							: undefined
					}
					onSubmit={handleSaveCredential}
					onClose={() => setCredentialDialog(null)}
				/>
			) : null}

			{confirmDeleteId ? (
				<ConfirmDialog
					title="Borrar credencial"
					message={`Se borra "${credentials.find((c) => c.id === confirmDeleteId)?.title ?? ""}" para siempre. Esta acción no se puede deshacer.`}
					confirmLabel="Borrar"
					danger
					onConfirm={handleConfirmDelete}
					onCancel={() => setConfirmDeleteId(null)}
				/>
			) : null}

			{confirmDeleteSubgroup ? (
				<ConfirmDialog
					title="Borrar carpeta"
					message={`Se borra la carpeta "${confirmDeleteSubgroup.name}". Sus credenciales no se borran, quedan sin carpeta.`}
					confirmLabel="Borrar"
					danger
					onConfirm={handleConfirmDeleteSubgroup}
					onCancel={() => setConfirmDeleteSubgroup(null)}
				/>
			) : null}
		</div>
	);
}
