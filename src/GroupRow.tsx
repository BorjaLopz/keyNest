import { useState } from "react";
import type { UnlockedSession } from "./lib/authService";
import { inviteMember, unwrapMyGroupKey, type GroupSummary } from "./lib/groupService";

interface GroupRowProps {
	session: UnlockedSession;
	group: GroupSummary;
}

export function GroupRow({ session, group }: GroupRowProps) {
	const [inviteEmail, setInviteEmail] = useState("");
	const [loading, setLoading] = useState(false);
	const [status, setStatus] = useState<string | null>(null);

	async function handleVerify() {
		setStatus(null);
		try {
			await unwrapMyGroupKey(session, group.id);
			setStatus("Clave de grupo desenvuelta correctamente.");
		} catch {
			setStatus("Fallo al desenvolver la clave.");
		}
	}

	async function handleInvite() {
		const email = inviteEmail.trim();
		if (!email) return;
		setLoading(true);
		setStatus(null);
		try {
			await inviteMember(session, group.id, email);
			setStatus(`${email} invitado correctamente.`);
			setInviteEmail("");
		} catch (err) {
			setStatus(err instanceof Error ? err.message : "Error al invitar");
		} finally {
			setLoading(false);
		}
	}

	return (
		<li
			style={{
				display: "flex",
				flexDirection: "column",
				gap: 8,
				padding: "12px 0",
				borderBottom: "1px solid #1c1d1f",
			}}
		>
			<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
				<span>
					{group.name} <span style={{ color: "var(--text-secondary)", fontSize: 12 }}>({group.role})</span>
				</span>
				<button className="secondary" onClick={handleVerify}>
					Verificar clave
				</button>
			</div>

			{group.role === "admin" ? (
				<div style={{ display: "flex", gap: 8 }}>
					<input
						placeholder="email a invitar"
						value={inviteEmail}
						onChange={(e) => setInviteEmail(e.target.value)}
						style={{ flex: 1 }}
					/>
					<button disabled={loading} onClick={handleInvite}>
						Invitar
					</button>
				</div>
			) : null}

			{status ? <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>{status}</span> : null}
		</li>
	);
}
