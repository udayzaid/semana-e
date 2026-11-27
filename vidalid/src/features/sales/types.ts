import type { CustomerType, PaymentMethod, SaleStatus } from '@/types/database'

export interface CartLine {
  productId: string
  name: string
  sku: string
  unit: string
  unitPrice: number
  quantity: number
  /** Disponible al momento de agregarlo (la base de datos vuelve a validar). */
  available: number
}

export interface PaymentInput {
  method: PaymentMethod
  amount: number
  reference: string | null
}

export interface SaleInput {
  customerId: string | null
  items: { productId: string; quantity: number }[]
  payments: PaymentInput[]
  discount: number
  notes: string | null
}

export interface SaleListItem {
  id: string
  code: string
  customerName: string | null
  businessName: string | null
  total: number
  discount: number
  status: SaleStatus
  paymentMethods: PaymentMethod[]
  createdAt: string
}

export interface SaleFilters {
  search: string
  customerId: string | null
  status: 'all' | SaleStatus
  from: string | null
  to: string | null
  page: number
  pageSize: number
}

export interface SaleLine {
  productId: string
  name: string
  sku: string
  unit: string
  quantity: number
  unitPrice: number
  total: number
  lots: string[]
}

export interface SaleDetail {
  id: string
  code: string
  createdAt: string
  status: SaleStatus
  subtotal: number
  discount: number
  total: number
  notes: string | null
  voidReason: string | null
  voidedAt: string | null
  sellerName: string | null
  customer: { id: string; name: string; businessName: string | null; phone: string | null; address: string | null; customerType: CustomerType } | null
  lines: SaleLine[]
  payments: { method: PaymentMethod; amount: number; reference: string | null }[]
}

export interface SalesSummary {
  salesCount: number
  totalAmount: number
  averageTicket: number
  discountTotal: number
  cashTotal: number
  qrTotal: number
  unitsSold: number
  voidedCount: number
}

export const paymentLabels: Record<PaymentMethod, string> = {
  cash: 'Efectivo',
  qr: 'QR',
}
