import { base64ToBuffer, bufferToBase64 } from "./base64";
import { aesDecrypt, aesEncrypt } from "./crypto";
import { supabase } from "./supabaseClient";

export interface CredentialRow {
	id: string;
	subgroup_id: string | null;
	title: string;
	username: string | null;
	url: string | null;
	notes: string | null;
	encrypted_password: string;
	iv: string;
}

export interface CredentialFormValues {
	title: string;
	username: string;
	url: string;
	notes: string;
	subgroupId: string | null;
	password: string; // en edicion viene precargada con la password actual descifrada
}

export async function listCredentials(groupId: string): Promise<CredentialRow[]> {
	const { data, error } = await supabase
		.from("credentials")
		.select("id, subgroup_id, title, username, url, notes, encrypted_password, iv")
		.eq("group_id", groupId)
		.order("title");
	if (error) throw error;
	return data ?? [];
}

export async function createCredential(
	groupKey: CryptoKey,
	groupId: string,
	createdBy: string,
	values: CredentialFormValues,
): Promise<string> {
	const encrypted = await aesEncrypt(groupKey, new TextEncoder().encode(values.password));
	const { data, error } = await supabase
		.from("credentials")
		.insert({
			group_id: groupId,
			subgroup_id: values.subgroupId,
			title: values.title,
			username: values.username || null,
			url: values.url || null,
			notes: values.notes || null,
			encrypted_password: bufferToBase64(encrypted.ciphertext),
			iv: bufferToBase64(encrypted.iv.buffer),
			created_by: createdBy,
		})
		.select("id")
		.single<{ id: string }>();
	if (error) throw error;
	return data.id;
}

export async function updateCredential(
	groupKey: CryptoKey,
	credentialId: string,
	values: CredentialFormValues,
): Promise<void> {
	const patch: Record<string, unknown> = {
		title: values.title,
		username: values.username || null,
		url: values.url || null,
		notes: values.notes || null,
		subgroup_id: values.subgroupId,
		updated_at: new Date().toISOString(),
	};
	if (values.password) {
		const encrypted = await aesEncrypt(groupKey, new TextEncoder().encode(values.password));
		patch.encrypted_password = bufferToBase64(encrypted.ciphertext);
		patch.iv = bufferToBase64(encrypted.iv.buffer);
	}
	const { error } = await supabase.from("credentials").update(patch).eq("id", credentialId);
	if (error) throw error;
}

export async function deleteCredential(credentialId: string): Promise<void> {
	const { error } = await supabase.from("credentials").delete().eq("id", credentialId);
	if (error) throw error;
}

export async function decryptCredentialPassword(groupKey: CryptoKey, row: CredentialRow): Promise<string> {
	const ciphertext = base64ToBuffer(row.encrypted_password);
	const iv = new Uint8Array(base64ToBuffer(row.iv));
	const raw = await aesDecrypt(groupKey, { ciphertext, iv });
	return new TextDecoder().decode(raw);
}
