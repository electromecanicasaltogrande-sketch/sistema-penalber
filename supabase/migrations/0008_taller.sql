create sequence if not exists public.reparacion_numero_seq start 101;
create sequence if not exists public.presupuesto_taller_numero_seq start 501;

create table if not exists public.reparaciones (
  id uuid primary key default gen_random_uuid(),
  numero text not null unique,
  cliente_nombre text not null,
  cliente_telefono text not null default '',
  subtotal numeric(12, 2) not null default 0,
  descuento numeric(12, 2) not null default 0,
  total numeric(12, 2) not null default 0,
  discrimina_iva boolean not null default false,
  condicion_pago text not null default 'efectivo',
  entregada boolean not null default false,
  creado_en timestamptz not null default now()
);

alter table public.reparaciones enable row level security;
drop policy if exists "reparaciones_all" on public.reparaciones;
create policy "reparaciones_all" on public.reparaciones for all to authenticated using (true) with check (true);

create table if not exists public.reparacion_items (
  id uuid primary key default gen_random_uuid(),
  reparacion_id uuid not null references public.reparaciones (id) on delete cascade,
  codigo text,
  descripcion text not null,
  marca text,
  cantidad numeric(10, 2) not null,
  precio numeric(12, 2) not null,
  iva numeric(5, 2) not null default 21
);

alter table public.reparacion_items enable row level security;
drop policy if exists "reparacion_items_all" on public.reparacion_items;
create policy "reparacion_items_all" on public.reparacion_items for all to authenticated using (true) with check (true);

create table if not exists public.presupuestos_taller (
  id uuid primary key default gen_random_uuid(),
  numero text not null unique,
  cliente_nombre text not null,
  cliente_telefono text not null default '',
  subtotal numeric(12, 2) not null default 0,
  descuento numeric(12, 2) not null default 0,
  discrimina_iva boolean not null default false,
  estado text not null default 'Pendiente',
  cobro_no_hizo numeric(12, 2),
  creado_en timestamptz not null default now()
);

alter table public.presupuestos_taller enable row level security;
drop policy if exists "presupuestos_taller_all" on public.presupuestos_taller;
create policy "presupuestos_taller_all" on public.presupuestos_taller for all to authenticated using (true) with check (true);

create table if not exists public.presupuesto_taller_items (
  id uuid primary key default gen_random_uuid(),
  presupuesto_id uuid not null references public.presupuestos_taller (id) on delete cascade,
  codigo text,
  descripcion text not null,
  marca text,
  cantidad numeric(10, 2) not null,
  precio numeric(12, 2) not null,
  iva numeric(5, 2) not null default 21
);

alter table public.presupuesto_taller_items enable row level security;
drop policy if exists "presupuesto_taller_items_all" on public.presupuesto_taller_items;
create policy "presupuesto_taller_items_all" on public.presupuesto_taller_items for all to authenticated using (true) with check (true);

create or replace function public.next_reparacion_numero()
returns bigint language sql as $$ select nextval('public.reparacion_numero_seq'); $$;
create or replace function public.next_presupuesto_taller_numero()
returns bigint language sql as $$ select nextval('public.presupuesto_taller_numero_seq'); $$;
grant execute on function public.next_reparacion_numero() to authenticated;
grant execute on function public.next_presupuesto_taller_numero() to authenticated;

do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'reparaciones') then
    alter publication supabase_realtime add table public.reparaciones;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'presupuestos_taller') then
    alter publication supabase_realtime add table public.presupuestos_taller;
  end if;
end $$;
