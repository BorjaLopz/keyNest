import { useState } from "react";
import { loginUser, registerUser, type UnlockedSession } from "./lib/authService";
import { Vault } from "./vault/Vault";

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
			const result =
				action === "register" ? await registerUser(email, masterPassword) : await loginUser(email, masterPassword);
			setSession(result);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Error desconocido");
		} finally {
			setLoading(false);
		}
	}

	if (session) {
		return <Vault session={session} onLock={() => setSession(null)} />;
	}

	return (
		<div className="app-shell auth-screen">
			<div className="card blueprint auth-card">
				<i className="corner tl" />
				<i className="corner tr" />
				<i className="corner bl" />
				<i className="corner br" />

				<img src="/brand/keynest-lockup.svg" alt="KeyNest" style={{ height: 40, marginBottom: 8 }} />

				<div className="field">
					<label>Email</label>
					<input
						className="input"
						type="email"
						value={email}
						onChange={(e) => setEmail(e.target.value)}
						onKeyDown={(e) => e.key === "Enter" && handleSubmit("login")}
					/>
				</div>
				<div className="field">
					<label>Master password</label>
					<input
						className="input"
						type="password"
						value={masterPassword}
						onChange={(e) => setMasterPassword(e.target.value)}
						onKeyDown={(e) => e.key === "Enter" && handleSubmit("login")}
					/>
				</div>

				{error ? <span style={{ color: "#c1443c", fontSize: 12.5 }}>{error}</span> : null}

				<button type="button" className="btn btn-primary btn-block" disabled={loading} onClick={() => handleSubmit("register")}>
					Crear cuenta
				</button>
				<button
					type="button"
					className="btn btn-secondary btn-block"
					disabled={loading}
					onClick={() => handleSubmit("login")}
				>
					Ya tengo cuenta
				</button>
			</div>
		</div>
	);
}
