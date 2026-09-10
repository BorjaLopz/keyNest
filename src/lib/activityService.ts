import { supabase } from "./supabaseClient";

export type ActivityAction =
	| "group_created"
	| "group_renamed"
	| "member_invited"
	| "member_removed"
	| "subgroup_created"
	| "subgroup_deleted"
	| "credential_created"
	| "credential_updated"
	| "credential_deleted";

export interface ActivityEntry {
	id: string;
	actorEmail: string | null;
	action: ActivityAction;
	targetLabel: string | null;
	createdAt: string;
}

interface ActivityRow {
	id: string;
	action: ActivityAction;
	target_label: string | null;
	created_at: string;
	profiles: { email: string | null };
}

// Nunca recibe ni loguea secretos: solo IDs y etiquetas ya en claro
// en otro sitio (titulo de credencial, nombre de carpeta, email).
export async function logActivity(
	groupId: string,
	actorId: string,
	action: ActivityAction,
	targetLabel?: string,
	credentialId?: string,
): Promise<void> {
	const { error } = await supabase.from("group_activity").insert({
		group_id: groupId,
		actor_id: actorId,
		action,
		target_label: targetLabel ?? null,
		credential_id: credentialId ?? null,
	});
	if (error) throw error;
}

function mapRow(row: ActivityRow): ActivityEntry {
	return {
		id: row.id,
		actorEmail: row.profiles.email,
		action: row.action,
		targetLabel: row.target_label,
		createdAt: row.created_at,
	};
}

export async function listActivity(groupId: string, limit = 50): Promise<ActivityEntry[]> {
	const { data, error } = await supabase
		.from("group_activity")
		.select("id, action, target_label, created_at, profiles(email)")
		.eq("group_id", groupId)
		.order("created_at", { ascending: false })
		.limit(limit)
		.returns<ActivityRow[]>();
	if (error) throw error;
	return (data ?? []).map(mapRow);
}

export async function listActivityForCredential(credentialId: string, limit = 20): Promise<ActivityEntry[]> {
	const { data, error } = await supabase
		.from("group_activity")
		.select("id, action, target_label, created_at, profiles(email)")
		.eq("credential_id", credentialId)
		.order("created_at", { ascending: false })
		.limit(limit)
		.returns<ActivityRow[]>();
	if (error) throw error;
	return (data ?? []).map(mapRow);
}

const ACTION_LABELS: Record<ActivityAction, (target: string | null) => string> = {
	group_created: () => "creó el grupo",
	group_renamed: (t) => `renombró el grupo a "${t}"`,
	member_invited: (t) => `invitó a ${t}`,
	member_removed: (t) => `quitó a ${t}`,
	subgroup_created: (t) => `creó la carpeta "${t}"`,
	subgroup_deleted: (t) => `borró la carpeta "${t}"`,
	credential_created: (t) => `creó la credencial "${t}"`,
	credential_updated: (t) => `editó la credencial "${t}"`,
	credential_deleted: (t) => `borró la credencial "${t}"`,
};

export function describeActivity(entry: ActivityEntry): string {
	return ACTION_LABELS[entry.action](entry.targetLabel);
}
