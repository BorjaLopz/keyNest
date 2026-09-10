import { useEffect, useState } from "react";
import { describeActivity, listActivity, logActivity, type ActivityEntry } from "../lib/activityService";
import type { UnlockedSession } from "../lib/authService";
import { formatRelativeTime } from "../lib/format";
import {
	deleteGroup,
	inviteMember,
	listGroupMembers,
	removeMember,
	renameGroup,
	type GroupMember,
	type GroupSummary,
} from "../lib/groupService";
import { ConfirmDialog } from "./ConfirmDialog";

interface GroupSettingsDialogProps {
	session: UnlockedSession;
	group: GroupSummary;
	onRenamed: (name: string) => void;
	onDeleted: () => void;
	onClose: () => void;
}

export function GroupSettingsDialog({ session, group, onRenamed, onDeleted, onClose }: GroupSettingsDialogProps) {
	const [name, setName] = useState(group.name);
	const [members, setMembers] = useState<GroupMember[]>([]);
	const [activity, setActivity] = useState<ActivityEntry[]>([]);
	const [inviteEmail, setInviteEmail] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);
	const [confirmDelete, setConfirmDelete] = useState(false);
	const isAdmin = group.role === "admin";

	async function refreshMembers() {
		setMembers(await listGroupMembers(group.id));
	}

	async function refreshActivity() {
		setActivity(await listActivity(group.id));
	}

	useEffect(() => {
		refreshMembers();
		refreshActivity();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [group.id]);

	async function handleRename() {
		const trimmed = name.trim();
		if (!trimmed || trimmed === group.name) return;
		setLoading(true);
		setError(null);
		try {
			await renameGroup(group.id, trimmed);
			await logActivity(group.id, session.userId, "group_renamed", trimmed);
			onRenamed(trimmed);
			await refreshActivity();
		} catch (err) {
			setError(err instanceof Error ? err.message : "Error al renombrar");
		} finally {
			setLoading(false);
		}
	}

	async function handleInvite() {
		const email = inviteEmail.trim();
		if (!email) return;
		setLoading(true);
		setError(null);
		try {
			await inviteMember(session, group.id, email);
			await logActivity(group.id, session.userId, "member_invited", email);
			setInviteEmail("");
			await Promise.all([refreshMembers(), refreshActivity()]);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Error al invitar");
		} finally {
			setLoading(false);
		}
	}

	async function handleRemove(member: GroupMember) {
		setLoading(true);
		try {
			await removeMember(group.id, member.userId);
			await logActivity(group.id, session.userId, "member_removed", member.email ?? member.userId);
			await Promise.all([refreshMembers(), refreshActivity()]);
		} finally {
			setLoading(false);
		}
	}

	async function handleDelete() {
		setLoading(true);
		try {
			await deleteGroup(group.id);
			onDeleted();
		} finally {
			setLoading(false);
		}
	}

	return (
		<>
			<div className="dialog-backdrop" onClick={onClose}>
				<div className="dialog" onClick={(e) => e.stopPropagation()}>
					<div className="dialog-title">Configurar "{group.name}"</div>

					<div className="field">
						<label>Nombre del grupo</label>
						<div className="field-value-row">
							<input className="input" value={name} onChange={(e) => setName(e.target.value)} disabled={!isAdmin} />
							{isAdmin ? (
								<button type="button" className="btn btn-secondary" disabled={loading} onClick={handleRename}>
									Guardar
								</button>
							) : null}
						</div>
					</div>

					<div className="field">
						<label>Miembros</label>
						<div className="dialog-members">
							{members.map((m) => (
								<div key={m.userId} className="dialog-member-row">
									<span className="email">{m.email ?? m.userId}</span>
									<span className="mono-label">{m.role}</span>
									{isAdmin && m.userId !== session.userId ? (
										<button type="button" className="btn btn-ghost" disabled={loading} onClick={() => handleRemove(m)}>
											Quitar
										</button>
									) : null}
								</div>
							))}
						</div>
					</div>

					{isAdmin ? (
						<div className="field">
							<label>Invitar por email (debe tener cuenta en KeyNest)</label>
							<div className="field-value-row">
								<input
									className="input"
									value={inviteEmail}
									onChange={(e) => setInviteEmail(e.target.value)}
									onKeyDown={(e) => e.key === "Enter" && handleInvite()}
								/>
								<button type="button" className="btn btn-secondary" disabled={loading} onClick={handleInvite}>
									Invitar
								</button>
							</div>
						</div>
					) : null}

					<div className="field">
						<label>Actividad del grupo</label>
						<div className="dialog-members">
							{activity.length === 0 ? (
								<span className="mono-label">Sin actividad todavía</span>
							) : (
								activity.map((entry) => (
									<div key={entry.id} className="activity-row">
										<span className="activity-time">{formatRelativeTime(entry.createdAt)}</span>
										<span>
											{entry.actorEmail ?? "alguien"} {describeActivity(entry)}
										</span>
									</div>
								))
							)}
						</div>
					</div>

					{error ? <span style={{ color: "#c1443c", fontSize: 12.5 }}>{error}</span> : null}

					<div className="dialog-actions" style={{ justifyContent: "space-between" }}>
						{isAdmin ? (
							<button type="button" className="btn btn-ghost" disabled={loading} onClick={() => setConfirmDelete(true)}>
								Eliminar grupo
							</button>
						) : (
							<span />
						)}
						<button type="button" className="btn btn-secondary" onClick={onClose}>
							Cerrar
						</button>
					</div>
				</div>
			</div>

			{confirmDelete ? (
				<ConfirmDialog
					title="Eliminar grupo"
					message={`Se borra "${group.name}" y todas sus credenciales para siempre. Esta acción no se puede deshacer.`}
					confirmLabel="Eliminar"
					danger
					onConfirm={handleDelete}
					onCancel={() => setConfirmDelete(false)}
				/>
			) : null}
		</>
	);
}
