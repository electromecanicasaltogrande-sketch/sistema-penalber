-- Un mismo código puede pertenecer a artículos distintos si son de marcas
-- distintas (pasa seguido: varios proveedores reusan códigos genéricos para
-- productos que no son el mismo). Antes "codigo" era único en toda la
-- tabla, lo que impedía cargar el segundo. Ahora la combinación
-- (código, marca) es la que tiene que ser única, sin importar mayúsculas.
alter table public.articulos drop constraint if exists articulos_codigo_key;

create unique index if not exists articulos_codigo_marca_unique
  on public.articulos (lower(codigo), lower(marca));
