/**
 * Tipos compartidos del dominio VIDALID.
 * Deben coincidir con los tipos enum de supabase/migrations/20261126130000_core_schema.sql.
 */
export type UserRole = 'admin' | 'customer'

export type CustomerType = 'retailer' | 'final_consumer'

export type PaymentMethod = 'cash' | 'qr'

export type SaleStatus = 'completed' | 'voided'

export type StockStatus = 'ok' | 'low' | 'out'

export type MovementType = 'entry' | 'exit' | 'adjustment' | 'sale' | 'sale_void'

/** Estados de pedido (Prioridad 2, aún sin tabla en la base de datos). */
export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'preparing'
  | 'ready_for_pickup'
  | 'dispatched'
  | 'delivered'
  | 'cancelled'

/** Resultado paginado desde el servidor. */
export interface Paginated<T> {
  rows: T[]
  total: number
}

export interface ProductSummary {
  id: string
  name: string
  sku: string
  salePrice: number
  availableStock: number
}
