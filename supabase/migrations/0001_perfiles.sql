-- Perfiles: 1 fila por usuario de auth.users, con su rol de negocio.
create table if not exists public.perfiles (
  id uuid primary key references auth.users (id) on delete cascade,
  nombre text not null,
  rol text not null check (rol in ('admin', 'mostrador')),
  creado_en timestamptz not null default now()
);

alter table public.perfiles enable row level security;

-- Cualquier usuario autenticado puede leer todos los perfiles
-- (se necesita para mostrar nombre/rol de otros usuarios en la UI, ej. auditoría futura).
create policy "perfiles_select_authenticated"
  on public.perfiles for select
  to authenticated
  using (true);

-- Solo el propio usuario puede editar su fila (ej. cambiar su nombre).
create policy "perfiles_update_own"
  on public.perfiles for update
  to authenticated
  using (id = auth.uid());

-- Helper: ¿el usuario logueado es admin? Se usa en policies de otras tablas más adelante.
create or replace function public.es_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.perfiles
    where id = auth.uid() and rol = 'admin'
  );
$$;
