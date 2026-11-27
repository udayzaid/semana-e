import { addDays, format } from 'date-fns'
import { supabase } from '@/services/supabase/client'
import type { MovementType, Paginated } from '@/types/database'
import {
  EXPIRING_DAYS,
  type Batch,
  type BatchFilter,
  type InventorySummary,
  type Movement,
  type MovementFilters,
  type StockAdjustInput,
  type StockEntryInput,
  type StockExitInput,
} from '../types'

// ---------------------------------------------------------------------
// Resumen
// ---------------------------------------------------------------------

export async function getInventorySummary(): Promise<InventorySummary> {
  const { data, error } = await supabase.rpc('get_inventory_summary', { p_expiring_days: EXPIRING_DAYS }).single<{
    active_products: number
    total_units: number
    inventory_value: number
    low_stock: number
    out_of_stock: number
    expiring_batches: number
    expired_batches: number
  }>()
  if (error) throw error
  return {
    activeProducts: data.active_products,
    totalUnits: Number(data.total_units),
    inventoryValue: Number(data.inventory_value),
    lowStock: data.low_stock,
    outOfStock: data.out_of_stock,
    expiringBatches: data.expiring_batches,
    expiredBatches: data.expired_batches,
  }
}

// ---------------------------------------------------------------------
// Lotes
// ---------------------------------------------------------------------

interface BatchRow {
  id: string
  product_id: string
  lot_code: string | null
  expires_at: string | null
  initial_quantity: number
  quantity: number
  unit_cost: number | null
  received_at: string
  product: { name: string; sku: string; unit: string } | null
}

const batchColumns =
  'id, product_id, lot_code, expires_at, initial_quantity, quantity, unit_cost, received_at, product:products(name, sku, unit)'

function mapBatch(row: BatchRow): Batch {
  return {
    id: row.id,
    productId: row.product_id,
    productName: row.product?.name ?? '—',
    productSku: row.product?.sku ?? '',
    unit: row.product?.unit ?? '',
    lotCode: row.lot_code,
    expiresAt: row.expires_at,
    initialQuantity: row.initial_quantity,
    quantity: row.quantity,
    unitCost: row.unit_cost === null ? null : Number(row.unit_cost),
    receivedAt: row.received_at,
  }
}

const today = () => format(new Date(), 'yyyy-MM-dd')

/** Lotes con existencias, ordenados por vencimiento (FEFO). */
export async function listBatches(params: {
  filter: BatchFilter
  productId: string | null
  page: number
  pageSize: number
}): Promise<Paginated<Batch>> {
  const from = (params.page - 1) * params.pageSize
  let query = supabase.from('batches').select(batchColumns, { count: 'exact' }).gt('quantity', 0)

  if (params.productId) query = query.eq('product_id', params.productId)
  if (params.filter === 'expired') query = query.lt('expires_at', today())
  if (params.filter === 'expiring') {
    query = query.gte('expires_at', today()).lte('expires_at', format(addDays(new Date(), EXPIRING_DAYS), 'yyyy-MM-dd'))
  }

  const { data, error, count } = await query
    .order('expires_at', { ascending: true, nullsFirst: false })
    .order('received_at', { ascending: true })
    .range(from, from + params.pageSize - 1)
    .returns<BatchRow[]>()
  if (error) throw error
  return { rows: data.map(mapBatch), total: count ?? 0 }
}

/** Lotes con existencias de un producto (para salidas por lote). */
export async function listProductBatches(productId: string): Promise<Batch[]> {
  const { data, error } = await supabase
    .from('batches')
    .select(batchColumns)
    .eq('product_id', productId)
    .gt('quantity', 0)
    .order('expires_at', { ascending: true, nullsFirst: false })
    .order('received_at', { ascending: true })
    .returns<BatchRow[]>()
  if (error) throw error
  return data.map(mapBatch)
}

// ---------------------------------------------------------------------
// Movimientos
// ---------------------------------------------------------------------

interface MovementRow {
  id: number
  movement_type: MovementType
  quantity_change: number
  stock_before: number
  stock_after: number
  reason: string
  reference_type: 'manual' | 'sale'
  created_at: string
  product: { name: string; sku: string; unit: string } | null
  batch: { lot_code: string | null } | null
  author: { full_name: string; email: string | null } | null
}

const movementColumns =
  'id, movement_type, quantity_change, stock_before, stock_after, reason, reference_type, created_at, product:products(name, sku, unit), batch:batches(lot_code), author:profiles(full_name, email)'

export async function listMovements(filters: MovementFilters): Promise<Paginated<Movement>> {
  const from = (filters.page - 1) * filters.pageSize
  let query = supabase.from('inventory_movements').select(movementColumns, { count: 'exact' })

  if (filters.productId) query = query.eq('product_id', filters.productId)
  if (filters.type) query = query.eq('movement_type', filters.type)
  // Fechas locales: desde las 00:00 del día "desde" hasta antes de las 00:00 del día siguiente a "hasta".
  if (filters.from) query = query.gte('created_at', new Date(`${filters.from}T00:00:00`).toISOString())
  if (filters.to) query = query.lt('created_at', addDays(new Date(`${filters.to}T00:00:00`), 1).toISOString())

  const { data, error, count } = await query
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .range(from, from + filters.pageSize - 1)
    .returns<MovementRow[]>()
  if (error) throw error

  return {
    total: count ?? 0,
    rows: data.map((row) => ({
      id: row.id,
      productName: row.product?.name ?? '—',
      productSku: row.product?.sku ?? '',
      unit: row.product?.unit ?? '',
      lotCode: row.batch?.lot_code ?? null,
      type: row.movement_type,
      quantityChange: row.quantity_change,
      stockBefore: row.stock_before,
      stockAfter: row.stock_after,
      reason: row.reason,
      referenceType: row.reference_type,
      authorName: row.author?.full_name || row.author?.email || null,
      createdAt: row.created_at,
    })),
  }
}

// ---------------------------------------------------------------------
// Operaciones (funciones transaccionales de la base de datos)
// ---------------------------------------------------------------------

export async function registerStockEntry(input: StockEntryInput): Promise<string> {
  const { data, error } = await supabase.rpc('register_stock_entry', {
    p_product_id: input.productId,
    p_quantity: input.quantity,
    p_reason: input.reason,
    p_lot_code: input.lotCode,
    p_expires_at: input.expiresAt,
    p_unit_cost: input.unitCost,
  })
  if (error) throw error
  return data as string
}

export async function registerStockExit(input: StockExitInput): Promise<void> {
  const { error } = await supabase.rpc('register_stock_exit', {
    p_product_id: input.productId,
    p_quantity: input.quantity,
    p_reason: input.reason,
    p_batch_id: input.batchId,
  })
  if (error) throw error
}

export async function adjustStock(input: StockAdjustInput): Promise<void> {
  const { error } = await supabase.rpc('adjust_stock', {
    p_batch_id: input.batchId,
    p_counted_quantity: input.countedQuantity,
    p_reason: input.reason,
  })
  if (error) throw error
}
