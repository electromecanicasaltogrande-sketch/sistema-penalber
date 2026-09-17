create sequence if not exists public.presupuesto_numero_seq start 301;

create table if not exists public.presupuesto_config (
  id boolean primary key default true,
  texto_intro text not null default 'De acuerdo a lo solicitado, cotizamos la siguiente mercadería:',
  observaciones text not null default 'Condiciones de pago cta corriente',
  dias_validez integer not null default 10,
  firma text not null default 'PEÑALBER',
  mostrar_empresa boolean not null default true,
  constraint presupuesto_config_singleton check (id)
);

insert into public.presupuesto_config (id) values (true) on conflict (id) do nothing;

alter table public.presupuesto_config enable row level security;
drop policy if exists "presupuesto_config_all" on public.presupuesto_config;
create policy "presupuesto_config_all" on public.presupuesto_config for all to authenticated using (true) with check (true);

create table if not exists public.presupuestos_venta (
  id uuid primary key default gen_random_uuid(),
  numero text not null unique,
  cliente_id uuid references public.clientes (id) on delete set null,
  cliente_nombre text not null,
  lista_precio text not null default 'minorista',
  subtotal numeric(12, 2) not null default 0,
  estado text not null default 'Pendiente',
  creado_en timestamptz not null default now()
);

alter table public.presupuestos_venta enable row level security;
drop policy if exists "presupuestos_venta_all" on public.presupuestos_venta;
create policy "presupuestos_venta_all" on public.presupuestos_venta for all to authenticated using (true) with check (true);

create table if not exists public.presupuesto_venta_items (
  id uuid primary key default gen_random_uuid(),
  presupuesto_id uuid not null references public.presupuestos_venta (id) on delete cascade,
  codigo text,
  descripcion text not null,
  marca text,
  cantidad numeric(10, 2) not null,
  precio numeric(12, 2) not null,
  iva numeric(5, 2) not null default 21
);

alter table public.presupuesto_venta_items enable row level security;
drop policy if exists "presupuesto_venta_items_all" on public.presupuesto_venta_items;
create policy "presupuesto_venta_items_all" on public.presupuesto_venta_items for all to authenticated using (true) with check (true);

create or replace function public.next_presupuesto_numero()
returns bigint
language sql
as $$
  select nextval('public.presupuesto_numero_seq');
$$;
grant execute on function public.next_presupuesto_numero() to authenticated;

do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'presupuestos_venta') then
    alter publication supabase_realtime add table public.presupuestos_venta;
  end if;
end $$;
