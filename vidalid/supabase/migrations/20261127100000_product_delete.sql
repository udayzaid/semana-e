-- =====================================================================
-- VIDALID · Migración 007 · Eliminar productos sin historial
-- El administrador puede eliminar un producto SOLO si nunca tuvo
-- movimientos: las claves foráneas (ON DELETE RESTRICT) de batches,
-- inventory_movements y sale_items bloquean el borrado si hay historial.
-- En ese caso se debe desactivar.
-- =====================================================================

grant delete on public.products to authenticated;

create policy products_delete_admin on public.products
  for delete to authenticated
  using ((select public.is_admin()));
