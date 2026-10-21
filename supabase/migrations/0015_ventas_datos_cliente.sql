-- Datos del receptor cargados a mano al facturar (sin dar de alta un cliente):
-- tipo de documento, domicilio, localidad y condición frente al IVA.
alter table public.ventas add column if not exists cliente_tipo_doc text;
alter table public.ventas add column if not exists cliente_domicilio text;
alter table public.ventas add column if not exists cliente_localidad text;
alter table public.ventas add column if not exists cliente_condicion_iva text;
