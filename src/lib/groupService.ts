import type { UnlockedSession } from "./authService";
import { base64ToBuffer, bufferToBase64 } from "./base64";
import { generateGroupKey, importPublicKey, unwrapGroupKey, wrapGroupKeyForMember } from "./crypto";
import { supabase } from "./supabaseClient";

export interface GroupSummary {
	id: string;
	name: string;
	role: "admin" | "member";
}

export async function createGroup(session: UnlockedSession, name: string): Promise<string> {
	const { data: group, error: groupError } = await supabase
		.from("groups")
		.insert({ name, created_by: session.userId })
		.select("id")
		.single<{ id: string }>();
	if (groupError) throw groupError;

	// La clave del grupo se genera en el cliente y se envuelve para el creador
	// con SU propia clave publica: ni el grupo en claro ni la clave AES pasan
	// nunca por el servidor sin cifrar.
	const groupKey = await generateGroupKey();
	const creatorPublicKey = await importPublicKey(session.publicKeyRaw);
	const wrapped = await wrapGroupKeyForMember(groupKey, creatorPublicKey);

	const { error: memberError } = await supabase.from("group_members").insert({
		group_id: group.id,
		user_id: session.userId,
		encrypted_group_key: bufferToBase64(wrapped),
		role: "admin",
	});
	if (memberError) throw memberError;

	return group.id;
}

interface GroupMembershipRow {
	role: "admin" | "member";
	groups: { id: string; name: string };
}

export async function listGroups(session: UnlockedSession): Promise<GroupSummary[]> {
	const { data, error } = await supabase
		.from("group_members")
		.select("role, groups(id, name)")
		.eq("user_id", session.userId)
		.returns<GroupMembershipRow[]>();
	if (error) throw error;
	return (data ?? []).map((row) => ({ id: row.groups.id, name: row.groups.name, role: row.role }));
}

export async function unwrapMyGroupKey(session: UnlockedSession, groupId: string): Promise<CryptoKey> {
	const { data, error } = await supabase
		.from("group_members")
		.select("encrypted_group_key")
		.eq("group_id", groupId)
		.eq("user_id", session.userId)
		.single<{ encrypted_group_key: string }>();
	if (error) throw error;

	const wrapped = base64ToBuffer(data.encrypted_group_key);
	return unwrapGroupKey(wrapped, session.privateKey);
}
