import { supabase } from "./supabaseClient";

export interface Subgroup {
	id: string;
	name: string;
	parentId: string | null;
}

interface SubgroupRow {
	id: string;
	name: string;
	parent_id: string | null;
}

export async function listSubgroups(groupId: string): Promise<Subgroup[]> {
	const { data, error } = await supabase
		.from("subgroups")
		.select("id, name, parent_id")
		.eq("group_id", groupId)
		.order("name")
		.returns<SubgroupRow[]>();
	if (error) throw error;
	return (data ?? []).map((row) => ({ id: row.id, name: row.name, parentId: row.parent_id }));
}

export async function createSubgroup(groupId: string, name: string, parentId: string | null = null): Promise<void> {
	const { error } = await supabase.from("subgroups").insert({ group_id: groupId, name, parent_id: parentId });
	if (error) throw error;
}

// Las credenciales de la carpeta (y de sus subcarpetas) no se borran:
// subgroup_id referencia con "on delete set null", asi que pasan a "sin
// carpeta". Las subcarpetas si se borran en cascada (parent_id ... on
// delete cascade) junto con la carpeta que las contiene.
export async function deleteSubgroup(subgroupId: string): Promise<void> {
	const { error } = await supabase.from("subgroups").delete().eq("id", subgroupId);
	if (error) throw error;
}

export interface IndentedSubgroup {
	id: string;
	label: string;
}

// Aplana el arbol en orden de profundidad, con guiones que indican nivel,
// para usar en un <select> plano (el desplegable de carpeta al crear/
// editar una credencial).
export function buildIndentedSubgroups(subgroups: Subgroup[]): IndentedSubgroup[] {
	const byParent = new Map<string | null, Subgroup[]>();
	for (const s of subgroups) {
		const bucket = byParent.get(s.parentId) ?? [];
		bucket.push(s);
		byParent.set(s.parentId, bucket);
	}

	const result: IndentedSubgroup[] = [];
	function walk(parentId: string | null, depth: number) {
		for (const child of byParent.get(parentId) ?? []) {
			result.push({ id: child.id, label: `${"— ".repeat(depth)}${child.name}` });
			walk(child.id, depth + 1);
		}
	}
	walk(null, 0);
	return result;
}
