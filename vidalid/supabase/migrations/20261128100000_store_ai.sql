-- =====================================================================
-- VIDALID · Chat de la tienda (Edge Function vidalid-store-ai)
--
-- Límite de uso para el asistente público de la tienda: lo pueden usar
-- visitantes sin cuenta, así que cada persona (por usuario o por IP) y la
-- tienda en total tienen un máximo de mensajes por ventana de tiempo.
-- Solo la Edge Function (service_role) puede consumir el cupo.
-- =====================================================================

create table if not exists private.ai_rate_limits (
  bucket        text primary key check (char_length(bucket) <= 120),
  window_start  timestamptz not null default now(),
  hits          integer not null default 0 check (hits >= 0)
);

alter table private.ai_rate_limits enable row level security;
revoke all on private.ai_rate_limits from public, anon, authenticated;

-- Suma un uso al cupo y devuelve true si todavía está dentro del límite.
create or replace function public.consume_ai_quota(p_bucket text, p_limit integer, p_window_seconds integer)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_hits integer;
  v_window interval;
begin
  if p_bucket is null or char_length(p_bucket) = 0 or char_length(p_bucket) > 120 then
    raise exception 'Cupo no válido.';
  end if;
  if p_limit < 1 or p_window_seconds < 1 then
    raise exception 'Límite no válido.';
  end if;
  v_window := make_interval(secs => p_window_seconds);

  insert into private.ai_rate_limits as r (bucket, window_start, hits)
  values (p_bucket, now(), 1)
  on conflict (bucket) do update
    set window_start = case when r.window_start <= now() - v_window then now() else r.window_start end,
        hits = case when r.window_start <= now() - v_window then 1 else r.hits + 1 end
  returning hits into v_hits;

  -- Limpieza ocasional de cupos viejos (evita que la tabla crezca sin fin).
  if random() < 0.02 then
    delete from private.ai_rate_limits where window_start < now() - interval '2 days';
  end if;

  return v_hits <= p_limit;
end;
$$;

revoke all on function public.consume_ai_quota(text, integer, integer) from public, anon, authenticated;
grant execute on function public.consume_ai_quota(text, integer, integer) to service_role;
