create table if not exists public.articulos (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique,
  descripcion text not null,
  marca text not null default '',
  rubro text not null default 'Sin rubro',
  costo numeric(12, 2) not null default 0,
  precio_minorista numeric(12, 2) not null default 0,
  precio_mayorista numeric(12, 2) not null default 0,
  iva numeric(5, 2) not null default 21,
  codigo_barras text unique,
  foto_url text,
  stock integer not null default 0,
  stock_minimo integer not null default 0,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

create index if not exists articulos_rubro_idx on public.articulos (rubro);

alter table public.articulos enable row level security;

-- Ambos roles (admin y mostrador) tienen acceso completo a Artículos y Stock.
create policy "articulos_select_authenticated"
  on public.articulos for select
  to authenticated
  using (true);

create policy "articulos_insert_authenticated"
  on public.articulos for insert
  to authenticated
  with check (true);

create policy "articulos_update_authenticated"
  on public.articulos for update
  to authenticated
  using (true);

create or replace function public.set_actualizado_en()
returns trigger
language plpgsql
as $$
begin
  new.actualizado_en = now();
  return new;
end;
$$;

create trigger articulos_set_actualizado_en
  before update on public.articulos
  for each row
  execute function public.set_actualizado_en();

-- Storage: fotos de artículos, lectura pública, escritura solo autenticada.
insert into storage.buckets (id, name, public)
values ('articulos-fotos', 'articulos-fotos', true)
on conflict (id) do nothing;

create policy "articulos_fotos_public_read"
  on storage.objects for select
  to public
  using (bucket_id = 'articulos-fotos');

create policy "articulos_fotos_authenticated_write"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'articulos-fotos');

create policy "articulos_fotos_authenticated_update"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'articulos-fotos');

create policy "articulos_fotos_authenticated_delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'articulos-fotos');

-- Realtime: para que un alta/edición en una PC se vea al instante en las demás.
alter publication supabase_realtime add table public.articulos;
