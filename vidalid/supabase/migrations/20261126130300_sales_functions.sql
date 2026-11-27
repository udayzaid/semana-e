-- =====================================================================
-- VIDALID · Migración 004 · Ventas y pagos
-- register_sale: registra una venta completa en UNA transacción:
--   valida existencias, calcula totales en el servidor (los precios se
--   leen de la base de datos, nunca del frontend), descuenta stock por
--   FEFO, guarda detalles, pagos y movimientos.
-- void_sale: anula una venta con motivo y devuelve el stock a sus lotes.
-- =====================================================================

-- ---------------------------------------------------------------------
-- RF-36 a RF-42 · Registrar venta
--
-- p_items:    [{"product_id": "uuid", "quantity": 3}, ...]
-- p_payments: [{"method": "cash" | "qr", "amount": 150.00, "reference": "opcional"}, ...]
-- La suma de los pagos debe ser igual al total (pago completo, se pueden
-- combinar efectivo y QR).
-- Devuelve el id de la venta.
-- ---------------------------------------------------------------------
create or replace function public.register_sale(
  p_items        jsonb,
  p_payments     jsonb,
  p_customer_id  uuid default null,
  p_discount     numeric default 0,
  p_notes        text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_lines      jsonb;
  v_line       record;
  v_slice      record;
  v_product    record;
  v_sellable   integer;
  v_subtotal   numeric(12, 2) := 0;
  v_discount   numeric(12, 2) := round(coalesce(p_discount, 0), 2);
  v_total      numeric(12, 2);
  v_paid       numeric(12, 2);
  v_sale_id    uuid;
  v_sale_code  text;
begin
  perform private.assert_admin();

  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'La venta debe incluir al menos un producto.' using errcode = '22023';
  end if;
  if p_payments is null or jsonb_typeof(p_payments) <> 'array' then
    raise exception 'Los pagos deben enviarse como una lista.' using errcode = '22023';
  end if;
  if p_customer_id is not null and not exists (
    select 1 from public.customers c where c.id = p_customer_id and c.is_active
  ) then
    raise exception 'Cliente no encontrado o inactivo.' using errcode = 'P0002';
  end if;

  -- Agrupar por producto (si el mismo producto llega dos veces, se suma).
  select jsonb_agg(
           jsonb_build_object('product_id', s.product_id, 'quantity', s.quantity)
           order by s.product_id
         )
  into v_lines
  from (
    select (e ->> 'product_id')::uuid as product_id,
           sum((e ->> 'quantity')::integer) as quantity
    from jsonb_array_elements(p_items) as e
    group by 1
  ) s;

  -- 1) Bloquear productos en orden fijo, validar y calcular el subtotal.
  for v_line in
    select x.product_id, x.quantity
    from jsonb_to_recordset(v_lines) as x (product_id uuid, quantity integer)
    order by x.product_id
  loop
    if v_line.product_id is null or v_line.quantity is null or v_line.quantity <= 0 then
      raise exception 'Cada producto debe tener una cantidad mayor a cero.' using errcode = '22023';
    end if;

    select p.name, p.sale_price, p.stock, p.reserved_stock, p.is_active
    into v_product
    from public.products p
    where p.id = v_line.product_id
    for update;

    if not found or not v_product.is_active then
      raise exception 'Uno de los productos no existe o está inactivo.' using errcode = 'P0002';
    end if;

    select coalesce(sum(b.quantity), 0) into v_sellable
    from public.batches b
    where b.product_id = v_line.product_id
      and b.quantity > 0
      and (b.expires_at is null or b.expires_at >= current_date);

    v_sellable := least(v_sellable, v_product.stock - v_product.reserved_stock);

    if v_line.quantity > v_sellable then
      raise exception 'Stock insuficiente para "%": disponible %, solicitado %.',
        v_product.name, v_sellable, v_line.quantity
        using errcode = 'P0001';
    end if;

    v_subtotal := v_subtotal + v_line.quantity * v_product.sale_price;
  end loop;

  -- 2) Descuento y total.
  if v_discount < 0 or v_discount > v_subtotal then
    raise exception 'El descuento debe estar entre 0 y el subtotal (Bs %).', v_subtotal
      using errcode = '22023';
  end if;
  v_total := v_subtotal - v_discount;

  -- 3) Validar pagos.
  if exists (
    select 1
    from jsonb_to_recordset(p_payments) as x (method public.payment_method, amount numeric, reference text)
    where x.method is null or x.amount is null or x.amount <= 0
  ) then
    raise exception 'Cada pago debe tener método (efectivo o QR) y un monto mayor a cero.'
      using errcode = '22023';
  end if;

  select coalesce(sum(round(x.amount, 2)), 0) into v_paid
  from jsonb_to_recordset(p_payments) as x (method public.payment_method, amount numeric, reference text);

  if v_paid <> v_total then
    raise exception 'La suma de los pagos (Bs %) debe ser igual al total de la venta (Bs %).',
      v_paid, v_total
      using errcode = '22023';
  end if;

  -- 4) Cabecera de la venta.
  insert into public.sales (customer_id, subtotal, discount, total, notes, created_by)
  values (p_customer_id, v_subtotal, v_discount, v_total, nullif(trim(p_notes), ''), auth.uid())
  returning id, code into v_sale_id, v_sale_code;

  -- 5) Descontar stock por FEFO y guardar una línea por lote usado.
  for v_line in
    select x.product_id, x.quantity
    from jsonb_to_recordset(v_lines) as x (product_id uuid, quantity integer)
    order by x.product_id
  loop
    for v_slice in
      select f.out_batch_id, f.out_quantity
      from private.consume_stock_fefo(
        v_line.product_id, v_line.quantity, 'sale',
        'Venta ' || v_sale_code, 'sale', v_sale_id, true
      ) as f
    loop
      insert into public.sale_items (sale_id, product_id, batch_id, quantity, unit_price, unit_cost)
      select v_sale_id, p.id, b.id, v_slice.out_quantity, p.sale_price, coalesce(b.unit_cost, p.cost)
      from public.products p
      join public.batches b on b.id = v_slice.out_batch_id
      where p.id = v_line.product_id;
    end loop;
  end loop;

  -- 6) Pagos.
  insert into public.payments (sale_id, method, amount, reference)
  select v_sale_id, x.method, round(x.amount, 2), nullif(trim(x.reference), '')
  from jsonb_to_recordset(p_payments) as x (method public.payment_method, amount numeric, reference text);

  return v_sale_id;
