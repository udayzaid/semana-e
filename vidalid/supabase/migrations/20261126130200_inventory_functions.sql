-- =====================================================================
-- VIDALID · Migración 003 · Funciones de inventario
-- Única vía para modificar stock y lotes. Cada función:
--   1. verifica que el usuario sea administrador,
--   2. bloquea las filas afectadas (FOR UPDATE) para evitar carreras,
--   3. actualiza lotes y stock del producto en la misma transacción,
--   4. registra el movimiento en inventory_movements.
-- Orden de bloqueo en todo el sistema: producto -> lotes (evita deadlocks).
-- =====================================================================

-- ---------------------------------------------------------------------
-- Auxiliar interno: descuenta stock por FEFO (primero vence, primero sale).
-- Devuelve qué lotes se usaron y cuántas unidades de cada uno.
-- p_skip_expired = true ignora lotes vencidos (ventas).
-- No es accesible desde la API (esquema private).
-- ---------------------------------------------------------------------
create or replace function private.consume_stock_fefo(
  p_product_id      uuid,
  p_quantity        integer,
  p_movement_type   public.movement_type,
  p_reason          text,
  p_reference_type  text,
  p_reference_id    uuid,
  p_skip_expired    boolean
)
returns table (out_batch_id uuid, out_quantity integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_remaining  integer := p_quantity;
  v_stock      integer;
  v_take       integer;
  v_batch      record;
begin
  select p.stock into v_stock
  from public.products p
  where p.id = p_product_id
  for update;

  for v_batch in
    select b.id, b.quantity
    from public.batches b
    where b.product_id = p_product_id
      and b.quantity > 0
      and (not p_skip_expired or b.expires_at is null or b.expires_at >= current_date)
    order by b.expires_at nulls last, b.received_at, b.id
    for update
  loop
    exit when v_remaining = 0;
    v_take := least(v_batch.quantity, v_remaining);

    update public.batches
    set quantity = quantity - v_take
    where id = v_batch.id;

    insert into public.inventory_movements
      (product_id, batch_id, movement_type, quantity_change, stock_before, stock_after,
       reason, reference_type, reference_id, created_by)
    values
      (p_product_id, v_batch.id, p_movement_type, -v_take, v_stock, v_stock - v_take,
       left(p_reason, 300), p_reference_type, p_reference_id, auth.uid());

    v_stock := v_stock - v_take;
    v_remaining := v_remaining - v_take;

    out_batch_id := v_batch.id;
    out_quantity := v_take;
    return next;
  end loop;

  if v_remaining > 0 then
    raise exception 'Stock insuficiente en lotes vigentes: faltan % unidades.', v_remaining
      using errcode = 'P0001';
  end if;

  update public.products
  set stock = v_stock
  where id = p_product_id;
end;
$$;

-- ---------------------------------------------------------------------
-- RF-12 / RF-21 / RF-22 · Registrar entrada de mercadería (crea un lote)
-- Devuelve el id del lote creado.
-- ---------------------------------------------------------------------
create or replace function public.register_stock_entry(
  p_product_id  uuid,
  p_quantity    integer,
  p_reason      text default null,
  p_lot_code    text default null,
  p_expires_at  date default null,
  p_unit_cost   numeric default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_stock     integer;
  v_batch_id  uuid;
  v_reason    text := coalesce(nullif(trim(p_reason), ''), 'Ingreso de mercadería');
begin
  perform private.assert_admin();

  if p_quantity is null or p_quantity <= 0 then
    raise exception 'La cantidad debe ser mayor a cero.' using errcode = '22023';
  end if;
  if p_expires_at is not null and p_expires_at < current_date then
    raise exception 'La fecha de vencimiento ya pasó.' using errcode = '22023';
  end if;
  if p_unit_cost is not null and p_unit_cost < 0 then
    raise exception 'El costo no puede ser negativo.' using errcode = '22023';
  end if;

  select p.stock into v_stock
  from public.products p
  where p.id = p_product_id
  for update;

  if not found then
    raise exception 'Producto no encontrado.' using errcode = 'P0002';
  end if;

  insert into public.batches
    (product_id, lot_code, expires_at, initial_quantity, quantity, unit_cost, created_by)
  values
    (p_product_id, nullif(trim(p_lot_code), ''), p_expires_at, p_quantity, p_quantity,
     round(p_unit_cost, 2), auth.uid())
  returning id into v_batch_id;

  update public.products
  set stock = v_stock + p_quantity
  where id = p_product_id;

  insert into public.inventory_movements
    (product_id, batch_id, movement_type, quantity_change, stock_before, stock_after,
     reason, reference_type, created_by)
  values
    (p_product_id, v_batch_id, 'entry', p_quantity, v_stock, v_stock + p_quantity,
     left(v_reason, 300), 'manual', auth.uid());

  return v_batch_id;
end;
$$;

-- ---------------------------------------------------------------------
-- RF-13 · Registrar salida (merma, vencido, muestra, uso interno...)
-- Sin p_batch_id descuenta por FEFO (incluye lotes vencidos primero).
-- Con p_batch_id descuenta de ese lote concreto.
-- ---------------------------------------------------------------------
create or replace function public.register_stock_exit(
  p_product_id  uuid,
  p_quantity    integer,
  p_reason      text,
  p_batch_id    uuid default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_product    record;
  v_batch_qty  integer;
  v_reason     text := trim(coalesce(p_reason, ''));
begin
  perform private.assert_admin();

  if p_quantity is null or p_quantity <= 0 then
    raise exception 'La cantidad debe ser mayor a cero.' using errcode = '22023';
  end if;
  if char_length(v_reason) < 3 then
    raise exception 'Indica el motivo de la salida.' using errcode = '22023';
  end if;

  select p.stock, p.reserved_stock into v_product
  from public.products p
  where p.id = p_product_id
  for update;

  if not found then
    raise exception 'Producto no encontrado.' using errcode = 'P0002';
  end if;
  if p_quantity > v_product.stock - v_product.reserved_stock then
    raise exception 'Stock insuficiente: disponible %, solicitado %.',
      v_product.stock - v_product.reserved_stock, p_quantity
      using errcode = 'P0001';
  end if;

  if p_batch_id is null then
    perform * from private.consume_stock_fefo(
      p_product_id, p_quantity, 'exit', v_reason, 'manual', null, false
    );
    return;
  end if;

  select b.quantity into v_batch_qty
  from public.batches b
  where b.id = p_batch_id
    and b.product_id = p_product_id
  for update;

  if not found then
    raise exception 'El lote indicado no pertenece a este producto.' using errcode = 'P0002';
  end if;
  if v_batch_qty < p_quantity then
    raise exception 'El lote solo tiene % unidades.', v_batch_qty using errcode = 'P0001';
  end if;

  update public.batches
  set quantity = quantity - p_quantity
  where id = p_batch_id;

  update public.products
  set stock = stock - p_quantity
  where id = p_product_id;

  insert into public.inventory_movements
    (product_id, batch_id, movement_type, quantity_change, stock_before, stock_after,
     reason, reference_type, created_by)
  values
    (p_product_id, p_batch_id, 'exit', -p_quantity, v_product.stock,
     v_product.stock - p_quantity, left(v_reason, 300), 'manual', auth.uid());
end;
$$;

-- ---------------------------------------------------------------------
-- RF-18 · Ajuste de inventario por conteo físico de un lote
-- p_counted_quantity = unidades contadas realmente en el almacén.
-- ---------------------------------------------------------------------
create or replace function public.adjust_stock(
  p_batch_id          uuid,
  p_counted_quantity  integer,
  p_reason            text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_product_id  uuid;
  v_product     record;
  v_batch_qty   integer;
  v_delta       integer;
  v_reason      text := trim(coalesce(p_reason, ''));
begin
  perform private.assert_admin();

  if p_counted_quantity is null or p_counted_quantity < 0 then
    raise exception 'La cantidad contada no puede ser negativa.' using errcode = '22023';
  end if;
  if char_length(v_reason) < 3 then
    raise exception 'Indica el motivo del ajuste.' using errcode = '22023';
  end if;

  select b.product_id into v_product_id
  from public.batches b
  where b.id = p_batch_id;

  if not found then
    raise exception 'Lote no encontrado.' using errcode = 'P0002';
  end if;

  -- Bloqueo en orden: producto y luego lote.
  select p.stock, p.reserved_stock into v_product
  from public.products p
  where p.id = v_product_id
  for update;

  select b.quantity into v_batch_qty
  from public.batches b
  where b.id = p_batch_id
  for update;

  v_delta := p_counted_quantity - v_batch_qty;

  if v_delta = 0 then
    raise exception 'La cantidad contada es igual a la registrada; no hay nada que ajustar.'
      using errcode = '22023';
  end if;
  if v_product.stock + v_delta < v_product.reserved_stock then
    raise exception 'El ajuste dejaría menos stock que el reservado para pedidos.'
      using errcode = 'P0001';
  end if;

  update public.batches
  set quantity = p_counted_quantity
  where id = p_batch_id;

  update public.products
  set stock = stock + v_delta
  where id = v_product_id;

  insert into public.inventory_movements
    (product_id, batch_id, movement_type, quantity_change, stock_before, stock_after,
     reason, reference_type, created_by)
  values
    (v_product_id, p_batch_id, 'adjustment', v_delta, v_product.stock,
     v_product.stock + v_delta, left(v_reason, 300), 'manual', auth.uid());
end;
$$;
