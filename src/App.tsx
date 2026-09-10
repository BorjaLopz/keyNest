import { useEffect, useState } from "react";
import { getActiveSessionEmail, loginUser, logoutUser, registerUser, type UnlockedSession } from "./lib/authService";
import { Vault } from "./vault/Vault";

export function App() {
	const [email, setEmail] = useState("");
	const [masterPassword, setMasterPassword] = useState("");
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [session, setSession] = useState<UnlockedSession | null>(null);
	// Bloqueado != sin sesion: recuerda el email, la sesion de Supabase
	// Auth sigue activa, solo faltan las claves descifradas en memoria.
	const [lockedEmail, setLockedEmail] = useState<string | null>(null);

	useEffect(() => {
		getActiveSessionEmail().then((activeEmail) => {
			if (activeEmail) setLockedEmail(activeEmail);
		});
	}, []);

	async function handleSubmit(action: "register" | "login") {
		setLoading(true);
		setError(null);
		try {
			const result =
				action === "register" ? await registerUser(email, masterPassword) : await loginUser(email, masterPassword);
			setSession(result);
			setMasterPassword("");
		} catch (err) {
			setError(err instanceof Error ? err.message : "Error desconocido");
		} finally {
			setLoading(false);
		}
	}

	function handleLock() {
		if (session) setLockedEmail(session.email);
		setSession(null);
	}

	async function handleUnlock() {
		if (!lockedEmail) return;
		setLoading(true);
		setError(null);
		try {
			const result = await loginUser(lockedEmail, masterPassword);
			setSession(result);
			setLockedEmail(null);
			setMasterPassword("");
		} catch (err) {
			setError(err instanceof Error ? err.message : "Error desconocido");
		} finally {
			setLoading(false);
		}
	}

	async function handleLogout() {
		await logoutUser();
		setSession(null);
		setLockedEmail(null);
		setEmail("");
		setMasterPassword("");
	}

	if (session) {
		return <Vault session={session} onLock={handleLock} onLogout={handleLogout} />;
	}

	if (lockedEmail) {
		return (
			<div className="app-shell auth-screen">
				<div className="card blueprint auth-card">
					<i className="corner tl" />
					<i className="corner tr" />
					<i className="corner bl" />
					<i className="corner br" />

					<img src="/brand/keynest-lockup.svg" alt="KeyNest" style={{ height: 40, marginBottom: 8 }} />

					<div className="field">
						<label>Bloqueado</label>
						<div style={{ fontSize: 14 }}>{lockedEmail}</div>
					</div>
					<div className="field">
						<label>Master password</label>
						<input
							className="input"
							type="password"
							autoFocus
							value={masterPassword}
							onChange={(e) => setMasterPassword(e.target.value)}
							onKeyDown={(e) => e.key === "Enter" && handleUnlock()}
						/>
					</div>

					{error ? <span style={{ color: "#c1443c", fontSize: 12.5 }}>{error}</span> : null}

					<button type="button" className="btn btn-primary btn-block" disabled={loading} onClick={handleUnlock}>
						Desbloquear
					</button>
					<button type="button" className="btn btn-ghost" disabled={loading} onClick={handleLogout}>
						No soy yo · cerrar sesión
					</button>
				</div>
			</div>
		);
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
