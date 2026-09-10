import { useEffect, useMemo, useState } from "react";
import { useCopyPassword } from "../hooks/useCopyPassword";
import { useIsMobile } from "../hooks/useIsMobile";
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
import { createGroup, inviteMember, listGroups, unwrapMyGroupKey, type GroupSummary } from "../lib/groupService";
import { createSubgroup, listSubgroups, type Subgroup } from "../lib/subgroupService";
import { CreateGroupDialog } from "./CreateGroupDialog";
import { CredentialFormDialog } from "./CredentialFormDialog";
import { DesktopVault } from "./DesktopVault";
import { InviteDialog } from "./InviteDialog";
import { MobileVault } from "./MobileVault";
import type { CredentialSection } from "./types";

export const NO_SUBGROUP = "__none__";

interface VaultProps {
	session: UnlockedSession;
	onLock: () => void;
}

export function Vault({ session, onLock }: VaultProps) {
	const isMobile = useIsMobile();

	const [groups, setGroups] = useState<GroupSummary[]>([]);
	const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
	const [groupKeys, setGroupKeys] = useState<Map<string, CryptoKey>>(new Map());

	const [subgroups, setSubgroups] = useState<Subgroup[]>([]);
	const [credentials, setCredentials] = useState<CredentialRow[]>([]);
	const [query, setQuery] = useState("");
	const [selectedCredentialId, setSelectedCredentialId] = useState<string | null>(null);

	const [showCreateGroup, setShowCreateGroup] = useState(false);
	const [showInvite, setShowInvite] = useState(false);
	const [credentialDialog, setCredentialDialog] = useState<
		| { mode: "create" }
		| { mode: "edit"; credentialId: string; password: string }
		| null
	>(null);

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
		await refreshGroups();
		setSelectedGroupId(id);
		setShowCreateGroup(false);
	}

	async function handleInvite(email: string) {
		if (!selectedGroupId) return;
		await inviteMember(session, selectedGroupId, email);
	}

	async function handleAddSubgroup(name: string) {
		if (!selectedGroupId) return;
		await createSubgroup(selectedGroupId, name);
		setSubgroups(await listSubgroups(selectedGroupId));
	}

	async function handleSaveCredential(values: CredentialFormValues) {
		if (!selectedGroupId || !groupKey) return;
		if (credentialDialog?.mode === "edit") {
			await updateCredential(groupKey, credentialDialog.credentialId, values);
		} else {
			await createCredential(groupKey, selectedGroupId, session.userId, values);
		}
		await refreshGroupContents(selectedGroupId);
		setCredentialDialog(null);
	}

	async function handleStartEdit(row: CredentialRow) {
		if (!groupKey) return;
		const password = await decryptCredentialPassword(groupKey, row);
		setCredentialDialog({ mode: "edit", credentialId: row.id, password });
	}

	async function handleDeleteCredential(id: string) {
		await deleteCredential(id);
		if (!selectedGroupId) return;
		await refreshGroupContents(selectedGroupId);
		if (selectedCredentialId === id) setSelectedCredentialId(null);
	}

	const sharedProps = {
		session,
		groups,
		selectedGroup,
		onSelectGroup: setSelectedGroupId,
		onAddGroup: () => setShowCreateGroup(true),
		onLock,
		sections,
		query,
		onQueryChange: setQuery,
		selectedCredentialId,
		onSelectCredential: setSelectedCredentialId,
		selectedCredential,
		onCopy: (row: CredentialRow) => copy(row),
		copyStatus,
		onEdit: handleStartEdit,
		onDelete: handleDeleteCredential,
		onAddCredential: () => setCredentialDialog({ mode: "create" }),
		onAddSubgroup: handleAddSubgroup,
		onInvite: () => setShowInvite(true),
	};

	return (
		<div className="app-shell">
			{isMobile ? <MobileVault {...sharedProps} /> : <DesktopVault {...sharedProps} />}

			{showCreateGroup ? (
				<CreateGroupDialog onCreate={handleCreateGroup} onClose={() => setShowCreateGroup(false)} />
			) : null}

			{showInvite && selectedGroup ? (
				<InviteDialog groupName={selectedGroup.name} onInvite={handleInvite} onClose={() => setShowInvite(false)} />
			) : null}

			{credentialDialog ? (
				<CredentialFormDialog
					title={credentialDialog.mode === "edit" ? "Editar credencial" : "Nueva credencial"}
					subgroups={subgroups}
					submitLabel={credentialDialog.mode === "edit" ? "Guardar" : "Crear"}
					initialValues={credentialDialog.mode === "edit" ? { password: credentialDialog.password } : undefined}
					onSubmit={handleSaveCredential}
					onClose={() => setCredentialDialog(null)}
				/>
			) : null}
		</div>
	);
}