end;
$$;

-- ---------------------------------------------------------------------
-- RF-45 · Anular venta
-- No se borra nada: la venta queda como 'voided' con motivo, y el stock
-- vuelve a los mismos lotes con un movimiento 'sale_void'.
-- ---------------------------------------------------------------------
create or replace function public.void_sale(
  p_sale_id  uuid,
  p_reason   text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_sale    record;
  v_item    record;
  v_stock   integer;
  v_reason  text := trim(coalesce(p_reason, ''));
begin
  perform private.assert_admin();

  if char_length(v_reason) < 5 then
    raise exception 'Indica el motivo de la anulación (mínimo 5 caracteres).' using errcode = '22023';
  end if;

  select s.id, s.code, s.status into v_sale
  from public.sales s
  where s.id = p_sale_id
  for update;

  if not found then
    raise exception 'Venta no encontrada.' using errcode = 'P0002';
  end if;
  if v_sale.status <> 'completed' then
    raise exception 'La venta % ya fue anulada.', v_sale.code using errcode = 'P0001';
  end if;

  -- Bloquear productos en orden fijo.
  perform 1
  from public.products p
  where p.id in (select si.product_id from public.sale_items si where si.sale_id = p_sale_id)
  order by p.id
  for update;

  for v_item in
    select si.product_id, si.batch_id, si.quantity
    from public.sale_items si
    where si.sale_id = p_sale_id
    order by si.product_id, si.id
  loop
    update public.batches
    set quantity = quantity + v_item.quantity
    where id = v_item.batch_id;

    update public.products
    set stock = stock + v_item.quantity
    where id = v_item.product_id
    returning stock into v_stock;

    insert into public.inventory_movements
      (product_id, batch_id, movement_type, quantity_change, stock_before, stock_after,
       reason, reference_type, reference_id, created_by)
    values
      (v_item.product_id, v_item.batch_id, 'sale_void', v_item.quantity,
       v_stock - v_item.quantity, v_stock,
       left('Anulación ' || v_sale.code || ': ' || v_reason, 300),
       'sale', p_sale_id, auth.uid());
  end loop;

  update public.sales
  set status = 'voided',
      void_reason = left(v_reason, 500),
      voided_at = now(),
      voided_by = auth.uid()
  where id = p_sale_id;
end;
$$;
