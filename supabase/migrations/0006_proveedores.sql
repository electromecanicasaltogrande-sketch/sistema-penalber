create table if not exists public.proveedores (
  id uuid primary key default gen_random_uuid(),
  razon_social text not null,
  cuit text not null default '',
  telefono text not null default '',
  direccion text not null default '',
  email text not null default '',
  creado_en timestamptz not null default now()
);

alter table public.proveedores enable row level security;
drop policy if exists "proveedores_all" on public.proveedores;
create policy "proveedores_all" on public.proveedores for all to authenticated using (true) with check (true);

create table if not exists public.facturas_compra (
  id uuid primary key default gen_random_uuid(),
  proveedor_id uuid not null references public.proveedores (id) on delete restrict,
  tipo_comprobante text not null,
  empresa_cuit text not null,
  punto_venta text not null default '',
  numero text not null,
  fecha_llegada date,
  fecha_factura date not null default current_date,
  neto numeric(12, 2) not null default 0,
  iva numeric(12, 2) not null default 0,
  otros_impuestos numeric(12, 2) not null default 0,
  pagada boolean not null default false,
  creado_en timestamptz not null default now()
);

create index if not exists facturas_compra_proveedor_idx on public.facturas_compra (proveedor_id);

alter table public.facturas_compra enable row level security;
drop policy if exists "facturas_compra_all" on public.facturas_compra;
create policy "facturas_compra_all" on public.facturas_compra for all to authenticated using (true) with check (true);

create table if not exists public.factura_compra_items (
  id uuid primary key default gen_random_uuid(),
  factura_id uuid not null references public.facturas_compra (id) on delete cascade,
  codigo text not null,
  cantidad numeric(10, 2) not null
);

alter table public.factura_compra_items enable row level security;
drop policy if exists "factura_compra_items_all" on public.factura_compra_items;
create policy "factura_compra_items_all" on public.factura_compra_items for all to authenticated using (true) with check (true);

do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'proveedores') then
    alter publication supabase_realtime add table public.proveedores;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'facturas_compra') then
    alter publication supabase_realtime add table public.facturas_compra;
  end if;
end $$;
