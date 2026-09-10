import { useState } from "react";
import type { CredentialFormValues } from "./lib/credentialService";
import { estimatePasswordStrength, generateSecurePassword } from "./lib/passwordGenerator";
import { buildIndentedSubgroups, type Subgroup } from "./lib/subgroupService";

interface CredentialFormProps {
	subgroups: Subgroup[];
	initialValues?: Partial<CredentialFormValues>;
	submitLabel: string;
	requirePassword?: boolean;
	onSubmit: (values: CredentialFormValues) => Promise<void>;
	onCancel: () => void;
}

const emptyValues: CredentialFormValues = {
	title: "",
	username: "",
	url: "",
	notes: "",
	subgroupId: null,
	password: "",
};

const STRENGTH_COLORS = ["#c1443c", "#c98a2e", "#a9962c", "#4f8f57", "#2f7a63"];

export function CredentialForm({
	subgroups,
	initialValues,
	submitLabel,
	requirePassword = true,
	onSubmit,
	onCancel,
}: CredentialFormProps) {
	const [values, setValues] = useState<CredentialFormValues>({ ...emptyValues, ...initialValues });
	const [showPassword, setShowPassword] = useState(false);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	function update<K extends keyof CredentialFormValues>(key: K, value: CredentialFormValues[K]) {
		setValues((prev) => ({ ...prev, [key]: value }));
	}

	function handleGenerate() {
		const generated = generateSecurePassword();
		update("password", generated);
		setShowPassword(true);
	}

	async function handleSubmit() {
		setError(null);
		if (!values.title.trim()) return;
		if (requirePassword && !values.password) {
			setError("La password es obligatoria.");
			return;
		}
		setLoading(true);
		try {
			await onSubmit(values);
		} finally {
			setLoading(false);
		}
	}

	const strength = estimatePasswordStrength(values.password);

	return (
		<div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
			<div className="field">
				<label>Título</label>
				<input className="input" value={values.title} onChange={(e) => update("title", e.target.value)} />
			</div>
			<div className="field">
				<label>Usuario</label>
				<input className="input" value={values.username} onChange={(e) => update("username", e.target.value)} />
			</div>
			<div className="field">
				<label>URL</label>
				<input className="input" value={values.url} onChange={(e) => update("url", e.target.value)} />
			</div>
			<div className="field">
				<label>Notas</label>
				<textarea className="input" value={values.notes} onChange={(e) => update("notes", e.target.value)} />
			</div>

			<div className="field">
				<label>Password</label>
				<div style={{ display: "flex", gap: 8 }}>
					<input
						className="input"
						type={showPassword ? "text" : "password"}
						value={values.password}
						onChange={(e) => update("password", e.target.value)}
						style={{ flex: 1 }}
					/>
					<button type="button" className="btn btn-secondary" onClick={() => setShowPassword((v) => !v)}>
						{showPassword ? "Ocultar" : "Ver"}
					</button>
					<button type="button" className="btn btn-secondary" onClick={handleGenerate}>
						Generar
					</button>
				</div>
			</div>

			{values.password ? (
				<div>
					<div style={{ height: 3, background: "var(--color-neutral-300)" }}>
						<div
							style={{
								height: "100%",
								width: `${(strength.score + 1) * 20}%`,
								background: STRENGTH_COLORS[strength.score],
							}}
						/>
					</div>
					<span className="mono-label" style={{ marginTop: 4, display: "inline-block" }}>
						{strength.label}
					</span>
				</div>
			) : null}

			<div className="field">
				<label>Carpeta</label>
				<select
					className="input"
					value={values.subgroupId ?? ""}
					onChange={(e) => update("subgroupId", e.target.value || null)}
				>
					<option value="">Sin carpeta</option>
					{buildIndentedSubgroups(subgroups).map((s) => (
						<option key={s.id} value={s.id}>
							{s.label}
						</option>
					))}
				</select>
			</div>

			{error ? <span style={{ color: "#c1443c", fontSize: 12.5 }}>{error}</span> : null}

			<div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
				<button type="button" className="btn btn-secondary" onClick={onCancel}>
					Cancelar
				</button>
				<button type="button" className="btn btn-primary" disabled={loading} onClick={handleSubmit}>
					{submitLabel}
				</button>
			</div>
		</div>
	);
}
