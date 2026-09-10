import { base64ToBuffer, bufferToBase64 } from "./base64";
import { aesDecrypt, aesEncrypt, deriveKeyFromPassword, generateSalt, generateUserKeyPair, importPrivateKey } from "./crypto";
import { supabase } from "./supabaseClient";

export interface UnlockedSession {
	userId: string;
	publicKeyRaw: ArrayBuffer;
	privateKey: CryptoKey;
}

interface ProfileRow {
	public_key: string;
	encrypted_private_key: string;
	private_key_iv: string;
	salt: string;
}

export async function registerUser(email: string, masterPassword: string): Promise<UnlockedSession> {
	const { data, error } = await supabase.auth.signUp({ email, password: masterPassword });
	if (error) throw error;
	const userId = data.user?.id;
	if (!userId) throw new Error("Supabase no devolvio user.id tras el signUp");

	const { publicKeyRaw, privateKeyRaw } = await generateUserKeyPair();
	const salt = generateSalt();
	const wrappingKey = await deriveKeyFromPassword(masterPassword, salt);
	const encryptedPrivateKey = await aesEncrypt(wrappingKey, privateKeyRaw);

	const { error: profileError } = await supabase.from("profiles").insert({
		id: userId,
		email,
		public_key: bufferToBase64(publicKeyRaw),
		encrypted_private_key: bufferToBase64(encryptedPrivateKey.ciphertext),
		private_key_iv: bufferToBase64(encryptedPrivateKey.iv.buffer),
		salt: bufferToBase64(salt.buffer),
	});
	if (profileError) throw profileError;

	const privateKey = await importPrivateKey(privateKeyRaw);
	return { userId, publicKeyRaw, privateKey };
}

export async function loginUser(email: string, masterPassword: string): Promise<UnlockedSession> {
	const { data, error } = await supabase.auth.signInWithPassword({ email, password: masterPassword });
	if (error) throw error;
	const userId = data.user.id;

	const { data: profile, error: profileError } = await supabase
		.from("profiles")
		.select("public_key, encrypted_private_key, private_key_iv, salt")
		.eq("id", userId)
		.single<ProfileRow>();
	if (profileError) throw profileError;

	const salt = new Uint8Array(base64ToBuffer(profile.salt));
	const wrappingKey = await deriveKeyFromPassword(masterPassword, salt);
	const iv = new Uint8Array(base64ToBuffer(profile.private_key_iv));
	const ciphertext = base64ToBuffer(profile.encrypted_private_key);

	// Master password incorrecta -> aesDecrypt lanza (AES-GCM falla el tag de autenticacion).
	const privateKeyRaw = await aesDecrypt(wrappingKey, { ciphertext, iv });
	const privateKey = await importPrivateKey(privateKeyRaw);
	const publicKeyRaw = base64ToBuffer(profile.public_key);

	return { userId, publicKeyRaw, privateKey };
}
