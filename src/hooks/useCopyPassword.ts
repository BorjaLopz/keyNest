import { useState } from "react";
import { decryptCredentialPassword, type CredentialRow } from "../lib/credentialService";

export function useCopyPassword(groupKey: CryptoKey | null) {
	const [status, setStatus] = useState<string | null>(null);

	async function copy(row: CredentialRow) {
		if (!groupKey) return;
		setStatus(null);
		try {
			const password = await decryptCredentialPassword(groupKey, row);
			await navigator.clipboard.writeText(password);
			setStatus("Copiada al portapapeles.");
		} catch {
			setStatus("No se pudo descifrar.");
		}
	}

	return { copy, status };
}
