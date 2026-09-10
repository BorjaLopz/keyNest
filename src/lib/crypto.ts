// Prototipo aislado de cripto (fase 1) — Web Crypto API.
// Ninguna funcion aqui toca red ni Supabase: solo primitivas + ciclo completo.

export interface KeyPairBundle {
	publicKeyRaw: ArrayBuffer; // SPKI, en claro
	privateKeyRaw: ArrayBuffer; // PKCS8, se cifra antes de persistir
}

export interface EncryptedBlob {
	ciphertext: ArrayBuffer;
	iv: Uint8Array<ArrayBuffer>;
}

const RSA_OAEP_PARAMS: RsaHashedKeyGenParams = {
	name: "RSA-OAEP",
	modulusLength: 2048,
	publicExponent: new Uint8Array([1, 0, 1]),
	hash: "SHA-256",
};

const AES_KEY_LENGTH = 256;
const PBKDF2_ITERATIONS = 600_000; // recomendacion OWASP 2023+ para PBKDF2-SHA256

// --- Par de claves del usuario (identidad, tipo Bitwarden) ---

export async function generateUserKeyPair(): Promise<KeyPairBundle> {
	const keyPair = await crypto.subtle.generateKey(RSA_OAEP_PARAMS, true, ["encrypt", "decrypt"]);
	const [publicKeyRaw, privateKeyRaw] = await Promise.all([
		crypto.subtle.exportKey("spki", keyPair.publicKey),
		crypto.subtle.exportKey("pkcs8", keyPair.privateKey),
	]);
	return { publicKeyRaw, privateKeyRaw };
}

export function importPublicKey(raw: ArrayBuffer): Promise<CryptoKey> {
	return crypto.subtle.importKey("spki", raw, RSA_OAEP_PARAMS, true, ["encrypt"]);
}

export function importPrivateKey(raw: ArrayBuffer): Promise<CryptoKey> {
	return crypto.subtle.importKey("pkcs8", raw, RSA_OAEP_PARAMS, true, ["decrypt"]);
}

// --- Derivacion desde master password (para cifrar la clave privada) ---

export async function deriveKeyFromPassword(
	password: string,
	salt: Uint8Array<ArrayBuffer>,
): Promise<CryptoKey> {
	const baseKey = await crypto.subtle.importKey(
		"raw",
		new TextEncoder().encode(password),
		"PBKDF2",
		false,
		["deriveKey"],
	);
	return crypto.subtle.deriveKey(
		{ name: "PBKDF2", salt, iterations: PBKDF2_ITERATIONS, hash: "SHA-256" },
		baseKey,
		{ name: "AES-GCM", length: AES_KEY_LENGTH },
		false,
		["encrypt", "decrypt"],
	);
}

export function generateSalt(): Uint8Array<ArrayBuffer> {
	return crypto.getRandomValues(new Uint8Array(16));
}

// --- AES-GCM generico (cifra la clave privada, la clave de grupo desenvuelta, o el campo password) ---

export async function aesEncrypt(key: CryptoKey, plaintext: BufferSource): Promise<EncryptedBlob> {
	const iv = crypto.getRandomValues(new Uint8Array(12));
	const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, plaintext);
	return { ciphertext, iv };
}

export function aesDecrypt(key: CryptoKey, blob: EncryptedBlob): Promise<ArrayBuffer> {
	return crypto.subtle.decrypt({ name: "AES-GCM", iv: blob.iv }, key, blob.ciphertext);
}

// --- Clave simetrica del grupo ---

export async function generateGroupKey(): Promise<CryptoKey> {
	return crypto.subtle.generateKey({ name: "AES-GCM", length: AES_KEY_LENGTH }, true, [
		"encrypt",
		"decrypt",
	]);
}

// Envolver la clave de grupo (raw AES) con la clave publica RSA de un miembro.
// RSA-OAEP-2048 admite hasta ~190 bytes de payload — una clave AES-256 raw (32 bytes) entra sobrada.
export async function wrapGroupKeyForMember(
	groupKey: CryptoKey,
	memberPublicKey: CryptoKey,
): Promise<ArrayBuffer> {
	const raw = await crypto.subtle.exportKey("raw", groupKey);
	return crypto.subtle.encrypt({ name: "RSA-OAEP" }, memberPublicKey, raw);
}

export async function unwrapGroupKey(
	wrapped: ArrayBuffer,
	memberPrivateKey: CryptoKey,
): Promise<CryptoKey> {
	const raw = await crypto.subtle.decrypt({ name: "RSA-OAEP" }, memberPrivateKey, wrapped);
	return crypto.subtle.importKey("raw", raw, { name: "AES-GCM", length: AES_KEY_LENGTH }, true, [
		"encrypt",
		"decrypt",
	]);
}
