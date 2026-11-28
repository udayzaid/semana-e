-- =====================================================================
-- VIDALID · Migración 011 · Indicadores del Dashboard (solo admin)
-- - get_sales_by_day: ventas por día (incluye días sin ventas en 0).
-- - get_top_products: productos más vendidos en un periodo.
-- Los días se cuentan en la zona horaria indicada (por defecto Bolivia).
-- =====================================================================

create or replace function public.get_sales_by_day(
  p_from      date,
  p_to        date,
  p_timezone  text default 'America/La_Paz'
)
returns table (day date, total_amount numeric, sales_count integer)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform private.assert_admin();

  if p_from is null or p_to is null or p_to < p_from then
    raise exception 'El periodo de fechas no es válido.' using errcode = '22023';
  end if;
  if p_to - p_from > 366 then
    raise exception 'El periodo no puede superar un año.' using errcode = '22023';
  end if;
  if not exists (select 1 from pg_catalog.pg_timezone_names where name = p_timezone) then
    raise exception 'Zona horaria no válida: %', p_timezone using errcode = '22023';
  end if;

  return query
  select d::date,
         coalesce(sum(s.total), 0)::numeric(14, 2),
         count(s.id)::integer
  from generate_series(p_from, p_to, interval '1 day') as d
  left join public.sales s
    on s.status = 'completed'
   and (s.created_at at time zone p_timezone)::date = d::date
  group by d
  order by d;
end;
$$;

create or replace function public.get_top_products(
  p_from   timestamptz,
  p_to     timestamptz,
  p_limit  integer default 5
)
returns table (product_id uuid, name text, sku text, unit text, units_sold bigint, revenue numeric)
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
  select p.id, p.name, p.sku, p.unit,
         sum(si.quantity)::bigint,
         sum(si.line_total)::numeric(14, 2)
  from public.sale_items si
  join public.sales s on s.id = si.sale_id
  join public.products p on p.id = si.product_id
  where s.status = 'completed'
    and s.created_at >= p_from and s.created_at < p_to
  group by p.id, p.name, p.sku, p.unit
  order by 5 desc, 6 desc
  limit least(greatest(coalesce(p_limit, 5), 1), 50);
end;
$$;

revoke execute on function public.get_sales_by_day(date, date, text) from public, anon;
revoke execute on function public.get_top_products(timestamptz, timestamptz, integer) from public, anon;
grant execute on function public.get_sales_by_day(date, date, text) to authenticated;
grant execute on function public.get_top_products(timestamptz, timestamptz, integer) to authenticated;
