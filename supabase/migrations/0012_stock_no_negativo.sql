-- Vender más unidades de las que hay en stock ahora está permitido (la
-- venta no se bloquea), pero el stock nunca debe quedar en negativo: se
-- clampea en 0.
create or replace function public.descontar_stock(p_articulo_id uuid, p_cantidad numeric)
returns void
language sql
as $$
  update public.articulos set stock = greatest(0, stock - p_cantidad) where id = p_articulo_id;
$$;
