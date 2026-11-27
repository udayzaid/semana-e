-- =====================================================================
-- VIDALID · Migración 005 · Seguridad: privilegios, RLS, catálogo y Storage
--
-- Estrategia:
--   1. Quitar todos los privilegios por defecto de anon y authenticated.
--   2. Conceder solo lo necesario (incluso por columna).
--   3. RLS decide qué filas ve cada uno:
--        admin    -> todo
--        customer -> solo sus propios datos (si tiene cuenta enlazada)
--        anon     -> solo el catálogo público
--   4. Stock, lotes, movimientos, ventas y pagos solo se escriben con las
--      funciones SECURITY DEFINER (migraciones 003 y 004).
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Activar RLS en todas las tablas
-- ---------------------------------------------------------------------
alter table public.profiles             enable row level security;
alter table public.categories           enable row level security;
alter table public.products             enable row level security;
alter table public.batches              enable row level security;
alter table public.customers            enable row level security;
alter table public.sales                enable row level security;
alter table public.sale_items           enable row level security;
alter table public.payments             enable row level security;
alter table public.inventory_movements  enable row level security;

-- ---------------------------------------------------------------------
-- 2. Privilegios de tabla y columna
-- ---------------------------------------------------------------------
revoke all on
  public.profiles, public.categories, public.products, public.batches,
  public.customers, public.sales, public.sale_items, public.payments,
  public.inventory_movements
from anon, authenticated;

revoke all on sequence public.sales_code_seq from anon, authenticated;

-- profiles: el admin edita nombre, rol y estado; nadie inserta ni borra desde la API.
grant select on public.profiles to authenticated;
grant update (full_name, role, is_active) on public.profiles to authenticated;

-- categories: lectura pública de las activas; escritura del admin.
grant select on public.categories to anon, authenticated;
grant insert, update, delete on public.categories to authenticated;

-- products: sin acceso anónimo directo (usa la vista catalog_products).
-- stock y reserved_stock NO se pueden escribir desde la API.
grant select on public.products to authenticated;
grant insert (sku, name, description, category_id, image_path, unit, cost, sale_price, min_stock, is_active)
  on public.products to authenticated;
grant update (sku, name, description, category_id, image_path, unit, cost, sale_price, min_stock, is_active)
  on public.products to authenticated;

-- Solo lectura: se escriben únicamente mediante funciones.
grant select on public.batches, public.inventory_movements,
                public.sales, public.sale_items, public.payments
  to authenticated;

-- customers: CRM gestionado por el admin.
grant select, insert, update on public.customers to authenticated;

-- ---------------------------------------------------------------------
-- 3. Políticas RLS
-- (select public.is_admin()) se evalúa una vez por consulta, no por fila.
-- ---------------------------------------------------------------------

-- profiles
create policy profiles_select_own_or_admin on public.profiles
  for select to authenticated
  using (id = (select auth.uid()) or (select public.is_admin()));

create policy profiles_update_admin on public.profiles
  for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- categories
create policy categories_select_active on public.categories
  for select to anon, authenticated
  using (is_active);

create policy categories_select_admin on public.categories
  for select to authenticated
  using ((select public.is_admin()));

create policy categories_insert_admin on public.categories
  for insert to authenticated
  with check ((select public.is_admin()));

create policy categories_update_admin on public.categories
  for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy categories_delete_admin on public.categories
  for delete to authenticated
  using ((select public.is_admin()));

-- products (los clientes usan catalog_products, que oculta el costo)
create policy products_select_admin on public.products
  for select to authenticated
  using ((select public.is_admin()));

create policy products_insert_admin on public.products
  for insert to authenticated
  with check ((select public.is_admin()));

create policy products_update_admin on public.products
  for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- batches e inventory_movements: solo el admin
create policy batches_select_admin on public.batches
  for select to authenticated
  using ((select public.is_admin()));

create policy inventory_movements_select_admin on public.inventory_movements
  for select to authenticated
  using ((select public.is_admin()));

