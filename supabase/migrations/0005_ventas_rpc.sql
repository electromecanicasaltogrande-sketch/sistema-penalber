create or replace function public.next_comprobante_numero()
returns bigint
language sql
as $$
  select nextval('public.comprobante_numero_seq');
$$;

create or replace function public.descontar_stock(p_articulo_id uuid, p_cantidad numeric)
returns void
language sql
as $$
  update public.articulos set stock = stock - p_cantidad where id = p_articulo_id;
$$;

create or replace function public.devolver_stock(p_articulo_id uuid, p_cantidad numeric)
returns void
language sql
as $$
  update public.articulos set stock = stock + p_cantidad where id = p_articulo_id;
$$;

grant execute on function public.next_comprobante_numero() to authenticated;
grant execute on function public.descontar_stock(uuid, numeric) to authenticated;
grant execute on function public.devolver_stock(uuid, numeric) to authenticated;
