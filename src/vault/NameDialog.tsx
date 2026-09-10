import { useState } from "react";

interface NameDialogProps {
	title: string;
	label: string;
	submitLabel?: string;
	onSubmit: (name: string) => Promise<void>;
	onClose: () => void;
}

export function NameDialog({ title, label, submitLabel = "Crear", onSubmit, onClose }: NameDialogProps) {
	const [name, setName] = useState("");
	const [loading, setLoading] = useState(false);

	async function handleSubmit() {
		const trimmed = name.trim();
		if (!trimmed) return;
		setLoading(true);
		try {
			await onSubmit(trimmed);
		} finally {
			setLoading(false);
		}
	}

	return (
		<div className="dialog-backdrop" onClick={onClose}>
			<div className="dialog" onClick={(e) => e.stopPropagation()}>
				<div className="dialog-title">{title}</div>
				<div className="field">
					<label>{label}</label>
					<input
						className="input"
						autoFocus
						value={name}
						onChange={(e) => setName(e.target.value)}
						onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
					/>
				</div>
				<div className="dialog-actions">
					<button type="button" className="btn btn-secondary" onClick={onClose}>
						Cancelar
					</button>
					<button type="button" className="btn btn-primary" disabled={loading} onClick={handleSubmit}>
						{submitLabel}
					</button>
				</div>
			</div>
		</div>
	);
}
