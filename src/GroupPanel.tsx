import { useEffect, useState } from "react";
import type { UnlockedSession } from "./lib/authService";
import { createGroup, listGroups, unwrapMyGroupKey, type GroupSummary } from "./lib/groupService";

interface GroupPanelProps {
	session: UnlockedSession;
}

export function GroupPanel({ session }: GroupPanelProps) {
	const [groups, setGroups] = useState<GroupSummary[]>([]);
	const [newGroupName, setNewGroupName] = useState("");
	const [loading, setLoading] = useState(false);
	const [status, setStatus] = useState<string | null>(null);

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

	async function handleVerify(group: GroupSummary) {
		setStatus(null);
		try {
			await unwrapMyGroupKey(session, group.id);
			setStatus(`"${group.name}": clave de grupo desenvuelta correctamente.`);
		} catch {
			setStatus(`"${group.name}": fallo al desenvolver la clave.`);
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

			<ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 8 }}>
				{groups.map((group) => (
					<li key={group.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
						<span>
							{group.name} <span style={{ color: "var(--text-secondary)", fontSize: 12 }}>({group.role})</span>
						</span>
						<button className="secondary" onClick={() => handleVerify(group)}>
							Verificar clave
						</button>
					</li>
				))}
			</ul>

			{status ? <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>{status}</span> : null}
		</div>
	);
}
