import { addDays } from 'date-fns'
import { supabase } from '@/services/supabase/client'
import type { CustomerType, Paginated, PaymentMethod, SaleStatus } from '@/types/database'
import type { SaleDetail, SaleFilters, SaleInput, SaleLine, SaleListItem, SalesSummary } from '../types'

// ---------------------------------------------------------------------
// Registrar y anular (funciones transaccionales de la base de datos)
// ---------------------------------------------------------------------

/** RF-36 a RF-42. Precios y totales los calcula la base de datos. Devuelve el id de la venta. */
export async function registerSale(input: SaleInput): Promise<string> {
  const { data, error } = await supabase.rpc('register_sale', {
    p_items: input.items.map((item) => ({ product_id: item.productId, quantity: item.quantity })),
    p_payments: input.payments.map((payment) => ({ method: payment.method, amount: payment.amount, reference: payment.reference })),
    p_customer_id: input.customerId,
    p_discount: input.discount,
    p_notes: input.notes,
  })
  if (error) throw error
  return data as string
}

/** RF-45. Anula la venta y devuelve el stock a sus lotes. */
export async function voidSale(id: string, reason: string): Promise<void> {
  const { error } = await supabase.rpc('void_sale', { p_sale_id: id, p_reason: reason })
  if (error) throw error
}

// ---------------------------------------------------------------------
// Consultas
// ---------------------------------------------------------------------

interface SaleListRow {
  id: string
  code: string
  total: number
  discount: number
  status: SaleStatus
  created_at: string
  customer: { name: string; business_name: string | null } | null
  payments: { method: PaymentMethod }[]
}

export async function listSales(filters: SaleFilters): Promise<Paginated<SaleListItem>> {
  const from = (filters.page - 1) * filters.pageSize
  let query = supabase
    .from('sales')
    .select('id, code, total, discount, status, created_at, customer:customers(name, business_name), payments(method)', { count: 'exact' })

  const search = filters.search.replace(/[%,()*\\]/g, ' ').trim()
  if (search) query = query.ilike('code', `%${search}%`)
  if (filters.customerId) query = query.eq('customer_id', filters.customerId)
  if (filters.status !== 'all') query = query.eq('status', filters.status)
  if (filters.from) query = query.gte('created_at', new Date(`${filters.from}T00:00:00`).toISOString())
  if (filters.to) query = query.lt('created_at', addDays(new Date(`${filters.to}T00:00:00`), 1).toISOString())

  const { data, error, count } = await query
    .order('created_at', { ascending: false })
    .range(from, from + filters.pageSize - 1)
    .returns<SaleListRow[]>()
  if (error) throw error

  return {
    total: count ?? 0,
    rows: data.map((row) => ({
      id: row.id,
      code: row.code,
      customerName: row.customer?.name ?? null,
      businessName: row.customer?.business_name ?? null,
      total: Number(row.total),
      discount: Number(row.discount),
      status: row.status,
      paymentMethods: [...new Set(row.payments.map((payment) => payment.method))],
      createdAt: row.created_at,
    })),
  }
}

interface SaleDetailRow {
  id: string
  code: string
  created_at: string
  status: SaleStatus
  subtotal: number
  discount: number
  total: number
  notes: string | null
  void_reason: string | null
  voided_at: string | null
  seller: { full_name: string; email: string | null } | null
  customer: { id: string; name: string; business_name: string | null; phone: string | null; address: string | null; customer_type: CustomerType } | null
  sale_items: {
    product_id: string
    quantity: number
    unit_price: number
    line_total: number
    product: { name: string; sku: string; unit: string } | null
    batch: { lot_code: string | null } | null
  }[]
  payments: { method: PaymentMethod; amount: number; reference: string | null }[]
}

export async function getSale(id: string): Promise<SaleDetail> {
  const { data, error } = await supabase
    .from('sales')
    .select(
      `id, code, created_at, status, subtotal, discount, total, notes, void_reason, voided_at,
       seller:profiles!sales_created_by_fkey(full_name, email),
       customer:customers(id, name, business_name, phone, address, customer_type),
       sale_items(product_id, quantity, unit_price, line_total, product:products(name, sku, unit), batch:batches(lot_code)),
       payments(method, amount, reference)`,
    )
    .eq('id', id)
    .single<SaleDetailRow>()
  if (error) throw error

  // Una venta guarda una línea por lote: se agrupan por producto para mostrarla.
  const grouped = new Map<string, SaleLine>()
  for (const item of data.sale_items) {
    const line = grouped.get(item.product_id) ?? {
      productId: item.product_id,
      name: item.product?.name ?? '—',
      sku: item.product?.sku ?? '',
      unit: item.product?.unit ?? '',
      quantity: 0,
      unitPrice: Number(item.unit_price),
      total: 0,
      lots: [],
    }
    line.quantity += item.quantity
    line.total = Math.round((line.total + Number(item.line_total)) * 100) / 100
    if (item.batch?.lot_code && !line.lots.includes(item.batch.lot_code)) line.lots.push(item.batch.lot_code)
    grouped.set(item.product_id, line)
  }

  return {
    id: data.id,
    code: data.code,
    createdAt: data.created_at,
    status: data.status,
    subtotal: Number(data.subtotal),
    discount: Number(data.discount),
    total: Number(data.total),
    notes: data.notes,
    voidReason: data.void_reason,
    voidedAt: data.voided_at,
    sellerName: data.seller?.full_name || data.seller?.email || null,
    customer: data.customer
      ? {
          id: data.customer.id,
          name: data.customer.name,
          businessName: data.customer.business_name,
          phone: data.customer.phone,
          address: data.customer.address,
          customerType: data.customer.customer_type,
        }
      : null,
    lines: [...grouped.values()].sort((a, b) => a.name.localeCompare(b.name)),
    payments: data.payments.map((payment) => ({ method: payment.method, amount: Number(payment.amount), reference: payment.reference })),
  }
}

export async function getSalesSummary(from: Date, to: Date): Promise<SalesSummary> {
  const { data, error } = await supabase
    .rpc('get_sales_summary', { p_from: from.toISOString(), p_to: to.toISOString() })
    .single<{
      sales_count: number
      total_amount: number
      average_ticket: number
      discount_total: number
      cash_total: number
      qr_total: number
      units_sold: number
      voided_count: number
    }>()
  if (error) throw error
  return {
    salesCount: data.sales_count,
    totalAmount: Number(data.total_amount),
    averageTicket: Number(data.average_ticket),
    discountTotal: Number(data.discount_total),
    cashTotal: Number(data.cash_total),
    qrTotal: Number(data.qr_total),
    unitsSold: Number(data.units_sold),
    voidedCount: data.voided_count,
  }
}
