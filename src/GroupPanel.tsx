import { useEffect, useState } from "react";
import { GroupRow } from "./GroupRow";
import type { UnlockedSession } from "./lib/authService";
import { createGroup, listGroups, type GroupSummary } from "./lib/groupService";

interface GroupPanelProps {
	session: UnlockedSession;
}

export function GroupPanel({ session }: GroupPanelProps) {
	const [groups, setGroups] = useState<GroupSummary[]>([]);
	const [newGroupName, setNewGroupName] = useState("");
	const [loading, setLoading] = useState(false);

	async function refresh() {
		setGroups(await listGroups(session));
	}

	useEffect(() => {
		refresh();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	async function handleCreate() {
		const name = newGroupName.trim();
		if (!name) return;
		setLoading(true);
		try {
			await createGroup(session, name);
			setNewGroupName("");
			await refresh();
		} finally {
			setLoading(false);
		}
	}

	return (
		<div className="auth-shell">
			<h1>Tus grupos</h1>
			<input
				placeholder="nombre del grupo"
				value={newGroupName}
				onChange={(e) => setNewGroupName(e.target.value)}
			/>
			<button disabled={loading} onClick={handleCreate}>
				Crear grupo
			</button>

			<ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
				{groups.map((group) => (
					<GroupRow key={group.id} session={session} group={group} />
				))}
			</ul>
		</div>
	);
}
