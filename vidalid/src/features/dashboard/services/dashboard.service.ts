import { format } from 'date-fns'
import { supabase } from '@/services/supabase/client'
import type { StockStatus } from '@/types/database'

export interface DailySales {
  day: string // yyyy-MM-dd
  total: number
  count: number
}

export interface TopProduct {
  productId: string
  name: string
  sku: string
  unit: string
  unitsSold: number
  revenue: number
}

export interface StockAlert {
  id: string
  name: string
  sku: string
  unit: string
  availableStock: number
  minStock: number
  stockStatus: StockStatus
}

/** Zona horaria del navegador (en Bolivia: America/La_Paz). */
const timezone = () => Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/La_Paz'

export async function getSalesByDay(from: Date, to: Date): Promise<DailySales[]> {
  const { data, error } = await supabase.rpc('get_sales_by_day', {
    p_from: format(from, 'yyyy-MM-dd'),
    p_to: format(to, 'yyyy-MM-dd'),
    p_timezone: timezone(),
  })
  if (error) throw error
  const rows = (data ?? []) as { day: string; total_amount: number; sales_count: number }[]
  return rows.map((row) => ({ day: row.day, total: Number(row.total_amount), count: row.sales_count }))
}

export async function getTopProducts(from: Date, to: Date, limit = 5): Promise<TopProduct[]> {
  const { data, error } = await supabase.rpc('get_top_products', { p_from: from.toISOString(), p_to: to.toISOString(), p_limit: limit })
  if (error) throw error
  const rows = (data ?? []) as { product_id: string; name: string; sku: string; unit: string; units_sold: number; revenue: number }[]
  return rows.map((row) => ({
    productId: row.product_id,
    name: row.name,
    sku: row.sku,
    unit: row.unit,
    unitsSold: Number(row.units_sold),
    revenue: Number(row.revenue),
  }))
}

export async function getActiveCustomerCount(): Promise<{ total: number; retailers: number }> {
  const [all, retailers] = await Promise.all([
    supabase.from('customers').select('id', { count: 'exact', head: true }).eq('is_active', true),
    supabase.from('customers').select('id', { count: 'exact', head: true }).eq('is_active', true).eq('customer_type', 'retailer'),
  ])
  if (all.error) throw all.error
  if (retailers.error) throw retailers.error
  return { total: all.count ?? 0, retailers: retailers.count ?? 0 }
}

/** Productos activos agotados o con stock bajo (los más urgentes primero). */
export async function getStockAlerts(limit = 5): Promise<StockAlert[]> {
  const { data, error } = await supabase
    .from('products')
    .select('id, name, sku, unit, available_stock, min_stock, stock_status')
    .eq('is_active', true)
    .in('stock_status', ['low', 'out'])
    .order('available_stock', { ascending: true })
    .limit(limit)
    .returns<{ id: string; name: string; sku: string; unit: string; available_stock: number; min_stock: number; stock_status: StockStatus }[]>()
  if (error) throw error
  return data.map((row) => ({
    id: row.id,
    name: row.name,
    sku: row.sku,
    unit: row.unit,
    availableStock: row.available_stock,
    minStock: row.min_stock,
    stockStatus: row.stock_status,
  }))
}
