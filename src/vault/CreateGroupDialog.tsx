import { useState } from "react";

interface CreateGroupDialogProps {
	onCreate: (name: string) => Promise<void>;
	onClose: () => void;
}

export function CreateGroupDialog({ onCreate, onClose }: CreateGroupDialogProps) {
	const [name, setName] = useState("");
	const [loading, setLoading] = useState(false);

	async function handleSubmit() {
		const trimmed = name.trim();
		if (!trimmed) return;
		setLoading(true);
		try {
			await onCreate(trimmed);
		} finally {
			setLoading(false);
		}
	}

	return (
		<div className="dialog-backdrop" onClick={onClose}>
			<div className="dialog" onClick={(e) => e.stopPropagation()}>
				<div className="dialog-title">Nuevo grupo</div>
				<div className="field">
					<label>Nombre</label>
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
						Crear
					</button>
				</div>
			</div>
		</div>
	);
}
