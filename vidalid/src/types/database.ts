/** Tipos compartidos del dominio VIDALID. Se ampliarán al crear las migraciones SQL. */
export type UserRole = 'admin' | 'seller' | 'warehouse' | 'delivery'

export type PaymentMethod = 'cash' | 'qr' | 'bank_transfer'

export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'preparing'
  | 'ready_for_pickup'
  | 'dispatched'
  | 'delivered'
  | 'cancelled'

export interface ProductSummary {
  id: string
  name: string
  sku: string
  salePrice: number
  availableStock: number
}
