import { useState } from "react";

interface InviteDialogProps {
	groupName: string;
	onInvite: (email: string) => Promise<void>;
	onClose: () => void;
}

export function InviteDialog({ groupName, onInvite, onClose }: InviteDialogProps) {
	const [email, setEmail] = useState("");
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	async function handleSubmit() {
		const trimmed = email.trim();
		if (!trimmed) return;
		setLoading(true);
		setError(null);
		try {
			await onInvite(trimmed);
			onClose();
		} catch (err) {
			setError(err instanceof Error ? err.message : "Error al invitar");
		} finally {
			setLoading(false);
		}
	}

	return (
		<div className="dialog-backdrop" onClick={onClose}>
			<div className="dialog" onClick={(e) => e.stopPropagation()}>
				<div className="dialog-title">Invitar a "{groupName}"</div>
				<div className="field">
					<label>Email (ya debe tener cuenta en KeyNest)</label>
					<input
						className="input"
						autoFocus
						value={email}
						onChange={(e) => setEmail(e.target.value)}
						onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
					/>
				</div>
				{error ? <span style={{ color: "#c1443c", fontSize: 12.5 }}>{error}</span> : null}
				<div className="dialog-actions">
					<button type="button" className="btn btn-secondary" onClick={onClose}>
						Cancelar
					</button>
					<button type="button" className="btn btn-primary" disabled={loading} onClick={handleSubmit}>
						Invitar
					</button>
				</div>
			</div>
		</div>
	);
}
