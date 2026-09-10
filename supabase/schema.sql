-- KeyNest — esquema fase 2: tablas + RLS
-- Ejecutar completo en el SQL Editor de Supabase.

-- ============================================================
-- profiles: identidad cripto de cada usuario (1:1 con auth.users)
-- ============================================================
create table public.profiles (
	id uuid primary key references auth.users (id) on delete cascade,
	public_key text not null,
	encrypted_private_key text not null,
	private_key_iv text not null,
	salt text not null,
	created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Cualquier usuario autenticado puede leer perfiles ajenos: necesita la
-- public_key de otros para invitarlos a un grupo (RSA-OAEP la usa para
-- envolver la clave simetrica del grupo).
create policy "profiles_select_authenticated"
	on public.profiles for select
	to authenticated
	using (true);

create policy "profiles_insert_own"
	on public.profiles for insert
	to authenticated
	with check (id = auth.uid());

create policy "profiles_update_own"
	on public.profiles for update
	to authenticated
	using (id = auth.uid())
	with check (id = auth.uid());

-- ============================================================
-- groups
-- ============================================================
create table public.groups (
	id uuid primary key default gen_random_uuid(),
	name text not null,
	created_by uuid not null references public.profiles (id),
	created_at timestamptz not null default now()
);

alter table public.groups enable row level security;

-- ============================================================
-- group_members: fila por (grupo, usuario) con la clave del grupo
-- envuelta especificamente para ese usuario (modelo Bitwarden Orgs).
-- ============================================================
create table public.group_members (
	group_id uuid not null references public.groups (id) on delete cascade,
	user_id uuid not null references public.profiles (id) on delete cascade,
	encrypted_group_key text not null,
	role text not null default 'member' check (role in ('admin', 'member')),
	created_at timestamptz not null default now(),
	primary key (group_id, user_id)
);

alter table public.group_members enable row level security;

-- Funciones SECURITY DEFINER: comprueban pertenencia/rol saltandose RLS
-- internamente. Sin esto, una politica de group_members que consulte la
-- propia tabla group_members reevalua la misma politica en la subquery
-- (funciona, pero es fragil y confuso). Con SECURITY DEFINER la
-- comprobacion es una unica lectura directa, simple y predecible.
create function public.is_group_member(_group_id uuid, _user_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
	select exists (
		select 1 from public.group_members
		where group_id = _group_id and user_id = _user_id
	);
$$;

create function public.is_group_admin(_group_id uuid, _user_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
	select exists (
		select 1 from public.group_members
		where group_id = _group_id and user_id = _user_id and role = 'admin'
	);
$$;

-- --- Politicas groups (dependen de is_group_member, van despues de la funcion) ---

create policy "groups_select_members"
	on public.groups for select
	to authenticated
	using (public.is_group_member(id, auth.uid()));

create policy "groups_insert_any_authenticated"
	on public.groups for insert
	to authenticated
	with check (created_by = auth.uid());

create policy "groups_update_admin"
	on public.groups for update
	to authenticated
	using (public.is_group_admin(id, auth.uid()))
	with check (public.is_group_admin(id, auth.uid()));

create policy "groups_delete_admin"
	on public.groups for delete
	to authenticated
	using (public.is_group_admin(id, auth.uid()));

-- --- Politicas group_members ---
-- select: cualquier miembro del grupo ve todas las filas (los blobs de
-- otros miembros son ciphertext RSA-OAEP cifrado para SU public key
-- especifica: verlos no filtra nada, solo su dueno los puede descifrar).
create policy "group_members_select_members"
	on public.group_members for select
	to authenticated
	using (public.is_group_member(group_id, auth.uid()));

-- insert: el creador del grupo se auto-inserta como admin (primera fila,
-- no puede pasar por is_group_admin porque todavia no existe ninguna fila),
-- o un admin existente invita a un nuevo miembro.
create policy "group_members_insert_creator_or_admin"
	on public.group_members for insert
	to authenticated
	with check (
		(
			user_id = auth.uid()
			and role = 'admin'
			and exists (
				select 1 from public.groups g
				where g.id = group_id and g.created_by = auth.uid()
			)
		)
		or public.is_group_admin(group_id, auth.uid())
	);

create policy "group_members_update_admin"
	on public.group_members for update
	to authenticated
	using (public.is_group_admin(group_id, auth.uid()))
	with check (public.is_group_admin(group_id, auth.uid()));

create policy "group_members_delete_admin"
	on public.group_members for delete
	to authenticated
	using (public.is_group_admin(group_id, auth.uid()));

-- ============================================================
-- subgroups: solo organizacion visual, sin cripto ni permisos propios
-- ============================================================
create table public.subgroups (
	id uuid primary key default gen_random_uuid(),
	group_id uuid not null references public.groups (id) on delete cascade,
	name text not null,
	created_at timestamptz not null default now()
);

alter table public.subgroups enable row level security;

create policy "subgroups_select_members"
	on public.subgroups for select
	to authenticated
	using (public.is_group_member(group_id, auth.uid()));

create policy "subgroups_insert_members"
	on public.subgroups for insert
	to authenticated
	with check (public.is_group_member(group_id, auth.uid()));

create policy "subgroups_update_members"
	on public.subgroups for update
	to authenticated
	using (public.is_group_member(group_id, auth.uid()))
	with check (public.is_group_member(group_id, auth.uid()));

create policy "subgroups_delete_members"
	on public.subgroups for delete
	to authenticated
	using (public.is_group_member(group_id, auth.uid()));

-- ============================================================
-- credentials: titulo/usuario/url/notas en claro (buscables), solo
-- password cifrado con la clave simetrica del grupo (AES-GCM).
-- ============================================================
create table public.credentials (
	id uuid primary key default gen_random_uuid(),
	group_id uuid not null references public.groups (id) on delete cascade,
	subgroup_id uuid references public.subgroups (id) on delete set null,
	title text not null,
	username text,
	url text,
	notes text,
	encrypted_password text not null,
	iv text not null,
	created_by uuid not null references public.profiles (id),
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

alter table public.credentials enable row level security;

create policy "credentials_select_members"
	on public.credentials for select
	to authenticated
	using (public.is_group_member(group_id, auth.uid()));

create policy "credentials_insert_members"
	on public.credentials for insert
	to authenticated
	with check (public.is_group_member(group_id, auth.uid()));

create policy "credentials_update_members"
	on public.credentials for update
	to authenticated
	using (public.is_group_member(group_id, auth.uid()))
	with check (public.is_group_member(group_id, auth.uid()));

create policy "credentials_delete_members"
	on public.credentials for delete
	to authenticated
	using (public.is_group_member(group_id, auth.uid()));

-- ============================================================
-- Privilegios de tabla. RLS solo filtra FILAS; sin estos GRANT, Postgres
-- rechaza la operacion entera antes de llegar a evaluar ninguna politica
-- (error 42501 "permission denied for table"). Solo "authenticated":
-- toda la app requiere sesion, nada se expone al rol "anon".
-- ============================================================
grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.groups to authenticated;
grant select, insert, update, delete on public.group_members to authenticated;
grant select, insert, update, delete on public.subgroups to authenticated;
grant select, insert, update, delete on public.credentials to authenticated;
