import { useState } from "react";
import { bufferToBase64 } from "./lib/base64";
import { loginUser, registerUser, type UnlockedSession } from "./lib/authService";

export function App() {
	const [email, setEmail] = useState("");
	const [masterPassword, setMasterPassword] = useState("");
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [session, setSession] = useState<UnlockedSession | null>(null);

	async function handleSubmit(action: "register" | "login") {
		setLoading(true);
		setError(null);
		try {
			const result = action === "register"
				? await registerUser(email, masterPassword)
				: await loginUser(email, masterPassword);
			setSession(result);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Error desconocido");
		} finally {
			setLoading(false);
		}
	}

	if (session) {
		return (
			<div className="auth-shell">
				<h1>Sesion desbloqueada</h1>
				<p style={{ color: "var(--text-secondary)", fontSize: 14 }}>
					Par de claves generado/recuperado y clave privada descifrada en memoria.
				</p>
				<code>{bufferToBase64(session.publicKeyRaw).slice(0, 64)}…</code>
			</div>
		);
	}

	return (
		<div className="auth-shell">
			<h1>KeyNest</h1>
			<input
				type="email"
				placeholder="email"
				value={email}
				onChange={(e) => setEmail(e.target.value)}
			/>
			<input
				type="password"
				placeholder="master password"
				value={masterPassword}
				onChange={(e) => setMasterPassword(e.target.value)}
			/>
			{error ? <span className="error">{error}</span> : null}
			<button disabled={loading} onClick={() => handleSubmit("register")}>
				Crear cuenta
			</button>
			<button
				disabled={loading}
				className="secondary"
				onClick={() => handleSubmit("login")}
			>
				Ya tengo cuenta
			</button>
		</div>
	);
}
