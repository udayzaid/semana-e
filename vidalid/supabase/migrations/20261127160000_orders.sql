-- =====================================================================
-- VIDALID · Migración 013 · Pedidos y distribución
--
-- Estados: pending → confirmed → preparing → ready (recogida) | dispatched (envío)
--          → delivered.  Se puede cancelar antes de entregar.
-- Reserva de stock: al CONFIRMAR se reserva (products.reserved_stock);
--          al cancelar se libera; al ENTREGAR se libera y se registra la venta
--          (register_sale descuenta el stock por FEFO y genera el comprobante).
-- Origen: whatsapp | manual (registrados por el admin) | web (portal del cliente).
-- Todo cambio de estado queda en order_events (historial de distribución).
-- =====================================================================

create type public.order_status as enum ('pending', 'confirmed', 'preparing', 'ready', 'dispatched', 'delivered', 'cancelled');
create type public.order_source as enum ('whatsapp', 'manual', 'web');
create type public.delivery_mode as enum ('delivery', 'pickup');

create sequence public.orders_code_seq;

create table public.orders (
  id                uuid primary key default gen_random_uuid(),
  code              text not null unique default ('PED-' || lpad(nextval('public.orders_code_seq')::text, 6, '0')),
  customer_id       uuid references public.customers (id) on delete restrict,
  contact_name      text not null check (char_length(trim(contact_name)) between 2 and 120),
  contact_phone     text not null check (contact_phone ~ '^[0-9+() -]{6,20}$'),
  source            public.order_source not null,
  delivery_mode     public.delivery_mode not null,
  delivery_address  text check (char_length(delivery_address) <= 300),
  notes             text check (char_length(notes) <= 1000),
  status            public.order_status not null default 'pending',
  subtotal          numeric(12, 2) not null default 0 check (subtotal >= 0),
  assigned_to       text check (char_length(assigned_to) <= 120),
  cancel_reason     text check (char_length(cancel_reason) <= 500),
  sale_id           uuid unique references public.sales (id) on delete restrict,
  confirmed_at      timestamptz,
  dispatched_at     timestamptz,
  delivered_at      timestamptz,
  cancelled_at      timestamptz,
  created_by        uuid references public.profiles (id) on delete set null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  constraint orders_delivery_address_required check (delivery_mode = 'pickup' or char_length(trim(coalesce(delivery_address, ''))) >= 5),
  constraint orders_delivered_has_sale check ((status = 'delivered') = (sale_id is not null)),
  constraint orders_cancel_consistent check ((status = 'cancelled') = (cancelled_at is not null))
);
comment on column public.orders.assigned_to is 'Responsable de preparar o entregar el pedido (texto libre mientras no exista un módulo de repartidores).';
create index orders_status_idx on public.orders (status, created_at desc);
create index orders_created_idx on public.orders (created_at desc);
create index orders_customer_idx on public.orders (customer_id);
create index orders_phone_idx on public.orders (contact_phone, created_at desc);

create trigger orders_set_updated_at
  before update on public.orders
  for each row execute function private.set_updated_at();

create table public.order_items (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid not null references public.orders (id) on delete cascade,
  product_id  uuid not null references public.products (id) on delete restrict,
  quantity    integer not null check (quantity between 1 and 10000),
  unit_price  numeric(12, 2) not null check (unit_price >= 0),
  line_total  numeric(12, 2) generated always as (quantity * unit_price) stored,
  constraint order_items_unique_product unique (order_id, product_id)
);
create index order_items_order_idx on public.order_items (order_id);
create index order_items_product_idx on public.order_items (product_id);

create table public.order_events (
  id           bigint generated always as identity primary key,
  order_id     uuid not null references public.orders (id) on delete cascade,
  from_status  public.order_status,
  to_status    public.order_status not null,
  note         text check (char_length(note) <= 500),
  created_by   uuid references public.profiles (id) on delete set null,
  created_at   timestamptz not null default now()
);
create index order_events_order_idx on public.order_events (order_id, created_at);

