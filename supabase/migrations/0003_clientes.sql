create table if not exists public.clientes (
  id uuid primary key default gen_random_uuid(),
  razon_social text not null,
  cuit text not null default '',
  telefono text not null default '',
  direccion text not null default '',
  localidad text not null default '',
  es_consumidor_final boolean not null default false,
  creado_en timestamptz not null default now()
);

create unique index if not exists clientes_consumidor_final_unique
  on public.clientes (es_consumidor_final)
  where es_consumidor_final;

insert into public.clientes (razon_social, es_consumidor_final)
select 'Consumidor Final', true
where not exists (select 1 from public.clientes where es_consumidor_final);

alter table public.clientes enable row level security;

drop policy if exists "clientes_select_authenticated" on public.clientes;
create policy "clientes_select_authenticated"
  on public.clientes for select to authenticated using (true);

drop policy if exists "clientes_insert_authenticated" on public.clientes;
create policy "clientes_insert_authenticated"
  on public.clientes for insert to authenticated with check (true);

drop policy if exists "clientes_update_authenticated" on public.clientes;
create policy "clientes_update_authenticated"
  on public.clientes for update to authenticated using (true);

drop policy if exists "clientes_delete_authenticated" on public.clientes;
create policy "clientes_delete_authenticated"
  on public.clientes for delete to authenticated using (true);

-- Comprobantes de cuenta corriente (uno por factura/remito/ajuste pendiente de cobro).
-- Ventas y Devoluciones insertan filas acá cuando la condición de pago es Cta. Cte.
create table if not exists public.cta_cte_comprobantes (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes (id) on delete restrict,
  empresa_cuit text not null,
  tipo text not null,
  numero text not null,
  fecha date not null default current_date,
  total numeric(12, 2) not null,
  monto_pagado numeric(12, 2) not null default 0,
  creado_en timestamptz not null default now()
);

create index if not exists cta_cte_comprobantes_cliente_idx on public.cta_cte_comprobantes (cliente_id);

alter table public.cta_cte_comprobantes enable row level security;

drop policy if exists "cta_cte_comprobantes_select" on public.cta_cte_comprobantes;
create policy "cta_cte_comprobantes_select"
  on public.cta_cte_comprobantes for select to authenticated using (true);

drop policy if exists "cta_cte_comprobantes_insert" on public.cta_cte_comprobantes;
create policy "cta_cte_comprobantes_insert"
  on public.cta_cte_comprobantes for insert to authenticated with check (true);

drop policy if exists "cta_cte_comprobantes_update" on public.cta_cte_comprobantes;
create policy "cta_cte_comprobantes_update"
  on public.cta_cte_comprobantes for update to authenticated using (true);

-- Pagos / adelantos registrados contra la cuenta corriente de un cliente.
create table if not exists public.cta_cte_pagos (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes (id) on delete restrict,
  monto numeric(12, 2) not null,
  forma_pago text not null,
  descuento_10 boolean not null default false,
  fecha date not null default current_date,
  creado_en timestamptz not null default now()
);

alter table public.cta_cte_pagos enable row level security;

drop policy if exists "cta_cte_pagos_select" on public.cta_cte_pagos;
create policy "cta_cte_pagos_select"
  on public.cta_cte_pagos for select to authenticated using (true);

drop policy if exists "cta_cte_pagos_insert" on public.cta_cte_pagos;
create policy "cta_cte_pagos_insert"
  on public.cta_cte_pagos for insert to authenticated with check (true);

-- Detalle de a qué comprobante(s) se aplicó cada pago, y cuánto.
create table if not exists public.cta_cte_pago_aplicaciones (
  id uuid primary key default gen_random_uuid(),
  pago_id uuid not null references public.cta_cte_pagos (id) on delete cascade,
  comprobante_id uuid not null references public.cta_cte_comprobantes (id) on delete restrict,
  monto numeric(12, 2) not null
);

alter table public.cta_cte_pago_aplicaciones enable row level security;

drop policy if exists "cta_cte_pago_aplicaciones_select" on public.cta_cte_pago_aplicaciones;
create policy "cta_cte_pago_aplicaciones_select"
  on public.cta_cte_pago_aplicaciones for select to authenticated using (true);

drop policy if exists "cta_cte_pago_aplicaciones_insert" on public.cta_cte_pago_aplicaciones;
create policy "cta_cte_pago_aplicaciones_insert"
  on public.cta_cte_pago_aplicaciones for insert to authenticated with check (true);

do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'clientes') then
    alter publication supabase_realtime add table public.clientes;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'cta_cte_comprobantes') then
    alter publication supabase_realtime add table public.cta_cte_comprobantes;
  end if;
end $$;
