-- =====================================================================
-- VIDALID · Migración 006 · Estado de stock calculado en productos
-- Columnas generadas (las calcula Postgres, nadie puede escribirlas):
--   available_stock = stock - reserved_stock
--   stock_status    = 'out' (agotado) | 'low' (stock bajo) | 'ok'
-- Permiten filtrar "stock bajo" y "agotados" desde la API y el dashboard.
-- =====================================================================

alter table public.products
  add column available_stock integer
    generated always as (stock - reserved_stock) stored,
  add column stock_status text
    generated always as (
      case
        when stock - reserved_stock <= 0 then 'out'
        when stock - reserved_stock <= min_stock then 'low'
        else 'ok'
      end
    ) stored;

comment on column public.products.stock_status is 'out = agotado, low = disponible <= stock mínimo, ok = normal.';

create index products_stock_status_idx on public.products (stock_status) where is_active;
