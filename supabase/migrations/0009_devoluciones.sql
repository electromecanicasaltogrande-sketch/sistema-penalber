create table if not exists public.caja_ajustes (
  id uuid primary key default gen_random_uuid(),
  fecha date not null default current_date,
  monto numeric(12, 2) not null,
  motivo text not null,
  creado_en timestamptz not null default now()
);

alter table public.caja_ajustes enable row level security;
drop policy if exists "caja_ajustes_all" on public.caja_ajustes;
create policy "caja_ajustes_all" on public.caja_ajustes for all to authenticated using (true) with check (true);

create table if not exists public.devoluciones (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid references public.clientes (id) on delete set null,
  cliente_nombre text not null,
  condicion text not null,
  empresa_cuit text,
  factura_numero text,
  es_cambio boolean not null default false,
  articulo_dev_codigo text,
  articulo_dev_desc text not null,
  cantidad_dev numeric(10, 2) not null,
  precio_dev numeric(12, 2) not null,
  articulo_nuevo_codigo text,
  articulo_nuevo_desc text,
  cantidad_nueva numeric(10, 2),
  precio_nuevo numeric(12, 2),
  diferencia numeric(12, 2) not null default 0,
  creado_en timestamptz not null default now()
);

alter table public.devoluciones enable row level security;
drop policy if exists "devoluciones_all" on public.devoluciones;
create policy "devoluciones_all" on public.devoluciones for all to authenticated using (true) with check (true);

do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'devoluciones') then
    alter publication supabase_realtime add table public.devoluciones;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'caja_ajustes') then
    alter publication supabase_realtime add table public.caja_ajustes;
  end if;
end $$;