-- ---------------------------------------------------------------------
-- Interno: crea un pedido con sus productos (precios actuales del catálogo).
-- ---------------------------------------------------------------------
create or replace function private.insert_order(
  p_customer_id     uuid,
  p_contact_name    text,
  p_contact_phone   text,
  p_source          public.order_source,
  p_delivery_mode   public.delivery_mode,
  p_address         text,
  p_notes           text,
  p_items           jsonb,
  p_max_items       integer,
  p_max_quantity    integer,
  p_check_available boolean
)
returns table (out_id uuid, out_code text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order_id  uuid;
  v_code      text;
  v_line      record;
  v_product   record;
  v_count     integer;
begin
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'El pedido debe incluir al menos un producto.' using errcode = '22023';
  end if;

  select count(distinct (e ->> 'product_id')) into v_count from jsonb_array_elements(p_items) e;
  if v_count > p_max_items then
    raise exception 'El pedido no puede tener más de % productos distintos.', p_max_items using errcode = '22023';
  end if;

  insert into public.orders (customer_id, contact_name, contact_phone, source, delivery_mode, delivery_address, notes, created_by)
  values (
    p_customer_id,
    trim(p_contact_name),
    trim(p_contact_phone),
    p_source,
    p_delivery_mode,
    case when p_delivery_mode = 'delivery' then nullif(trim(p_address), '') end,
    nullif(trim(p_notes), ''),
    auth.uid()
  )
  returning id, code into v_order_id, v_code;

  for v_line in
    select (e ->> 'product_id')::uuid as product_id, sum((e ->> 'quantity')::integer) as quantity
    from jsonb_array_elements(p_items) e
    group by 1
    order by 1
  loop
    if v_line.product_id is null or v_line.quantity is null or v_line.quantity < 1 then
      raise exception 'Cada producto debe tener una cantidad mayor a cero.' using errcode = '22023';
    end if;
    if v_line.quantity > p_max_quantity then
      raise exception 'La cantidad máxima por producto es %.', p_max_quantity using errcode = '22023';
    end if;

    select p.name, p.sale_price, p.available_stock, p.is_active, c.is_active as category_active
    into v_product
    from public.products p
    join public.categories c on c.id = p.category_id
    where p.id = v_line.product_id;

    if not found or not v_product.is_active or not v_product.category_active then
      raise exception 'Uno de los productos ya no está disponible en el catálogo.' using errcode = 'P0002';
    end if;
    if p_check_available and v_line.quantity > v_product.available_stock then
      raise exception 'Solo hay % unidades disponibles de "%".', greatest(v_product.available_stock, 0), v_product.name using errcode = 'P0001';
    end if;

    insert into public.order_items (order_id, product_id, quantity, unit_price)
    values (v_order_id, v_line.product_id, v_line.quantity, v_product.sale_price);
  end loop;

  update public.orders
  set subtotal = (select coalesce(sum(oi.line_total), 0) from public.order_items oi where oi.order_id = v_order_id)
  where id = v_order_id;

  insert into public.order_events (order_id, from_status, to_status, note, created_by)
  values (v_order_id, null, 'pending',
          case p_source when 'web' then 'Solicitud recibida desde el portal web'
                        when 'whatsapp' then 'Pedido registrado desde WhatsApp'
                        else 'Pedido registrado manualmente' end,
          auth.uid());

  out_id := v_order_id;
  out_code := v_code;
  return next;
end;
$$;

-- ---------------------------------------------------------------------
-- RF-46 / RF-47 / RF-49 / RF-50 · Registrar pedido (admin)
-- p_items: [{"product_id": "uuid", "quantity": 2}, ...]
-- Si hay cliente y no se indica contacto, se usan su nombre y teléfono.
-- ---------------------------------------------------------------------
create or replace function public.create_order(
  p_items          jsonb,
  p_delivery_mode  public.delivery_mode,
  p_source         public.order_source default 'whatsapp',
  p_customer_id    uuid default null,
  p_contact_name   text default null,
  p_contact_phone  text default null,
  p_address        text default null,
  p_notes          text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name     text;
  v_phone    text;
  v_address  text;
  v_active   boolean;
  v_result   record;
begin
  perform private.assert_admin();

  if p_source = 'web' then
    raise exception 'Los pedidos web se registran desde el portal.' using errcode = '22023';
  end if;

  if p_customer_id is not null then
    select c.name, c.phone, c.address, c.is_active into v_name, v_phone, v_address, v_active
    from public.customers c where c.id = p_customer_id;
    if not found or not v_active then
      raise exception 'Cliente no encontrado o inactivo.' using errcode = 'P0002';
    end if;
  end if;

  select * into v_result
  from private.insert_order(
    p_customer_id,
    coalesce(nullif(trim(p_contact_name), ''), v_name),
    coalesce(nullif(trim(p_contact_phone), ''), v_phone),
    p_source,
    p_delivery_mode,
    coalesce(nullif(trim(p_address), ''), case when p_delivery_mode = 'delivery' then v_address end),
    p_notes,
    p_items,
    50,
    10000,
    false
  );

  return v_result.out_id;
exception
  when not_null_violation then
    raise exception 'Indica el nombre y el teléfono de contacto del pedido.' using errcode = '22023';
  when check_violation then
    if sqlerrm like '%orders_delivery_address_required%' then
      raise exception 'Para envío indica la dirección de entrega.' using errcode = '22023';
    elsif sqlerrm like '%contact_phone%' then
      raise exception 'El teléfono de contacto no es válido.' using errcode = '22023';
    end if;
    raise;
end;
$$;

-- ---------------------------------------------------------------------
-- RF-48 / RF-79 a RF-81 · Solicitud de pedido desde el portal (sin registro)
-- Accesible para visitantes anónimos, con límites anti-spam.
-- Devuelve el código del pedido (PED-000123).
-- ---------------------------------------------------------------------
create or replace function public.submit_web_order(
  p_items          jsonb,
  p_contact_name   text,
  p_contact_phone  text,
  p_delivery_mode  public.delivery_mode,
  p_address        text default null,
  p_notes          text default null
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_phone        text := trim(coalesce(p_contact_phone, ''));
  v_recent       integer;
  v_customer_id  uuid;
  v_result       record;
begin
  if char_length(trim(coalesce(p_contact_name, ''))) < 2 then
    raise exception 'Indica tu nombre.' using errcode = '22023';
  end if;
  if v_phone !~ '^[0-9+() -]{6,20}$' then
    raise exception 'Indica un teléfono o WhatsApp válido.' using errcode = '22023';
  end if;
  if p_delivery_mode = 'delivery' and char_length(trim(coalesce(p_address, ''))) < 5 then
    raise exception 'Para envío indica la dirección de entrega.' using errcode = '22023';
  end if;
  if char_length(coalesce(p_notes, '')) > 1000 then
    raise exception 'Las observaciones no pueden superar 1000 caracteres.' using errcode = '22023';
  end if;

  -- Anti-spam: máximo 3 solicitudes pendientes por teléfono en la última hora.
  select count(*) into v_recent
  from public.orders o
  where o.contact_phone = v_phone and o.source = 'web' and o.status = 'pending'
    and o.created_at > now() - interval '1 hour';
  if v_recent >= 3 then
    raise exception 'Ya recibimos varias solicitudes desde este número. Te contactaremos pronto por WhatsApp.' using errcode = 'P0001';
  end if;

  -- Si el visitante tiene cuenta de minorista enlazada, se asocia el pedido.
  if auth.uid() is not null then
    select c.id into v_customer_id from public.customers c where c.user_id = auth.uid() and c.is_active;
  end if;

  select * into v_result
  from private.insert_order(v_customer_id, p_contact_name, v_phone, 'web', p_delivery_mode, p_address, p_notes, p_items, 20, 100, true);

  return v_result.out_code;
end;
$$;

-- ---------------------------------------------------------------------
-- RF-52 / RF-54 / RF-55 / RF-57 · Cambiar estado del pedido (admin)
-- ---------------------------------------------------------------------
create or replace function public.update_order_status(
  p_order_id     uuid,
  p_status       public.order_status,
  p_note         text default null,
  p_assigned_to  text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order    record;
  v_item     record;
  v_allowed  public.order_status[];
  v_note     text := nullif(trim(coalesce(p_note, '')), '');
begin
  perform private.assert_admin();

  select o.id, o.code, o.status, o.delivery_mode into v_order
  from public.orders o where o.id = p_order_id for update;
  if not found then
    raise exception 'Pedido no encontrado.' using errcode = 'P0002';
  end if;

  if p_status = 'delivered' then
    raise exception 'Para entregar el pedido registra el pago con "Entregar".' using errcode = '22023';
  end if;

  v_allowed := case v_order.status
    when 'pending' then array['confirmed', 'cancelled']::public.order_status[]
    when 'confirmed' then array['preparing', 'cancelled']::public.order_status[]
    when 'preparing' then case v_order.delivery_mode when 'pickup' then array['ready', 'cancelled']::public.order_status[] else array['dispatched', 'cancelled']::public.order_status[] end
    when 'ready' then array['cancelled']::public.order_status[]
    when 'dispatched' then array['cancelled']::public.order_status[]
    else array[]::public.order_status[]
  end;

  if not (p_status = any (v_allowed)) then
    raise exception 'El pedido % no puede pasar de "%" a "%".', v_order.code, v_order.status, p_status using errcode = 'P0001';
  end if;

  if p_status = 'cancelled' and char_length(coalesce(v_note, '')) < 5 then
    raise exception 'Indica el motivo de la cancelación (mínimo 5 caracteres).' using errcode = '22023';
  end if;

  -- Confirmar: reservar stock (bloqueando productos en orden fijo).
  if p_status = 'confirmed' then
    for v_item in
      select oi.product_id, oi.quantity, p.name, p.stock, p.reserved_stock, p.is_active
      from public.order_items oi
      join public.products p on p.id = oi.product_id
      where oi.order_id = p_order_id
      order by oi.product_id
      for update of p
    loop
      if not v_item.is_active then
        raise exception 'El producto "%" está inactivo.', v_item.name using errcode = 'P0001';
      end if;
      if v_item.stock - v_item.reserved_stock < v_item.quantity then
        raise exception 'Stock insuficiente para "%": disponible %, solicitado %.', v_item.name, v_item.stock - v_item.reserved_stock, v_item.quantity using errcode = 'P0001';
      end if;
      update public.products set reserved_stock = reserved_stock + v_item.quantity where id = v_item.product_id;
    end loop;
  end if;

  -- Cancelar un pedido que ya reservó stock: liberar la reserva.
  if p_status = 'cancelled' and v_order.status in ('confirmed', 'preparing', 'ready', 'dispatched') then
    perform private.release_order_reservation(p_order_id);
  end if;

  update public.orders
  set status = p_status,
      assigned_to = coalesce(nullif(trim(coalesce(p_assigned_to, '')), ''), assigned_to),
      confirmed_at = case when p_status = 'confirmed' then now() else confirmed_at end,
      dispatched_at = case when p_status in ('dispatched', 'ready') then now() else dispatched_at end,
      cancelled_at = case when p_status = 'cancelled' then now() else cancelled_at end,
      cancel_reason = case when p_status = 'cancelled' then left(v_note, 500) else cancel_reason end
  where id = p_order_id;

  insert into public.order_events (order_id, from_status, to_status, note, created_by)
  values (p_order_id, v_order.status, p_status,
          left(concat_ws(' · ', v_note, case when nullif(trim(coalesce(p_assigned_to, '')), '') is not null then 'Responsable: ' || trim(p_assigned_to) end), 500),
          auth.uid());
end;
$$;

-- Interno: libera la reserva de stock de un pedido.
create or replace function private.release_order_reservation(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_item record;
begin
  for v_item in
    select oi.product_id, oi.quantity from public.order_items oi where oi.order_id = p_order_id order by oi.product_id
  loop
    update public.products
    set reserved_stock = greatest(reserved_stock - v_item.quantity, 0)
    where id = v_item.product_id;
  end loop;
end;
$$;

-- ---------------------------------------------------------------------
-- RF-58 · Entregar pedido: libera la reserva y registra la venta con su pago.
-- p_payments: [{"method": "cash" | "qr", "amount": 150, "reference": null}]
-- Devuelve el id de la venta generada.
-- ---------------------------------------------------------------------
create or replace function public.deliver_order(
  p_order_id  uuid,
  p_payments  jsonb,
  p_discount  numeric default 0,
  p_note      text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order    record;
  v_items    jsonb;
  v_sale_id  uuid;
begin
  perform private.assert_admin();

  select o.id, o.code, o.status, o.customer_id into v_order
  from public.orders o where o.id = p_order_id for update;
  if not found then
    raise exception 'Pedido no encontrado.' using errcode = 'P0002';
  end if;
  if v_order.status not in ('ready', 'dispatched') then
    raise exception 'Solo se entregan pedidos listos para recoger o enviados (estado actual: %).', v_order.status using errcode = 'P0001';
  end if;

  select jsonb_agg(jsonb_build_object('product_id', oi.product_id, 'quantity', oi.quantity))
  into v_items
  from public.order_items oi where oi.order_id = p_order_id;

  -- La reserva se convierte en venta: primero se libera y luego register_sale descuenta el stock.
  perform private.release_order_reservation(p_order_id);

  v_sale_id := public.register_sale(v_items, p_payments, v_order.customer_id, p_discount, 'Pedido ' || v_order.code);

  update public.orders
  set status = 'delivered', sale_id = v_sale_id, delivered_at = now()
  where id = p_order_id;

  insert into public.order_events (order_id, from_status, to_status, note, created_by)
  values (p_order_id, v_order.status, 'delivered', left(coalesce(nullif(trim(coalesce(p_note, '')), ''), 'Entregado y cobrado'), 500), auth.uid());

  return v_sale_id;
end;
$$;

-- Conteo de pedidos por estado (para los filtros del panel).
create or replace function public.get_order_status_counts()
returns table (status public.order_status, total integer)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform private.assert_admin();
  return query select o.status, count(*)::integer from public.orders o group by o.status;
end;
$$;

-- ---------------------------------------------------------------------
-- Seguridad
-- ---------------------------------------------------------------------
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.order_events enable row level security;

revoke all on public.orders, public.order_items, public.order_events from anon, authenticated;
revoke all on sequence public.orders_code_seq from anon, authenticated;
grant select on public.orders, public.order_items, public.order_events to authenticated;

create policy orders_select_own_or_admin on public.orders
  for select to authenticated
  using (
    (select public.is_admin())
    or exists (select 1 from public.customers c where c.id = orders.customer_id and c.user_id = (select auth.uid()))
  );

create policy order_items_select_own_or_admin on public.order_items
  for select to authenticated
  using (
    (select public.is_admin())
    or exists (
      select 1 from public.orders o join public.customers c on c.id = o.customer_id
      where o.id = order_items.order_id and c.user_id = (select auth.uid())
    )
  );

create policy order_events_select_admin on public.order_events
  for select to authenticated
  using ((select public.is_admin()));

revoke execute on all functions in schema private from public, anon, authenticated;

revoke execute on function public.create_order(jsonb, public.delivery_mode, public.order_source, uuid, text, text, text, text) from public, anon;
revoke execute on function public.update_order_status(uuid, public.order_status, text, text) from public, anon;
revoke execute on function public.deliver_order(uuid, jsonb, numeric, text) from public, anon;
revoke execute on function public.get_order_status_counts() from public, anon;
revoke execute on function public.submit_web_order(jsonb, text, text, public.delivery_mode, text, text) from public;

grant execute on function public.create_order(jsonb, public.delivery_mode, public.order_source, uuid, text, text, text, text) to authenticated;
grant execute on function public.update_order_status(uuid, public.order_status, text, text) to authenticated;
grant execute on function public.deliver_order(uuid, jsonb, numeric, text) to authenticated;
grant execute on function public.get_order_status_counts() to authenticated;
-- El portal es público: visitantes sin cuenta pueden enviar solicitudes.
grant execute on function public.submit_web_order(jsonb, text, text, public.delivery_mode, text, text) to anon, authenticated;
