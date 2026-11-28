import { supabase } from '@/services/supabase/client'
import type { Paginated } from '@/types/database'
import type { PaymentInput } from '@/features/sales/types'
import {
  ACTIVE_STATUSES,
  DISPATCH_STATUSES,
  type DeliveryMode,
  type NewOrderInput,
  type OrderDetail,
  type OrderFilters,
  type OrderListItem,
  type OrderSource,
  type OrderStatus,
} from '../types'

interface OrderRow {
  id: string
  code: string
  status: OrderStatus
  source: OrderSource
  delivery_mode: DeliveryMode
  contact_name: string
  contact_phone: string
  subtotal: number
  assigned_to: string | null
  created_at: string
  customer: { name: string } | null
  order_items: { quantity: number }[]
}

const listColumns =
  'id, code, status, source, delivery_mode, contact_name, contact_phone, subtotal, assigned_to, created_at, customer:customers(name), order_items(quantity)'

function mapListRow(row: OrderRow): OrderListItem {
  return {
    id: row.id,
    code: row.code,
    status: row.status,
    source: row.source,
    deliveryMode: row.delivery_mode,
    contactName: row.contact_name,
    contactPhone: row.contact_phone,
    customerName: row.customer?.name ?? null,
    subtotal: Number(row.subtotal),
    itemCount: row.order_items.reduce((sum, item) => sum + item.quantity, 0),
    assignedTo: row.assigned_to,
    createdAt: row.created_at,
  }
}

export async function listOrders(filters: OrderFilters): Promise<Paginated<OrderListItem>> {
  const from = (filters.page - 1) * filters.pageSize
  let query = supabase.from('orders').select(listColumns, { count: 'exact' })

  if (filters.status === 'active') query = query.in('status', ACTIVE_STATUSES)
  else if (filters.status === 'dispatch') query = query.in('status', DISPATCH_STATUSES)
  else if (filters.status !== 'all') query = query.eq('status', filters.status)
  if (filters.source) query = query.eq('source', filters.source)

  const search = filters.search.replace(/[%,()*\\]/g, ' ').trim()
  if (search) query = query.or(`code.ilike.%${search}%,contact_name.ilike.%${search}%,contact_phone.ilike.%${search}%`)

  // Distribución atiende primero lo más antiguo; el resto ve lo más reciente arriba.
  const ascending = filters.status === 'dispatch'
  const { data, error, count } = await query
    .order('created_at', { ascending })
    .range(from, from + filters.pageSize - 1)
    .returns<OrderRow[]>()
  if (error) throw error
  return { rows: data.map(mapListRow), total: count ?? 0 }
}

interface OrderDetailRow extends OrderRow {
  customer_id: string | null
  delivery_address: string | null
  notes: string | null
  cancel_reason: string | null
  sale_id: string | null
  items: { product_id: string; quantity: number; unit_price: number; line_total: number; product: { name: string; sku: string; unit: string; available_stock: number } | null }[]
  events: { id: number; from_status: OrderStatus | null; to_status: OrderStatus; note: string | null; created_at: string; author: { full_name: string; email: string | null } | null }[]
}

export async function getOrder(id: string): Promise<OrderDetail> {
  const { data, error } = await supabase
    .from('orders')
    .select(
      `${listColumns}, customer_id, delivery_address, notes, cancel_reason, sale_id,
       items:order_items(product_id, quantity, unit_price, line_total, product:products(name, sku, unit, available_stock)),
       events:order_events(id, from_status, to_status, note, created_at, author:profiles(full_name, email))`,
    )
    .eq('id', id)
    .single<OrderDetailRow>()
  if (error) throw error

  return {
    ...mapListRow(data),
    customerId: data.customer_id,
    deliveryAddress: data.delivery_address,
    notes: data.notes,
    cancelReason: data.cancel_reason,
    saleId: data.sale_id,
    items: data.items
      .map((item) => ({
        productId: item.product_id,
        name: item.product?.name ?? '—',
        sku: item.product?.sku ?? '',
        unit: item.product?.unit ?? '',
        quantity: item.quantity,
        unitPrice: Number(item.unit_price),
        total: Number(item.line_total),
        availableStock: item.product?.available_stock ?? 0,
      }))
      .sort((a, b) => a.name.localeCompare(b.name)),
    events: data.events
      .map((event) => ({
        id: event.id,
        fromStatus: event.from_status,
        toStatus: event.to_status,
        note: event.note,
        authorName: event.author?.full_name || event.author?.email || null,
        createdAt: event.created_at,
      }))
      .sort((a, b) => a.id - b.id),
  }
}

export async function getOrderStatusCounts(): Promise<Partial<Record<OrderStatus, number>>> {
  const { data, error } = await supabase.rpc('get_order_status_counts')
  if (error) throw error
  const rows = (data ?? []) as { status: OrderStatus; total: number }[]
  return Object.fromEntries(rows.map((row) => [row.status, row.total]))
}

export async function createOrder(input: NewOrderInput): Promise<string> {
  const { data, error } = await supabase.rpc('create_order', {
    p_items: input.items.map((item) => ({ product_id: item.productId, quantity: item.quantity })),
    p_delivery_mode: input.deliveryMode,
    p_source: input.source,
    p_customer_id: input.customerId,
    p_contact_name: input.contactName,
    p_contact_phone: input.contactPhone,
    p_address: input.address,
    p_notes: input.notes,
  })
  if (error) throw error
  return data as string
}

export async function updateOrderStatus(id: string, status: OrderStatus, note?: string | null, assignedTo?: string | null): Promise<void> {
  const { error } = await supabase.rpc('update_order_status', {
    p_order_id: id,
    p_status: status,
    p_note: note ?? null,
    p_assigned_to: assignedTo ?? null,
  })
  if (error) throw error
}

/** Entrega el pedido: registra la venta con su pago y devuelve el id de la venta. */
export async function deliverOrder(id: string, payments: PaymentInput[], discount: number, note: string | null): Promise<string> {
  const { data, error } = await supabase.rpc('deliver_order', {
    p_order_id: id,
    p_payments: payments.map((payment) => ({ method: payment.method, amount: payment.amount, reference: payment.reference })),
    p_discount: discount,
    p_note: note,
  })
  if (error) throw error
  return data as string
}
