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
import { CredentialFormDialog } from "./CredentialFormDialog";
import { DesktopVault } from "./DesktopVault";
import { GroupSettingsDialog } from "./GroupSettingsDialog";
import { MobileVault } from "./MobileVault";
import { NameDialog } from "./NameDialog";
import { NO_SUBGROUP, type FolderNode } from "./types";

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
	const [folderDialog, setFolderDialog] = useState<{ parentId: string | null; parentName: string } | null>(null);
	const [credentialDialog, setCredentialDialog] = useState<
		| { mode: "create" }
		| { mode: "edit"; credentialId: string; row: CredentialRow; password: string }
		| null
	>(null);
	const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
	const [confirmDeleteSubgroup, setConfirmDeleteSubgroup] = useState<{ id: string; name: string } | null>(null);
	const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());

	function handleToggleSection(key: string) {
		setCollapsedSections((prev) => {
			const next = new Set(prev);
			if (next.has(key)) next.delete(key);
			else next.add(key);
			return next;
		});
	}

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

	const folderTree = useMemo<FolderNode[]>(() => {
		const q = query.trim().toLowerCase();
		const filtered = q
			? credentials.filter((c) =>
					[c.title, c.username ?? "", c.url ?? ""].some((field) => field.toLowerCase().includes(q)),
				)
			: credentials;

		const credentialsBySubgroup = new Map<string, CredentialRow[]>();
		for (const row of filtered) {
			const key = row.subgroup_id ?? NO_SUBGROUP;
			const bucket = credentialsBySubgroup.get(key) ?? [];
			bucket.push(row);
			credentialsBySubgroup.set(key, bucket);
		}

		const subgroupsByParent = new Map<string | null, Subgroup[]>();
		for (const s of subgroups) {
			const bucket = subgroupsByParent.get(s.parentId) ?? [];
			bucket.push(s);
			subgroupsByParent.set(s.parentId, bucket);
		}

		function buildNode(subgroup: Subgroup, depth: number): FolderNode {
			return {
				id: subgroup.id,
				name: subgroup.name,
				depth,
				credentials: credentialsBySubgroup.get(subgroup.id) ?? [],
				children: (subgroupsByParent.get(subgroup.id) ?? []).map((child) => buildNode(child, depth + 1)),
			};
		}

		function hasContent(node: FolderNode): boolean {
			return node.credentials.length > 0 || node.children.some(hasContent);
		}

		let roots = (subgroupsByParent.get(null) ?? []).map((s) => buildNode(s, 0));
		if (q) roots = roots.filter(hasContent);

		const noFolderCredentials = credentialsBySubgroup.get(NO_SUBGROUP) ?? [];
		if (noFolderCredentials.length > 0) {
			roots.push({ id: NO_SUBGROUP, name: "Sin carpeta", depth: 0, credentials: noFolderCredentials, children: [] });
		}
		return roots;
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

	async function handleCreateFolder(name: string) {
		if (!selectedGroupId || !folderDialog) return;
		await createSubgroup(selectedGroupId, name, folderDialog.parentId);
		await logActivity(selectedGroupId, session.userId, "subgroup_created", name);
		setSubgroups(await listSubgroups(selectedGroupId));
		setFolderDialog(null);
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
		folderTree,
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
		onAddSubgroup: () => setFolderDialog({ parentId: null, parentName: selectedGroup?.name ?? "" }),
		onAddSubfolder: (parentId: string, parentName: string) => setFolderDialog({ parentId, parentName }),
		onDeleteSubgroup: (id: string, name: string) => setConfirmDeleteSubgroup({ id, name }),
		onOpenGroupSettings: () => setShowGroupSettings(true),
		onLoadCredentialActivity: listActivityForCredential,
		collapsedSections,
		onToggleSection: handleToggleSection,
	};

	return (
		<div className="app-shell">
			{isMobile ? <MobileVault {...sharedProps} /> : <DesktopVault {...sharedProps} />}

			{showCreateGroup ? (
				<NameDialog title="Nuevo grupo" label="Nombre" onSubmit={handleCreateGroup} onClose={() => setShowCreateGroup(false)} />
			) : null}

			{folderDialog ? (
				<NameDialog
					title={folderDialog.parentId ? `Nueva subcarpeta dentro de "${folderDialog.parentName}"` : "Nueva carpeta"}
					label="Nombre"
					onSubmit={handleCreateFolder}
					onClose={() => setFolderDialog(null)}
				/>
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
					message={`Se borra "${confirmDeleteSubgroup.name}" y todas sus subcarpetas. Las credenciales no se borran, quedan sin carpeta.`}
					confirmLabel="Borrar"
					danger
					onConfirm={handleConfirmDeleteSubgroup}
					onCancel={() => setConfirmDeleteSubgroup(null)}
				/>
			) : null}
		</div>
	);
}
