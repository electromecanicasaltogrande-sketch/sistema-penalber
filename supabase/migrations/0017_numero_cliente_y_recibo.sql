-- Número de cliente (el mismo del sistema viejo, "<<101>>" en los comprobantes) y número de recibo correlativo.

alter table public.clientes add column if not exists codigo integer;
create unique index if not exists clientes_codigo_unique on public.clientes (codigo) where codigo is not null;

create or replace function public.clientes_asignar_codigo() returns trigger language plpgsql as $$
begin
  if new.codigo is null then
    select coalesce(max(codigo), 0) + 1 into new.codigo from public.clientes;
  end if;
  return new;
end $$;

drop trigger if exists clientes_codigo_trg on public.clientes;
create trigger clientes_codigo_trg before insert on public.clientes
  for each row execute function public.clientes_asignar_codigo();

-- Recibos: continúan la numeración del sistema viejo (último recibo 9235052).
alter table public.cta_cte_pagos add column if not exists numero bigint;

create or replace function public.pagos_asignar_numero() returns trigger language plpgsql as $$
begin
  if new.numero is null then
    select greatest(coalesce(max(numero), 0) + 1, 9235053) into new.numero from public.cta_cte_pagos;
  end if;
  return new;
end $$;

drop trigger if exists pagos_numero_trg on public.cta_cte_pagos;
create trigger pagos_numero_trg before insert on public.cta_cte_pagos
  for each row execute function public.pagos_asignar_numero();

-- Los pagos que ya existen reciben número en orden cronológico.
with ord as (
  select id, 9235052 + row_number() over (order by creado_en, id) as n
  from public.cta_cte_pagos where numero is null
)
update public.cta_cte_pagos p set numero = ord.n from ord where p.id = ord.id;
