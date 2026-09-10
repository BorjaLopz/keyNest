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

// Las credenciales de la carpeta no se borran: subgroup_id referencia con
// "on delete set null", asi que pasan a "sin carpeta".
export async function deleteSubgroup(subgroupId: string): Promise<void> {
	const { error } = await supabase.from("subgroups").delete().eq("id", subgroupId);
	if (error) throw error;
}
