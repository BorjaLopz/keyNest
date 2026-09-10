import { ChevronDown, ChevronLeft, ChevronRight, Eye, EyeOff, FolderPlus, Folder, Lock, LogOut, Plus, Search, Settings, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import type { ActivityEntry } from "../lib/activityService";
import { describeActivity } from "../lib/activityService";
import { formatRelativeTime, getDomain, getInitials } from "../lib/format";
import { NO_SUBGROUP, type FolderNode, type VaultViewProps } from "./types";

export function DesktopVault({
	session,
	groups,
	selectedGroup,
	onSelectGroup,
	onAddGroup,
	onLock,
	onLogout,
	folderTree,
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
	onAddSubfolder,
	onDeleteSubgroup,
	onOpenGroupSettings,
	onLoadCredentialActivity,
	collapsedSections,
	onToggleSection,
}: VaultViewProps) {
	const [showAddMenu, setShowAddMenu] = useState(false);
	const [revealedPassword, setRevealedPassword] = useState<string | null>(null);
	const [activity, setActivity] = useState<ActivityEntry[]>([]);
	const [railExpanded, setRailExpanded] = useState(() => localStorage.getItem("keynest_rail_expanded") === "1");

	useEffect(() => {
		localStorage.setItem("keynest_rail_expanded", railExpanded ? "1" : "0");
	}, [railExpanded]);

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

	function countNode(node: FolderNode): number {
		return node.credentials.length + node.children.reduce((sum, c) => sum + countNode(c), 0);
	}

	function renderFolder(node: FolderNode) {
		const collapsed = !query.trim() && collapsedSections.has(node.id);
		const indent = 16 + node.depth * 16;
		return (
			<div key={node.id}>
				<div className="subgroup-header" style={{ paddingLeft: indent }} onClick={() => onToggleSection(node.id)}>
					<ChevronDown size={12} strokeWidth={1.5} className={`chevron${collapsed ? " collapsed" : ""}`} />
					<Folder size={12} strokeWidth={1.5} style={{ color: "var(--color-accent-600)", flex: "none" }} />
					{node.name}
					<span className="count">{countNode(node)}</span>
					{node.id !== NO_SUBGROUP ? (
						<>
							<button
								type="button"
								className="btn btn-ghost"
								style={{ padding: 2, marginLeft: 8 }}
								title="Nueva subcarpeta"
								onClick={(e) => {
									e.stopPropagation();
									onAddSubfolder(node.id, node.name);
								}}
							>
								<Plus size={12} strokeWidth={1.5} />
							</button>
							<button
								type="button"
								className="btn btn-ghost"
								style={{ padding: 2 }}
								title="Borrar carpeta"
								onClick={(e) => {
									e.stopPropagation();
									onDeleteSubgroup(node.id, node.name);
								}}
							>
								<Trash2 size={12} strokeWidth={1.5} />
							</button>
						</>
					) : null}
				</div>
				{collapsed ? null : (
					<>
						{node.credentials.map((row) => (
							<div
								key={row.id}
								className={`credential-row${row.id === selectedCredentialId ? " selected" : ""}`}
								style={{ paddingLeft: indent }}
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
						{node.children.map(renderFolder)}
					</>
				)}
			</div>
		);
	}

	const credentialCount = folderTree.reduce((sum, node) => sum + countNode(node), 0);
	const domain = getDomain(selectedCredential?.url ?? null);

	return (
		<div className="vault-desktop">
			<nav className={`rail${railExpanded ? " expanded" : ""}`}>
				{railExpanded ? (
					<div className="rail-brand">
						<img src="/brand/keynest-monogram-inverse.svg" alt="" height={20} />
						<div>
							<img src="/brand/keynest-wordmark-inverse.svg" alt="KeyNest" height={26} />
							<div className="rail-tagline">Gestor de contraseñas</div>
						</div>
					</div>
				) : (
					<img src="/brand/keynest-monogram-inverse.svg" alt="KeyNest" width={26} height={26} />
				)}
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
						{railExpanded ? (
							<span className="rail-group-row">
								<span className="rail-group-icon">{getInitials(group.name)}</span>
								<span className="rail-group-name">{group.name}</span>
							</span>
						) : (
							getInitials(group.name)
						)}
					</button>
				))}
				<button type="button" className="rail-add" title="Crear grupo" onClick={onAddGroup}>
					{railExpanded ? (
						<span className="rail-group-row">
							<Plus size={16} strokeWidth={1.5} />
							<span className="rail-group-name">Crear grupo</span>
						</span>
					) : (
						<Plus size={20} strokeWidth={1.5} />
					)}
				</button>
				<div className="rail-bottom">
					<button
						type="button"
						className="rail-toggle"
						title={railExpanded ? "Colapsar" : "Expandir"}
						onClick={() => setRailExpanded((v) => !v)}
					>
						{railExpanded ? <ChevronLeft size={14} strokeWidth={1.5} /> : <ChevronRight size={14} strokeWidth={1.5} />}
					</button>
					<button type="button" className="rail-lock" title="Bloquear ahora" onClick={onLock}>
						<Lock size={18} strokeWidth={1.5} />
					</button>
					<button type="button" className="rail-lock" title="Cerrar sesión" onClick={onLogout}>
						<LogOut size={16} strokeWidth={1.5} />
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
						<button
							type="button"
							className="btn btn-secondary btn-icon"
							style={{ width: 30, height: 30 }}
							title="Configurar grupo"
							onClick={onOpenGroupSettings}
						>
							<Settings size={15} strokeWidth={1.5} />
						</button>
						<div className="add-menu-anchor">
							<button
								type="button"
								className="btn btn-secondary btn-icon"
								style={{ width: 30, height: 30 }}
								title="Añadir"
								onClick={() => setShowAddMenu((v) => !v)}
							>
								<Plus size={15} strokeWidth={1.5} />
							</button>
							{showAddMenu ? (
								<>
									<div className="add-menu-backdrop" onClick={() => setShowAddMenu(false)} />
									<div className="add-menu">
										<button
											type="button"
											onClick={() => {
												setShowAddMenu(false);
												onAddCredential();
											}}
										>
											<Plus size={14} strokeWidth={1.5} /> Nueva credencial
										</button>
										<button
											type="button"
											onClick={() => {
												setShowAddMenu(false);
												onAddSubgroup();
											}}
										>
											<FolderPlus size={14} strokeWidth={1.5} /> Nueva carpeta
										</button>
									</div>
								</>
							) : null}
						</div>
					</div>
				</div>

				<div className="list-scroll">
					{folderTree.length === 0 ? (
						<div className="empty-list">Sin credenciales todavía</div>
					) : (
						folderTree.map(renderFolder)
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
							<div className="field-label">Contraseña</div>
							<div className="field-value-row">
								<div className={`field-value${revealedPassword === null ? " masked" : ""}`}>
									{revealedPassword ?? "••••••••••••"}
								</div>
								<button type="button" className="btn btn-ghost" onClick={handleToggleReveal}>
									{revealedPassword === null ? <Eye size={14} strokeWidth={1.5} /> : <EyeOff size={14} strokeWidth={1.5} />}
								</button>
							</div>
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
