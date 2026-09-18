drop policy if exists "ventas_delete_admin" on public.ventas;
create policy "ventas_delete_admin"
  on public.ventas for delete
  to authenticated
  using (public.es_admin());

drop policy if exists "venta_items_delete_admin" on public.venta_items;
create policy "venta_items_delete_admin"
  on public.venta_items for delete
  to authenticated
  using (public.es_admin());

drop policy if exists "cta_cte_comprobantes_delete_admin" on public.cta_cte_comprobantes;
create policy "cta_cte_comprobantes_delete_admin"
  on public.cta_cte_comprobantes for delete
  to authenticated
  using (public.es_admin());

drop policy if exists "cheques_delete_admin" on public.cheques;
create policy "cheques_delete_admin"
  on public.cheques for delete
  to authenticated
  using (public.es_admin());
