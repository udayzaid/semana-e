-- =====================================================================
-- VIDALID · Migración 001 · Esquema base
-- Tipos, tablas, restricciones e índices del MVP (Prioridad 1 + lotes).
--
-- Regla clave: el stock, los lotes, los movimientos, las ventas y los
-- pagos NO se escriben directamente desde la API. Solo cambian mediante
-- las funciones transaccionales de las migraciones 003 y 004.
-- =====================================================================

-- Esquema interno para funciones auxiliares que la API no expone.
create schema if not exists private;
revoke all on schema private from public;

-- ---------------------------------------------------------------------
-- Tipos
-- ---------------------------------------------------------------------
create type public.user_role as enum ('admin', 'customer');
create type public.customer_type as enum ('retailer', 'final_consumer');
create type public.movement_type as enum ('entry', 'exit', 'adjustment', 'sale', 'sale_void');
create type public.payment_method as enum ('cash', 'qr');
create type public.sale_status as enum ('completed', 'voided');

-- Mantiene la columna updated_at.
create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- Perfiles (1:1 con auth.users)
-- ---------------------------------------------------------------------
create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text,
  full_name   text not null default '' check (char_length(full_name) <= 120),
  role        public.user_role not null default 'customer',
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
comment on table public.profiles is 'Datos y rol de cada usuario. El rol por defecto es customer; solo un admin puede cambiarlo.';

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function private.set_updated_at();

