-- =====================================================================
-- VIDALID · Migración 010 · Resumen de ventas por periodo
-- Totales de ventas completadas entre p_from (incluido) y p_to (excluido).
-- El frontend envía los límites en su zona horaria (p. ej. hoy 00:00 a
-- mañana 00:00). Solo admin. Lo usan Ventas, Dashboard y Reportes.
-- =====================================================================

create or replace function public.get_sales_summary(p_from timestamptz, p_to timestamptz)
returns table (
  sales_count     integer,
  total_amount    numeric,
  average_ticket  numeric,
  discount_total  numeric,
  cash_total      numeric,
  qr_total        numeric,
  units_sold      bigint,
  voided_count    integer
)
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
  with period as (
    select s.id, s.total, s.discount, s.status
    from public.sales s
    where s.created_at >= p_from and s.created_at < p_to
  ),
  completed as (
    select * from period where status = 'completed'
  )
  select
    (select count(*)::integer from completed),
    (select coalesce(sum(total), 0)::numeric(14, 2) from completed),
    (select coalesce(round(avg(total), 2), 0)::numeric(14, 2) from completed),
    (select coalesce(sum(discount), 0)::numeric(14, 2) from completed),
    (select coalesce(sum(p.amount), 0)::numeric(14, 2)
       from public.payments p join completed c on c.id = p.sale_id where p.method = 'cash'),
    (select coalesce(sum(p.amount), 0)::numeric(14, 2)
       from public.payments p join completed c on c.id = p.sale_id where p.method = 'qr'),
    (select coalesce(sum(si.quantity), 0)::bigint
       from public.sale_items si join completed c on c.id = si.sale_id),
    (select count(*)::integer from period where status = 'voided');
end;
$$;

revoke execute on function public.get_sales_summary(timestamptz, timestamptz) from public, anon;
grant execute on function public.get_sales_summary(timestamptz, timestamptz) to authenticated;
