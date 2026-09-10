interface ConfirmDialogProps {
	title: string;
	message: string;
	confirmLabel?: string;
	danger?: boolean;
	onConfirm: () => void;
	onCancel: () => void;
}

export function ConfirmDialog({ title, message, confirmLabel = "Confirmar", danger, onConfirm, onCancel }: ConfirmDialogProps) {
	return (
		<div className="dialog-backdrop" onClick={onCancel}>
			<div className="dialog" style={{ width: "min(380px, 100%)" }} onClick={(e) => e.stopPropagation()}>
				<div className="dialog-title">{title}</div>
				<div className="dialog-body">{message}</div>
				<div className="dialog-actions">
					<button type="button" className="btn btn-secondary" onClick={onCancel}>
						Cancelar
					</button>
					<button
						type="button"
						className="btn btn-primary"
						style={danger ? { background: "#c1443c", borderColor: "#c1443c" } : undefined}
						onClick={onConfirm}
					>
						{confirmLabel}
					</button>
				</div>
			</div>
		</div>
	);
}
