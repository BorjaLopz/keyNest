// Test de integracion contra el Supabase real (no mockeado): verifica que
// un usuario ajeno a un grupo no puede leer ni escribir nada de el via RLS,
// aunque conozca los IDs. Crea cuentas y filas de verdad (se limpian al
// terminar en la medida de lo posible: el grupo se borra via cascade, las
// cuentas de Auth quedan porque el cliente anon no tiene permiso para
// borrarlas).
//
// No forma parte de `npm test` (nombre sin ".test." a proposito, para que
// Vitest no lo recoja por defecto). Correr a mano cuando haga falta
// re-verificar el aislamiento entre grupos:
//   npx vitest run -c vitest.rls.config.ts
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

interface TestUser {
	client: SupabaseClient;
	userId: string;
	email: string;
}

async function signUpFreshUser(tag: string): Promise<TestUser> {
	const client = createClient(url, key);
	const email = `rls-test-${tag}-${crypto.randomUUID()}@example.com`;
	const { data, error } = await client.auth.signUp({ email, password: "Test-password-123!" });
	if (error) throw error;
	const userId = data.user!.id;

	const { error: profileError } = await client.from("profiles").insert({
		id: userId,
		email,
		public_key: "dGVzdA==",
		encrypted_private_key: "dGVzdA==",
		private_key_iv: "dGVzdA==",
		salt: "dGVzdA==",
	});
	if (profileError) throw profileError;

	return { client, userId, email };
}

describe("aislamiento RLS entre grupos", () => {
	it("un usuario ajeno no puede leer ni escribir datos de un grupo del que no es miembro", async () => {
		const a = await signUpFreshUser("a");
		const b = await signUpFreshUser("b");

		const { data: group, error: groupError } = await a.client
			.from("groups")
			.insert({ name: "Grupo privado de A (test RLS)", created_by: a.userId })
			.select("id")
			.single<{ id: string }>();
		expect(groupError).toBeNull();
		const groupId = group!.id;

		const { error: memberError } = await a.client.from("group_members").insert({
			group_id: groupId,
			user_id: a.userId,
			encrypted_group_key: "dGVzdA==",
			role: "admin",
		});
		expect(memberError).toBeNull();

		const { data: credential, error: credentialError } = await a.client
			.from("credentials")
			.insert({
				group_id: groupId,
				title: "Secreto de A",
				encrypted_password: "dGVzdA==",
				iv: "dGVzdA==",
				created_by: a.userId,
			})
			.select("id")
			.single<{ id: string }>();
		expect(credentialError).toBeNull();
		const credentialId = credential!.id;

		try {
			// --- B, nunca invitado, intenta leer ---
			const { data: bGroupRead } = await b.client.from("groups").select("*").eq("id", groupId);
			expect(bGroupRead).toEqual([]);

			const { data: bMembersRead } = await b.client.from("group_members").select("*").eq("group_id", groupId);
			expect(bMembersRead).toEqual([]);

			const { data: bCredentialsRead } = await b.client.from("credentials").select("*").eq("group_id", groupId);
			expect(bCredentialsRead).toEqual([]);

			const { data: bActivityRead } = await b.client.from("group_activity").select("*").eq("group_id", groupId);
			expect(bActivityRead).toEqual([]);

			// --- B intenta autoinvitarse como admin ---
			const { error: bJoinError } = await b.client.from("group_members").insert({
				group_id: groupId,
				user_id: b.userId,
				encrypted_group_key: "aGFjaw==",
				role: "admin",
			});
			expect(bJoinError).not.toBeNull();

			// --- B intenta editar/borrar la credencial de A ---
			const { data: bUpdateResult, error: bUpdateError } = await b.client
				.from("credentials")
				.update({ title: "hackeado" })
				.eq("id", credentialId)
				.select();
			expect(bUpdateError).toBeNull(); // RLS filtra en silencio, no lanza error
			expect(bUpdateResult).toEqual([]); // pero cero filas afectadas

			const { data: bDeleteResult } = await b.client.from("credentials").delete().eq("id", credentialId).select();
			expect(bDeleteResult).toEqual([]);

			// --- confirma que la credencial de A sigue intacta ---
			const { data: aStillHasIt } = await a.client
				.from("credentials")
				.select("title")
				.eq("id", credentialId)
				.single<{ title: string }>();
			expect(aStillHasIt?.title).toBe("Secreto de A");
		} finally {
			// limpieza: borrar el grupo (cascade se lleva members/subgroups/credentials/activity)
			await a.client.from("groups").delete().eq("id", groupId);
		}
	}, 30_000);
});
