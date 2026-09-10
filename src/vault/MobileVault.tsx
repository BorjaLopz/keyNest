import { ArrowLeft, Copy, Eye, EyeOff, Lock, Plus, Search, Settings, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import type { ActivityEntry } from "../lib/activityService";
import { describeActivity } from "../lib/activityService";
import { formatRelativeTime, getDomain, getInitials } from "../lib/format";
import { NO_SUBGROUP, type VaultViewProps } from "./types";

export function MobileVault({
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
	const credentialCount = sections.reduce((sum, s) => sum + s.rows.length, 0);

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

	if (selectedCredential) {
		const domain = getDomain(selectedCredential.url);
		return (
			<div className="mobile-detail">
				<div className="mobile-detail-header">
					<div className="mobile-detail-backrow">
						<button type="button" className="mobile-detail-back" onClick={() => onSelectCredential("")}>
							<ArrowLeft size={18} strokeWidth={1.5} />
						</button>
						<span className="mobile-detail-breadcrumb">
							{selectedGroup?.name?.toUpperCase()} / {selectedCredential.title.toUpperCase()}
						</span>
					</div>
					<div className="mobile-detail-identity">
						<div className="mobile-detail-initials">{getInitials(selectedCredential.title)}</div>
						<div>
							<h2 className="mobile-detail-title">{selectedCredential.title}</h2>
							{domain ? <div className="mobile-detail-domain">{domain}</div> : null}
						</div>
					</div>
				</div>

				<div className="mobile-detail-body">
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
						<div className="field-label">Contraseña · clave del grupo</div>
						<div className="field-value-row">
							<div className={`field-value${revealedPassword === null ? " masked" : ""}`}>
								{revealedPassword ?? "••••••••••••"}
							</div>
							<button type="button" className="btn btn-ghost" onClick={handleToggleReveal}>
								{revealedPassword === null ? <Eye size={16} strokeWidth={1.5} /> : <EyeOff size={16} strokeWidth={1.5} />}
							</button>
						</div>
						<div className="field-note">Copiar limpia el portapapeles en 20 s.</div>
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
					<button type="button" className="btn btn-ghost" onClick={() => onDelete(selectedCredential.id)}>
						Borrar credencial
					</button>
				</div>

				<div className="mobile-detail-actions">
					<button type="button" className="btn btn-primary" onClick={() => onCopy(selectedCredential)}>
						Copiar contraseña
					</button>
					<button type="button" className="btn btn-secondary btn-edit" onClick={() => onEdit(selectedCredential)}>
						Editar
					</button>
				</div>
			</div>
		);
	}

	function handleAddSubgroup() {
		const name = newSubgroupName.trim();
		if (!name) return;
		onAddSubgroup(name);
		setNewSubgroupName("");
	}

	return (
		<div className="vault-mobile">
			<div className="mobile-topbar">
				<div className="mobile-brand">
					<img src="/brand/keynest-monogram.svg" alt="" width={22} height={22} />
					<img src="/brand/keynest-wordmark.svg" alt="KeyNest" height={20} />
				</div>
				<div className="mobile-topbar-right">
					<button type="button" className="mobile-lock-btn" onClick={onLock}>
						<Lock size={13} strokeWidth={1.5} /> Bloquear
					</button>
				</div>
			</div>

			<div className="mobile-groupblock">
				<h2>{selectedGroup?.name ?? "—"}</h2>
				<div className="mobile-groupblock-meta">{credentialCount} CREDENCIALES</div>
				<div className="mobile-filter">
					<Search size={14} strokeWidth={1.5} color="var(--color-neutral-600)" />
					<input
						placeholder={`Filtrar en ${selectedGroup?.name ?? ""}…`}
						value={query}
						onChange={(e) => onQueryChange(e.target.value)}
					/>
				</div>
				<div style={{ display: "flex", gap: 8, marginTop: 10 }}>
					<button type="button" className="btn btn-secondary" style={{ flex: 1, height: 44 }} onClick={onAddCredential}>
						<Plus size={16} strokeWidth={1.5} /> Credencial
					</button>
					<button
						type="button"
						className="btn btn-secondary"
						style={{ height: 44, width: 44, padding: 0 }}
						onClick={onOpenGroupSettings}
					>
						<Settings size={16} strokeWidth={1.5} />
					</button>
				</div>
				<div style={{ display: "flex", gap: 8, marginTop: 8 }}>
					<input
						className="input"
						placeholder="nueva carpeta"
						value={newSubgroupName}
						onChange={(e) => setNewSubgroupName(e.target.value)}
						onKeyDown={(e) => e.key === "Enter" && handleAddSubgroup()}
						style={{ flex: 1, height: 36, fontSize: 13 }}
					/>
					<button type="button" className="btn btn-secondary" onClick={handleAddSubgroup} style={{ height: 36 }}>
						+
					</button>
				</div>
			</div>

			<div className="mobile-list">
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
										onClick={() => onDeleteSubgroup(section.key, section.label)}
									>
										<Trash2 size={13} strokeWidth={1.5} />
									</button>
								) : null}
							</div>
							{section.rows.map((row) => (
								<div key={row.id} className="mobile-row" onClick={() => onSelectCredential(row.id)}>
									<div className="mobile-row-initials">{getInitials(row.title)}</div>
									<div className="mobile-row-info">
										<div className="mobile-row-title">{row.title}</div>
										<div className="mobile-row-user">{row.username ?? ""}</div>
									</div>
									<button
										type="button"
										className="mobile-row-copy"
										onClick={(e) => {
											e.stopPropagation();
											onCopy(row);
										}}
									>
										<Copy size={16} strokeWidth={1.5} />
									</button>
								</div>
							))}
						</div>
					))
				)}
			</div>

			<div className="mobile-bottombar">
				<div className="mobile-bottombar-groups">
					{groups.map((group) => (
						<button
							key={group.id}
							type="button"
							className={`mobile-group-square${group.id === selectedGroup?.id ? " active" : ""}`}
							onClick={() => onSelectGroup(group.id)}
						>
							{getInitials(group.name)}
						</button>
					))}
				</div>
				<div className="mobile-bottombar-actions">
					<button type="button" className="mobile-add-square" onClick={onAddGroup}>
						<Plus size={20} strokeWidth={1.5} />
					</button>
					<button type="button" className="mobile-lock-square" onClick={onLock}>
						<Lock size={18} strokeWidth={1.5} />
					</button>
				</div>
			</div>
		</div>
	);
}