-- customers
create policy customers_select_own_or_admin on public.customers
  for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));

create policy customers_insert_admin on public.customers
  for insert to authenticated
  with check ((select public.is_admin()));

create policy customers_update_admin on public.customers
  for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- sales, sale_items, payments: admin todo; el minorista ve sus compras
create policy sales_select_own_or_admin on public.sales
  for select to authenticated
  using (
    (select public.is_admin())
    or exists (
      select 1 from public.customers c
      where c.id = sales.customer_id and c.user_id = (select auth.uid())
    )
  );

create policy sale_items_select_own_or_admin on public.sale_items
  for select to authenticated
  using (
    (select public.is_admin())
    or exists (
      select 1
      from public.sales s
      join public.customers c on c.id = s.customer_id
      where s.id = sale_items.sale_id and c.user_id = (select auth.uid())
    )
  );

create policy payments_select_own_or_admin on public.payments
  for select to authenticated
  using (
    (select public.is_admin())
    or exists (
      select 1
      from public.sales s
      join public.customers c on c.id = s.customer_id
      where s.id = payments.sale_id and c.user_id = (select auth.uid())
    )
  );

-- ---------------------------------------------------------------------
-- 4. Catálogo público (portal del cliente)
-- Vista con permisos del propietario (security_invoker = false) a
-- propósito: expone solo columnas seguras (sin costo) de productos y
-- categorías activos.
-- ---------------------------------------------------------------------
create view public.catalog_products
with (security_invoker = false)
as
select
  p.id,
  p.sku,
  p.name,
  p.description,
  p.category_id,
  c.name as category_name,
  p.image_path,
  p.unit,
  p.sale_price,
  greatest(p.stock - p.reserved_stock, 0) as available_stock,
  (p.stock - p.reserved_stock) > 0 as in_stock
from public.products p
join public.categories c on c.id = p.category_id
where p.is_active
  and c.is_active;

revoke all on public.catalog_products from anon, authenticated;
grant select on public.catalog_products to anon, authenticated;

-- ---------------------------------------------------------------------
-- 5. Permisos de ejecución de funciones
-- Postgres concede EXECUTE a PUBLIC por defecto; se retira y se concede
-- solo a usuarios autenticados (cada función valida además el rol admin).
-- ---------------------------------------------------------------------
revoke execute on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

revoke execute on function public.register_stock_entry(uuid, integer, text, text, date, numeric) from public, anon;
revoke execute on function public.register_stock_exit(uuid, integer, text, uuid) from public, anon;
revoke execute on function public.adjust_stock(uuid, integer, text) from public, anon;
revoke execute on function public.register_sale(jsonb, jsonb, uuid, numeric, text) from public, anon;
revoke execute on function public.void_sale(uuid, text) from public, anon;

grant execute on function public.register_stock_entry(uuid, integer, text, text, date, numeric) to authenticated;
grant execute on function public.register_stock_exit(uuid, integer, text, uuid) to authenticated;
grant execute on function public.adjust_stock(uuid, integer, text) to authenticated;
grant execute on function public.register_sale(jsonb, jsonb, uuid, numeric, text) to authenticated;
grant execute on function public.void_sale(uuid, text) to authenticated;

revoke execute on all functions in schema private from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- 6. Storage: imágenes de productos
-- Bucket público de lectura (para el catálogo); solo el admin sube,
-- reemplaza o borra. Máx. 2 MB, JPG / PNG / WEBP.
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-images', 'product-images', true, 2097152,
        array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy product_images_insert_admin on storage.objects
  for insert to authenticated
  with check (bucket_id = 'product-images' and (select public.is_admin()));

create policy product_images_update_admin on storage.objects
  for update to authenticated
  using (bucket_id = 'product-images' and (select public.is_admin()))
  with check (bucket_id = 'product-images' and (select public.is_admin()));

create policy product_images_delete_admin on storage.objects
  for delete to authenticated
  using (bucket_id = 'product-images' and (select public.is_admin()));
