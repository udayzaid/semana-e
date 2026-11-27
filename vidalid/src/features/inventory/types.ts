import type { MovementType } from '@/types/database'

export interface InventorySummary {
  activeProducts: number
  totalUnits: number
  inventoryValue: number
  lowStock: number
  outOfStock: number
  expiringBatches: number
  expiredBatches: number
}

export interface Batch {
  id: string
  productId: string
  productName: string
  productSku: string
  unit: string
  lotCode: string | null
  expiresAt: string | null
  initialQuantity: number
  quantity: number
  unitCost: number | null
  receivedAt: string
}

export type BatchFilter = 'all' | 'expiring' | 'expired'

export interface Movement {
  id: number
  productName: string
  productSku: string
  unit: string
  lotCode: string | null
  type: MovementType
  quantityChange: number
  stockBefore: number
  stockAfter: number
  reason: string
  referenceType: 'manual' | 'sale'
  authorName: string | null
  createdAt: string
}

export interface MovementFilters {
  productId: string | null
  type: MovementType | null
  /** yyyy-MM-dd (fecha local) */
  from: string | null
  to: string | null
  page: number
  pageSize: number
}

export interface StockEntryInput {
  productId: string
  quantity: number
  reason: string | null
  lotCode: string | null
  expiresAt: string | null
  unitCost: number | null
}

export interface StockExitInput {
  productId: string
  quantity: number
  reason: string
  batchId: string | null
}

export interface StockAdjustInput {
  batchId: string
  countedQuantity: number
  reason: string
}

/** Días para considerar un lote "próximo a vencer". */
export const EXPIRING_DAYS = 30