-- ---------------------------------------------------------------------
-- Categorías
-- ---------------------------------------------------------------------
create table public.categories (
  id           uuid primary key default gen_random_uuid(),
  name         text not null check (char_length(trim(name)) between 2 and 80),
  description  text check (char_length(description) <= 500),
  is_active    boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create unique index categories_name_key on public.categories (lower(trim(name)));

create trigger categories_set_updated_at
  before update on public.categories
  for each row execute function private.set_updated_at();

-- ---------------------------------------------------------------------
-- Productos
-- stock          = suma de las cantidades de sus lotes (lo mantienen las funciones).
-- reserved_stock = unidades reservadas por pedidos confirmados (Prioridad 2).
-- disponible     = stock - reserved_stock.
-- ---------------------------------------------------------------------
create table public.products (
  id              uuid primary key default gen_random_uuid(),
  sku             text not null check (char_length(trim(sku)) between 2 and 40),
  name            text not null check (char_length(trim(name)) between 2 and 120),
  description     text check (char_length(description) <= 2000),
  category_id     uuid not null references public.categories (id) on delete restrict,
  image_path      text check (char_length(image_path) <= 300),
  unit            text not null default 'unidad' check (char_length(trim(unit)) between 1 and 30),
  cost            numeric(12, 2) not null default 0 check (cost >= 0),
  sale_price      numeric(12, 2) not null check (sale_price >= 0),
  stock           integer not null default 0 check (stock >= 0),
  reserved_stock  integer not null default 0 check (reserved_stock >= 0),
  min_stock       integer not null default 0 check (min_stock >= 0),
  is_active       boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint products_reserved_le_stock check (reserved_stock <= stock)
);
create unique index products_sku_key on public.products (upper(trim(sku)));
create index products_category_idx on public.products (category_id);
create index products_name_idx on public.products (lower(name));
create index products_active_idx on public.products (is_active);

create trigger products_set_updated_at
  before update on public.products
  for each row execute function private.set_updated_at();

-- ---------------------------------------------------------------------
-- Lotes: cada entrada de mercadería crea un lote.
-- Código de lote y vencimiento son opcionales.
-- ---------------------------------------------------------------------
create table public.batches (
  id                uuid primary key default gen_random_uuid(),
  product_id        uuid not null references public.products (id) on delete restrict,
  lot_code          text check (char_length(lot_code) <= 60),
  expires_at        date,
  initial_quantity  integer not null check (initial_quantity > 0),
  quantity          integer not null check (quantity >= 0),
  unit_cost         numeric(12, 2) check (unit_cost >= 0),
  received_at       timestamptz not null default now(),
  created_by        uuid references public.profiles (id) on delete set null,
  created_at        timestamptz not null default now()
);
-- Orden FEFO: primero vence, primero sale.
create index batches_fefo_idx on public.batches (product_id, expires_at nulls last, received_at)
  where quantity > 0;
create index batches_expires_idx on public.batches (expires_at)
  where quantity > 0 and expires_at is not null;

-- ---------------------------------------------------------------------
-- Clientes (CRM básico)
-- user_id se enlaza solo si el minorista tiene cuenta en el portal.
-- ---------------------------------------------------------------------
create table public.customers (
  id             uuid primary key default gen_random_uuid(),
  name           text not null check (char_length(trim(name)) between 2 and 120),
  business_name  text check (char_length(business_name) <= 120),
  customer_type  public.customer_type not null default 'retailer',
  phone          text check (phone ~ '^[0-9+() -]{6,20}$'),
  address        text check (char_length(address) <= 300),
  notes          text check (char_length(notes) <= 2000),
  user_id        uuid unique references auth.users (id) on delete set null,
  is_active      boolean not null default true,
  created_by     uuid references public.profiles (id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index customers_name_idx on public.customers (lower(name));
create index customers_phone_idx on public.customers (phone);

create trigger customers_set_updated_at
  before update on public.customers
  for each row execute function private.set_updated_at();

-- ---------------------------------------------------------------------
-- Ventas, detalles y pagos
-- ---------------------------------------------------------------------
create sequence public.sales_code_seq;

create table public.sales (
  id           uuid primary key default gen_random_uuid(),
  code         text not null unique default ('VTA-' || lpad(nextval('public.sales_code_seq')::text, 6, '0')),
  customer_id  uuid references public.customers (id) on delete restrict,
  subtotal     numeric(12, 2) not null check (subtotal >= 0),
  discount     numeric(12, 2) not null default 0 check (discount >= 0),
  total        numeric(12, 2) not null check (total >= 0),
  status       public.sale_status not null default 'completed',
  notes        text check (char_length(notes) <= 1000),
  void_reason  text check (char_length(void_reason) <= 500),
  voided_at    timestamptz,
  voided_by    uuid references public.profiles (id) on delete set null,
  created_by   uuid references public.profiles (id) on delete set null,
  created_at   timestamptz not null default now(),
  constraint sales_discount_le_subtotal check (discount <= subtotal),
  constraint sales_total_consistent check (total = subtotal - discount),
  constraint sales_void_consistent check ((status = 'voided') = (voided_at is not null))
);
comment on column public.sales.customer_id is 'NULL = cliente ocasional sin registrar.';
create index sales_created_at_idx on public.sales (created_at desc);
create index sales_customer_idx on public.sales (customer_id);
create index sales_status_idx on public.sales (status);

-- Una línea por lote consumido (una venta de 10 unidades puede salir de 2 lotes).
create table public.sale_items (
  id          uuid primary key default gen_random_uuid(),
  sale_id     uuid not null references public.sales (id) on delete cascade,
  product_id  uuid not null references public.products (id) on delete restrict,
  batch_id    uuid not null references public.batches (id) on delete restrict,
  quantity    integer not null check (quantity > 0),
  unit_price  numeric(12, 2) not null check (unit_price >= 0),
  unit_cost   numeric(12, 2) not null check (unit_cost >= 0),
  line_total  numeric(12, 2) generated always as (quantity * unit_price) stored
);
create index sale_items_sale_idx on public.sale_items (sale_id);
create index sale_items_product_idx on public.sale_items (product_id);

create table public.payments (
  id          uuid primary key default gen_random_uuid(),
  sale_id     uuid not null references public.sales (id) on delete cascade,
  method      public.payment_method not null,
  amount      numeric(12, 2) not null check (amount > 0),
  reference   text check (char_length(reference) <= 100),
  created_at  timestamptz not null default now()
);
create index payments_sale_idx on public.payments (sale_id);

-- ---------------------------------------------------------------------
-- Historial de movimientos de inventario (solo se inserta, nunca se edita)
-- ---------------------------------------------------------------------
create table public.inventory_movements (
  id               bigint generated always as identity primary key,
  product_id       uuid not null references public.products (id) on delete restrict,
  batch_id         uuid references public.batches (id) on delete restrict,
  movement_type    public.movement_type not null,
  quantity_change  integer not null check (quantity_change <> 0),
  stock_before     integer not null check (stock_before >= 0),
  stock_after      integer not null check (stock_after >= 0),
  reason           text not null check (char_length(trim(reason)) between 2 and 300),
  reference_type   text not null default 'manual' check (reference_type in ('manual', 'sale')),
  reference_id     uuid,
  created_by       uuid references public.profiles (id) on delete set null,
  created_at       timestamptz not null default now(),
  constraint inventory_movements_balance check (stock_after = stock_before + quantity_change)
);
create index inventory_movements_product_idx on public.inventory_movements (product_id, created_at desc);
create index inventory_movements_created_idx on public.inventory_movements (created_at desc);
create index inventory_movements_reference_idx on public.inventory_movements (reference_type, reference_id);
