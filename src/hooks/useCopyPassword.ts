import { useState } from "react";
import { scheduleClipboardClear } from "../lib/clipboardGuard";
import { decryptCredentialPassword, type CredentialRow } from "../lib/credentialService";

const CLIPBOARD_CLEAR_MS = 20_000;

export function useCopyPassword(groupKey: CryptoKey | null) {
	const [status, setStatus] = useState<string | null>(null);

	async function copy(row: CredentialRow) {
		if (!groupKey) return;
		setStatus(null);
		try {
			const password = await decryptCredentialPassword(groupKey, row);
			await navigator.clipboard.writeText(password);
			setStatus(`Copiada — se borra en ${CLIPBOARD_CLEAR_MS / 1000}s (o al volver a esta pestaña).`);
			scheduleClipboardClear(password, CLIPBOARD_CLEAR_MS);
		} catch {
			setStatus("No se pudo descifrar.");
		}
	}

	return { copy, status };
}
