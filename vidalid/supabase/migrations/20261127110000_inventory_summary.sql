-- =====================================================================
-- VIDALID · Migración 008 · Resumen de inventario
-- Indicadores calculados en la base de datos (solo admin).
-- Los usa el módulo Inventario y, más adelante, el Dashboard.
-- p_expiring_days: días hacia adelante para "próximo a vencer".
-- =====================================================================

create or replace function public.get_inventory_summary(p_expiring_days integer default 30)
returns table (
  active_products   integer,
  total_units       bigint,
  inventory_value   numeric,
  low_stock         integer,
  out_of_stock      integer,
  expiring_batches  integer,
  expired_batches   integer
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform private.assert_admin();

  return query
  select
    (select count(*)::integer from public.products p where p.is_active),
    (select coalesce(sum(p.stock), 0)::bigint from public.products p where p.is_active),
    -- Valor al costo: lotes con costo propio; si no, el costo del producto.
    (select coalesce(sum(b.quantity * coalesce(b.unit_cost, p.cost)), 0)::numeric(14, 2)
       from public.batches b
       join public.products p on p.id = b.product_id
      where b.quantity > 0),
    (select count(*)::integer from public.products p where p.is_active and p.stock_status = 'low'),
    (select count(*)::integer from public.products p where p.is_active and p.stock_status = 'out'),
    (select count(*)::integer from public.batches b
      where b.quantity > 0 and b.expires_at between current_date and current_date + greatest(p_expiring_days, 0)),
    (select count(*)::integer from public.batches b
      where b.quantity > 0 and b.expires_at < current_date);
end;
$$;

revoke execute on function public.get_inventory_summary(integer) from public, anon;
grant execute on function public.get_inventory_summary(integer) to authenticated;
