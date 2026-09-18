-- Con 50.000-100.000+ artículos, traer la tabla completa al navegador (como
-- se hacía hasta ahora en Ventas, Presupuestos, Reparaciones, etc.) es
-- inviable. Esta migración prepara la base para búsqueda en vivo del lado
-- del servidor:
--   1) índices trigram para que ILIKE '%texto%' sobre código/descripción/
--      marca siga siendo rápido a esa escala.
--   2) una vista de "stock bajo mínimo" para no traer todo el catálogo al
--      dashboard solo para filtrar en el cliente.
--   3) funciones para listar los rubros y marcas distintos que existen,
--      usadas por los filtros desplegables.

create extension if not exists pg_trgm;

create index if not exists articulos_codigo_trgm_idx on public.articulos using gin (codigo gin_trgm_ops);
create index if not exists articulos_descripcion_trgm_idx on public.articulos using gin (descripcion gin_trgm_ops);
create index if not exists articulos_marca_trgm_idx on public.articulos using gin (marca gin_trgm_ops);

create or replace view public.v_articulos_stock_bajo as
  select id, codigo, descripcion, marca, rubro, costo, precio_minorista, precio_mayorista,
         iva, codigo_barras, foto_url, stock, stock_minimo
  from public.articulos
  where stock <= stock_minimo;

create or replace function public.articulos_rubros_distintos()
returns table (rubro text)
language sql
stable
as $$
  select distinct a.rubro from public.articulos a order by a.rubro;
$$;

create or replace function public.articulos_marcas_distintas()
returns table (marca text)
language sql
stable
as $$
  select distinct a.marca from public.articulos a where a.marca <> '' order by a.marca;
$$;

grant select on public.v_articulos_stock_bajo to authenticated;
grant execute on function public.articulos_rubros_distintos() to authenticated;
grant execute on function public.articulos_marcas_distintas() to authenticated;
