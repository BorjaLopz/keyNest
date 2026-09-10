import { ChevronRight, Eye, EyeOff, Lock, Plus, Search, Settings, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import type { ActivityEntry } from "../lib/activityService";
import { describeActivity } from "../lib/activityService";
import { formatRelativeTime, getDomain, getInitials } from "../lib/format";
import { NO_SUBGROUP, type VaultViewProps } from "./types";

export function DesktopVault({
	session,
	groups,
	selectedGroup,
	onSelectGroup,
	onAddGroup,
	onLock,
	sections,
	query,
	onQueryChange,
	selectedCredentialId,
	onSelectCredential,
	selectedCredential,
	onCopy,
	onReveal,
	copyStatus,
	onEdit,
	onDelete,
	onAddCredential,
	onAddSubgroup,
	onDeleteSubgroup,
	onOpenGroupSettings,
	onLoadCredentialActivity,
}: VaultViewProps) {
	const [newSubgroupName, setNewSubgroupName] = useState("");
	const [revealedPassword, setRevealedPassword] = useState<string | null>(null);
	const [activity, setActivity] = useState<ActivityEntry[]>([]);

	useEffect(() => {
		setRevealedPassword(null);
		setActivity([]);
		if (selectedCredentialId) onLoadCredentialActivity(selectedCredentialId).then(setActivity);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [selectedCredentialId]);

	async function handleToggleReveal() {
		if (revealedPassword !== null) {
			setRevealedPassword(null);
			return;
		}
		if (!selectedCredential) return;
		setRevealedPassword(await onReveal(selectedCredential));
	}

	function handleAddSubgroup() {
		const name = newSubgroupName.trim();
		if (!name) return;
		onAddSubgroup(name);
		setNewSubgroupName("");
	}

	const credentialCount = sections.reduce((sum, s) => sum + s.rows.length, 0);
	const domain = getDomain(selectedCredential?.url ?? null);

	return (
		<div className="vault-desktop">
			<nav className="rail">
				<img src="/brand/keynest-monogram-inverse.svg" alt="KeyNest" width={26} height={26} />
				<div className="rail-divider" />
				{groups.map((group) => (
					<button
						key={group.id}
						type="button"
						className={`rail-group${group.id === selectedGroup?.id ? " active" : ""}`}
						title={group.name}
						aria-label={group.name}
						onClick={() => onSelectGroup(group.id)}
					>
						{getInitials(group.name)}
					</button>
				))}
				<button type="button" className="rail-add" title="Crear grupo" onClick={onAddGroup}>
					<Plus size={20} strokeWidth={1.5} />
				</button>
				<div className="rail-bottom">
					<button type="button" className="rail-lock" title="Bloquear ahora" onClick={onLock}>
						<Lock size={18} strokeWidth={1.5} />
					</button>
					<div className="rail-avatar" title={session.email}>
						{getInitials(session.email)}
					</div>
				</div>
			</nav>

			<section className="list-panel">
				<div className="list-header">
					<div className="list-header-row">
						<h2>{selectedGroup?.name ?? "—"}</h2>
						<span className="mono-label">{credentialCount} CREDENCIALES</span>
					</div>
					<div style={{ display: "flex", gap: 8, marginTop: 10, alignItems: "center" }}>
						<div className="list-filter" style={{ flex: 1 }}>
							<Search size={14} strokeWidth={1.5} color="var(--color-neutral-600)" />
							<input
								placeholder={`Filtrar en ${selectedGroup?.name ?? ""}…`}
								value={query}
								onChange={(e) => onQueryChange(e.target.value)}
							/>
						</div>
						<button type="button" className="btn btn-secondary btn-icon" title="Configurar grupo" onClick={onOpenGroupSettings}>
							<Settings size={16} strokeWidth={1.5} />
						</button>
						<button type="button" className="btn btn-secondary btn-icon" title="Nueva credencial" onClick={onAddCredential}>
							<Plus size={16} strokeWidth={1.5} />
						</button>
					</div>
					<div style={{ display: "flex", gap: 8, marginTop: 8, alignItems: "center" }}>
						<input
							className="input"
							placeholder="nueva carpeta"
							value={newSubgroupName}
							onChange={(e) => setNewSubgroupName(e.target.value)}
							onKeyDown={(e) => e.key === "Enter" && handleAddSubgroup()}
							style={{ flex: 1, height: 28, fontSize: 12 }}
						/>
						<button type="button" className="btn btn-secondary" onClick={handleAddSubgroup} style={{ height: 28 }}>
							+ Carpeta
						</button>
					</div>
				</div>

				<div className="list-scroll">
					{sections.length === 0 ? (
						<div className="empty-list">Sin credenciales todavía</div>
					) : (
						sections.map((section) => (
							<div key={section.key}>
								<div className="subgroup-header">
									{section.label}
									<span className="count">{section.rows.length}</span>
									{section.key !== NO_SUBGROUP ? (
										<button
											type="button"
											className="btn btn-ghost"
											style={{ padding: 2, marginLeft: 8 }}
											title="Borrar carpeta"
											onClick={() => onDeleteSubgroup(section.key, section.label)}
										>
											<Trash2 size={12} strokeWidth={1.5} />
										</button>
									) : null}
								</div>
								{section.rows.map((row) => (
									<div
										key={row.id}
										className={`credential-row${row.id === selectedCredentialId ? " selected" : ""}`}
										onClick={() => onSelectCredential(row.id)}
									>
										<div className="credential-initials">{getInitials(row.title)}</div>
										<div className="credential-info">
											<div className="credential-title">{row.title}</div>
											<div className="credential-user">{row.username ?? ""}</div>
										</div>
										<ChevronRight size={14} strokeWidth={1.5} className="credential-chevron" />
									</div>
								))}
							</div>
						))
					)}
				</div>
			</section>

			{!selectedCredential ? (
				<div className="detail-panel">
					<div className="empty-detail">Selecciona una credencial</div>
				</div>
			) : (
				<div className="detail-panel">
					<div className="detail-header">
						<div className="detail-initials">{getInitials(selectedCredential.title)}</div>
						<div className="detail-title-block">
							<h2>{selectedCredential.title}</h2>
							<div className="detail-meta">
								{[domain, selectedGroup?.name].filter(Boolean).join(" · ")}
							</div>
						</div>
						<div className="detail-actions">
							<button type="button" className="btn btn-ghost" onClick={() => onDelete(selectedCredential.id)}>
								Borrar
							</button>
							<button type="button" className="btn btn-secondary" onClick={() => onEdit(selectedCredential)}>
								Editar
							</button>
							<button type="button" className="btn btn-primary" onClick={() => onCopy(selectedCredential)}>
								Copiar contraseña
							</button>
						</div>
					</div>

					<div className="detail-grid">
						<div className="card blueprint field-card">
							<i className="corner tl" />
							<i className="corner tr" />
							<i className="corner bl" />
							<i className="corner br" />
							<div className="field-label">Usuario</div>
							<div className="field-value">{selectedCredential.username || "—"}</div>
						</div>
						<div className="card blueprint field-card">
							<i className="corner tl" />
							<i className="corner tr" />
							<i className="corner bl" />
							<i className="corner br" />
							<div className="field-label">Contraseña · cifrada con la clave del grupo</div>
							<div className="field-value-row">
								<div className={`field-value${revealedPassword === null ? " masked" : ""}`}>
									{revealedPassword ?? "••••••••••••"}
								</div>
								<button type="button" className="btn btn-ghost" onClick={handleToggleReveal}>
									{revealedPassword === null ? <Eye size={14} strokeWidth={1.5} /> : <EyeOff size={14} strokeWidth={1.5} />}
								</button>
							</div>
							{revealedPassword === null ? <div className="field-note">Nunca se muestra sin pedirlo</div> : null}
						</div>
					</div>

					{selectedCredential.notes ? (
						<div className="card blueprint field-card">
							<i className="corner tl" />
							<i className="corner tr" />
							<i className="corner bl" />
							<i className="corner br" />
							<div className="field-label">Notas</div>
							<div className="notes-body">{selectedCredential.notes}</div>
						</div>
					) : null}

					{activity.length > 0 ? (
						<div>
							<div className="mono-label" style={{ marginBottom: 6 }}>
								Actividad
							</div>
							{activity.map((entry) => (
								<div key={entry.id} className="activity-row">
									<span className="activity-time">{formatRelativeTime(entry.createdAt)}</span>
									<span>
										{entry.actorEmail ?? "alguien"} {describeActivity(entry)}
									</span>
								</div>
							))}
						</div>
					) : null}

					{copyStatus ? <span className="mono-label">{copyStatus}</span> : null}
				</div>
			)}
		</div>
	);
}
