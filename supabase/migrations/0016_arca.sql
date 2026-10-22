-- Conexión con ARCA (facturación electrónica)
-- Tickets de acceso (WSAA): duran ~12 h y ARCA no permite pedir otro mientras haya uno vigente.
create table if not exists public.arca_tokens (
  cuit text not null,
  entorno text not null,
  token text not null,
  sign text not null,
  expira timestamptz not null,
  primary key (cuit, entorno)
);

alter table public.arca_tokens enable row level security;
drop policy if exists "arca_tokens_all" on public.arca_tokens;
create policy "arca_tokens_all" on public.arca_tokens for all to authenticated using (true) with check (true);

-- Condición frente al IVA del cliente (se informa a ARCA en cada comprobante).
alter table public.clientes add column if not exists condicion_iva text;
