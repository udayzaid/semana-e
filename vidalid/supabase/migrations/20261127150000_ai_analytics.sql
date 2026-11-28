-- =====================================================================
-- VIDALID · Migración 012 · Funciones de análisis para VIDALID AI
-- Funciones de SOLO LECTURA que el asistente puede llamar (nunca SQL libre).
-- Todas exigen rol admin. También sirven para reportes.
--   - get_slow_moving_products: productos con poca o ninguna venta.
--   - get_top_customers: clientes que más compran.
--   - get_restock_suggestions: qué reponer según ritmo de venta y stock.
-- =====================================================================

-- Productos activos con stock y poca rotación en los últimos p_days días.
create or replace function public.get_slow_moving_products(p_days integer default 30, p_limit integer default 10)
returns table (product_id uuid, name text, sku text, unit text, available_stock integer, units_sold bigint, last_sale_at timestamptz)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform private.assert_admin();

  return query
  select p.id, p.name, p.sku, p.unit, p.available_stock,
         coalesce(sum(si.quantity) filter (where s.created_at >= now() - make_interval(days => greatest(p_days, 1))), 0)::bigint,
         max(s.created_at)
  from public.products p
  left join public.sale_items si on si.product_id = p.id
  left join public.sales s on s.id = si.sale_id and s.status = 'completed'
  where p.is_active and p.stock > 0
  group by p.id, p.name, p.sku, p.unit, p.available_stock
  order by 6 asc, p.available_stock desc
  limit least(greatest(coalesce(p_limit, 10), 1), 50);
end;
$$;

-- Clientes que más compran en un periodo (solo ventas completadas).
create or replace function public.get_top_customers(p_from timestamptz, p_to timestamptz, p_limit integer default 5)
returns table (customer_id uuid, name text, business_name text, customer_type public.customer_type, phone text, purchase_count bigint, total_spent numeric, last_purchase_at timestamptz)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform private.assert_admin();

  if p_from is null or p_to is null or p_to <= p_from then
    raise exception 'El periodo de fechas no es válido.' using errcode = '22023';
  end if;

  return query
  select c.id, c.name, c.business_name, c.customer_type, c.phone,
         count(s.id)::bigint,
         sum(s.total)::numeric(14, 2),
         max(s.created_at)
  from public.sales s
  join public.customers c on c.id = s.customer_id
  where s.status = 'completed' and s.created_at >= p_from and s.created_at < p_to
  group by c.id, c.name, c.business_name, c.customer_type, c.phone
  order by 6 desc, 7 desc
  limit least(greatest(coalesce(p_limit, 5), 1), 50);
end;
$$;

-- Sugerencias de reposición:
--   ritmo diario = unidades vendidas en p_days / p_days
--   cobertura    = días que alcanza el disponible al ritmo actual
--   sugerido     = lo necesario para cubrir p_target_days días y no quedar bajo el mínimo
-- Incluye productos agotados, con stock bajo o con cobertura menor a p_target_days.
create or replace function public.get_restock_suggestions(p_days integer default 30, p_target_days integer default 30, p_limit integer default 15)
returns table (product_id uuid, name text, sku text, unit text, available_stock integer, min_stock integer, stock_status text, units_sold bigint, daily_rate numeric, coverage_days numeric, suggested_quantity integer)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_days integer := least(greatest(coalesce(p_days, 30), 1), 365);
  v_target integer := least(greatest(coalesce(p_target_days, 30), 1), 180);
begin
  perform private.assert_admin();

  return query
  with sold as (
    select si.product_id, sum(si.quantity)::bigint as units
    from public.sale_items si
    join public.sales s on s.id = si.sale_id
    where s.status = 'completed' and s.created_at >= now() - make_interval(days => v_days)
    group by si.product_id
  ),
  calc as (
    select p.id, p.name, p.sku, p.unit, p.available_stock, p.min_stock, p.stock_status,
           coalesce(sd.units, 0) as units,
           round(coalesce(sd.units, 0)::numeric / v_days, 2) as rate
    from public.products p
    left join sold sd on sd.product_id = p.id
    where p.is_active
  )
  select c.id, c.name, c.sku, c.unit, c.available_stock, c.min_stock, c.stock_status, c.units, c.rate,
         case when c.rate > 0 then round(c.available_stock / c.rate, 1) end,
         greatest(ceil(c.rate * v_target) + c.min_stock - c.available_stock, c.min_stock - c.available_stock, 0)::integer
  from calc c
  where c.stock_status in ('low', 'out')
     or (c.rate > 0 and c.available_stock / c.rate < v_target)
  order by (c.stock_status = 'out') desc, case when c.rate > 0 then c.available_stock / c.rate end asc nulls last, c.units desc
  limit least(greatest(coalesce(p_limit, 15), 1), 50);
end;
$$;

revoke execute on function public.get_slow_moving_products(integer, integer) from public, anon;
revoke execute on function public.get_top_customers(timestamptz, timestamptz, integer) from public, anon;
revoke execute on function public.get_restock_suggestions(integer, integer, integer) from public, anon;
grant execute on function public.get_slow_moving_products(integer, integer) to authenticated;
grant execute on function public.get_top_customers(timestamptz, timestamptz, integer) to authenticated;
grant execute on function public.get_restock_suggestions(integer, integer, integer) to authenticated;
