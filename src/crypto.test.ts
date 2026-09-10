import { describe, expect, it } from "vitest";
import {
	aesDecrypt,
	aesEncrypt,
	deriveKeyFromPassword,
	generateGroupKey,
	generateSalt,
	generateUserKeyPair,
	importPrivateKey,
	importPublicKey,
	unwrapGroupKey,
	wrapGroupKeyForMember,
} from "./crypto";

const enc = new TextEncoder();
const dec = new TextDecoder();

describe("ciclo completo: registro -> grupo -> invitacion -> credencial", () => {
	it("Alice se registra: genera par de claves y cifra la privada con su master password", async () => {
		const masterPassword = "correct horse battery staple";
		const salt = generateSalt();

		const { publicKeyRaw, privateKeyRaw } = await generateUserKeyPair();
		const wrappingKey = await deriveKeyFromPassword(masterPassword, salt);
		const encryptedPrivateKey = await aesEncrypt(wrappingKey, privateKeyRaw);

		// Simula "logout": solo persiste publicKeyRaw, encryptedPrivateKey, salt.
		// Al "login" se re-deriva la clave desde la master password y se descifra.
		const unlockKey = await deriveKeyFromPassword(masterPassword, salt);
		const decryptedPrivateKeyRaw = await aesDecrypt(unlockKey, encryptedPrivateKey);

		expect(new Uint8Array(decryptedPrivateKeyRaw)).toEqual(new Uint8Array(privateKeyRaw));
		expect(publicKeyRaw.byteLength).toBeGreaterThan(0);
	});

	it("master password incorrecta no descifra la clave privada", async () => {
		const salt = generateSalt();
		const { privateKeyRaw } = await generateUserKeyPair();
		const wrappingKey = await deriveKeyFromPassword("password-correcta", salt);
		const encryptedPrivateKey = await aesEncrypt(wrappingKey, privateKeyRaw);

		const wrongKey = await deriveKeyFromPassword("password-incorrecta", salt);
		await expect(aesDecrypt(wrongKey, encryptedPrivateKey)).rejects.toThrow();
	});

	it("Alice crea un grupo, invita a Bob, Bob descifra una credencial que Alice creo", async () => {
		// --- Setup: Alice y Bob ya registrados (par de claves en claro, listos para usar) ---
		const alice = await generateUserKeyPair();
		const bob = await generateUserKeyPair();

		const alicePublicKey = await importPublicKey(alice.publicKeyRaw);
		const alicePrivateKey = await importPrivateKey(alice.privateKeyRaw);
		const bobPublicKey = await importPublicKey(bob.publicKeyRaw);
		const bobPrivateKey = await importPrivateKey(bob.privateKeyRaw);

		// --- Alice crea el grupo: clave AES aleatoria, envuelta para ella misma ---
		const groupKey = await generateGroupKey();
		const wrappedForAlice = await wrapGroupKeyForMember(groupKey, alicePublicKey);

		// grupo_miembros: fila de Alice
		const aliceRecoveredGroupKey = await unwrapGroupKey(wrappedForAlice, alicePrivateKey);

		// --- Alice invita a Bob: descifra la clave de grupo (en memoria) y la re-envuelve para Bob ---
		const wrappedForBob = await wrapGroupKeyForMember(aliceRecoveredGroupKey, bobPublicKey);

		// grupo_miembros: fila de Bob
		const bobRecoveredGroupKey = await unwrapGroupKey(wrappedForBob, bobPrivateKey);

		// --- Alice crea una credencial: solo el campo password va cifrado con la clave de grupo ---
		const credentialPlaintext = enc.encode("hunter2");
		const encryptedPassword = await aesEncrypt(aliceRecoveredGroupKey, credentialPlaintext);

		// --- Bob lee la credencial: descifra con SU copia (envuelta distinto, misma clave AES) ---
		const bobDecrypted = await aesDecrypt(bobRecoveredGroupKey, encryptedPassword);

		expect(dec.decode(bobDecrypted)).toBe("hunter2");
	});

	it("un tercero sin la clave de grupo no puede descifrar la credencial", async () => {
		const alice = await generateUserKeyPair();
		const mallory = await generateUserKeyPair();

		const alicePublicKey = await importPublicKey(alice.publicKeyRaw);
		const alicePrivateKey = await importPrivateKey(alice.privateKeyRaw);

		const groupKey = await generateGroupKey();
		const wrappedForAlice = await wrapGroupKeyForMember(groupKey, alicePublicKey);
		const aliceGroupKey = await unwrapGroupKey(wrappedForAlice, alicePrivateKey);

		const encryptedPassword = await aesEncrypt(aliceGroupKey, enc.encode("hunter2"));

		// Mallory nunca recibio una fila en grupo_miembros: genera su propia clave de grupo falsa
		// (en la practica ni siquiera tendria el AES key, solo demuestra que claves distintas no sirven)
		const malloryFakeGroupKey = await generateGroupKey();
		await expect(aesDecrypt(malloryFakeGroupKey, encryptedPassword)).rejects.toThrow();
	});
});
