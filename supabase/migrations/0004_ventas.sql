create sequence if not exists public.comprobante_numero_seq start 1240;

create table if not exists public.ventas (
  id uuid primary key default gen_random_uuid(),
  numero text not null unique,
  tipo text not null,
  doc_type text not null,
  empresa_cuit text not null,
  cliente_id uuid references public.clientes (id) on delete set null,
  cliente_nombre text not null,
  dni text,
  condicion_pago text not null,
  subtotal numeric(12, 2) not null,
  descuento numeric(12, 2) not null default 0,
  total numeric(12, 2) not null,
  discrimina_iva boolean not null default false,
  cae text,
  cae_vencimiento date,
  nc_referencia_numero text,
  creado_en timestamptz not null default now()
);

create index if not exists ventas_cliente_idx on public.ventas (cliente_id);
create index if not exists ventas_creado_en_idx on public.ventas (creado_en);

alter table public.ventas enable row level security;

drop policy if exists "ventas_select" on public.ventas;
create policy "ventas_select" on public.ventas for select to authenticated using (true);
drop policy if exists "ventas_insert" on public.ventas;
create policy "ventas_insert" on public.ventas for insert to authenticated with check (true);

create table if not exists public.venta_items (
  id uuid primary key default gen_random_uuid(),
  venta_id uuid not null references public.ventas (id) on delete cascade,
  codigo text,
  descripcion text not null,
  marca text,
  cantidad numeric(10, 2) not null,
  precio numeric(12, 2) not null,
  iva numeric(5, 2) not null default 21
);

alter table public.venta_items enable row level security;

drop policy if exists "venta_items_select" on public.venta_items;
create policy "venta_items_select" on public.venta_items for select to authenticated using (true);
drop policy if exists "venta_items_insert" on public.venta_items;
create policy "venta_items_insert" on public.venta_items for insert to authenticated with check (true);

-- Cheques y eCheq recibidos (de Ventas y, más adelante, Reparaciones).
create table if not exists public.cheques (
  id uuid primary key default gen_random_uuid(),
  tipo text not null,
  titular text not null,
  importe numeric(12, 2) not null,
  fecha_cobro date not null,
  fecha_vencimiento date not null,
  origen text not null,
  origen_numero text,
  cobrado boolean not null default false,
  creado_en timestamptz not null default now()
);

alter table public.cheques enable row level security;

drop policy if exists "cheques_select" on public.cheques;
create policy "cheques_select" on public.cheques for select to authenticated using (true);
drop policy if exists "cheques_insert" on public.cheques;
create policy "cheques_insert" on public.cheques for insert to authenticated with check (true);
drop policy if exists "cheques_update" on public.cheques;
create policy "cheques_update" on public.cheques for update to authenticated using (true);

do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'ventas') then
    alter publication supabase_realtime add table public.ventas;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'cheques') then
    alter publication supabase_realtime add table public.cheques;
  end if;
end $$;
