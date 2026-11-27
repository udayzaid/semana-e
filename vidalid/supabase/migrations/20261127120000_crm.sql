-- =====================================================================
-- VIDALID · Migración 009 · CRM
-- - customer_interactions: consultas y seguimientos comerciales (RF-35).
-- - customer_summaries: cada cliente con sus estadísticas de compra
--   (RF-31, RF-32, RF-34). Vista con security_invoker: respeta el RLS
--   de quien consulta (admin ve todo; un minorista solo lo suyo).
-- =====================================================================

create type public.interaction_type as enum ('whatsapp', 'call', 'visit', 'note', 'follow_up');

create table public.customer_interactions (
  id            uuid primary key default gen_random_uuid(),
  customer_id   uuid not null references public.customers (id) on delete cascade,
  type          public.interaction_type not null default 'note',
  notes         text not null check (char_length(trim(notes)) between 2 and 1000),
  follow_up_at  date,
  completed     boolean not null default false,
  completed_at  timestamptz,
  created_by    uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at    timestamptz not null default now(),
  constraint customer_interactions_completed_consistent check (completed = (completed_at is not null))
);
comment on column public.customer_interactions.follow_up_at is 'Fecha para volver a contactar al cliente (seguimiento pendiente si completed = false).';

create index customer_interactions_customer_idx on public.customer_interactions (customer_id, created_at desc);
create index customer_interactions_pending_idx on public.customer_interactions (follow_up_at)
  where follow_up_at is not null and not completed;

-- Al marcar/desmarcar como hecho, registrar la fecha automáticamente.
create or replace function private.set_interaction_completed_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.completed and (tg_op = 'INSERT' or not old.completed) then
    new.completed_at := now();
  elsif not new.completed then
    new.completed_at := null;
  end if;
  return new;
end;
$$;

create trigger customer_interactions_completed_at
  before insert or update of completed on public.customer_interactions
  for each row execute function private.set_interaction_completed_at();

-- Seguridad: solo el admin gestiona el CRM.
alter table public.customer_interactions enable row level security;
revoke all on public.customer_interactions from anon, authenticated;
grant select, delete on public.customer_interactions to authenticated;
grant insert (customer_id, type, notes, follow_up_at, completed) on public.customer_interactions to authenticated;
grant update (type, notes, follow_up_at, completed) on public.customer_interactions to authenticated;

create policy customer_interactions_admin_all on public.customer_interactions
  for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- ---------------------------------------------------------------------
-- Clientes con estadísticas de compra (solo ventas completadas)
-- ---------------------------------------------------------------------
create view public.customer_summaries
with (security_invoker = true)
as
select
  c.id,
  c.name,
  c.business_name,
  c.customer_type,
  c.phone,
  c.address,
  c.notes,
  c.is_active,
  c.created_at,
  coalesce(s.purchase_count, 0) as purchase_count,
  coalesce(s.total_spent, 0)::numeric(14, 2) as total_spent,
  s.first_purchase_at,
  s.last_purchase_at,
  -- Frecuencia: días promedio entre compras (necesita al menos 2 compras).
  case
    when s.purchase_count > 1 then
      round((extract(epoch from (s.last_purchase_at - s.first_purchase_at)) / 86400 / (s.purchase_count - 1))::numeric, 1)
  end as avg_days_between_purchases,
  coalesce(f.pending_follow_ups, 0) as pending_follow_ups,
  f.next_follow_up_at
from public.customers c
left join lateral (
  select count(*)::integer as purchase_count,
         sum(sa.total) as total_spent,
         min(sa.created_at) as first_purchase_at,
         max(sa.created_at) as last_purchase_at
  from public.sales sa
  where sa.customer_id = c.id and sa.status = 'completed'
) s on true
left join lateral (
  select count(*)::integer as pending_follow_ups,
         min(i.follow_up_at) as next_follow_up_at
  from public.customer_interactions i
  where i.customer_id = c.id and i.follow_up_at is not null and not i.completed
) f on true;

revoke all on public.customer_summaries from anon, authenticated;
grant select on public.customer_summaries to authenticated;
