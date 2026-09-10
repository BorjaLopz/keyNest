import { supabase } from "./supabaseClient";

export interface Subgroup {
	id: string;
	name: string;
}

export async function listSubgroups(groupId: string): Promise<Subgroup[]> {
	const { data, error } = await supabase
		.from("subgroups")
		.select("id, name")
		.eq("group_id", groupId)
		.order("name");
	if (error) throw error;
	return data ?? [];
}

export async function createSubgroup(groupId: string, name: string): Promise<void> {
	const { error } = await supabase.from("subgroups").insert({ group_id: groupId, name });
	if (error) throw error;
}
