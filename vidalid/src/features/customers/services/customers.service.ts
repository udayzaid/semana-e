import { supabase } from '@/services/supabase/client'
import type { CustomerType, Paginated, SaleStatus } from '@/types/database'
import type {
  CustomerFilters,
  CustomerInput,
  CustomerSale,
  CustomerSummary,
  Interaction,
  InteractionInput,
  InteractionType,
} from '../types'

// ---------------------------------------------------------------------
// Clientes (vista customer_summaries = cliente + estadísticas de compra)
// ---------------------------------------------------------------------

interface SummaryRow {
  id: string
  name: string
  business_name: string | null
  customer_type: CustomerType
  phone: string | null
  address: string | null
  notes: string | null
  is_active: boolean
  created_at: string
  purchase_count: number
  total_spent: number
  first_purchase_at: string | null
  last_purchase_at: string | null
  avg_days_between_purchases: number | null
  pending_follow_ups: number
  next_follow_up_at: string | null
}

function mapSummary(row: SummaryRow): CustomerSummary {
  return {
    id: row.id,
    name: row.name,
    businessName: row.business_name,
    customerType: row.customer_type,
    phone: row.phone,
    address: row.address,
    notes: row.notes,
    isActive: row.is_active,
    createdAt: row.created_at,
    purchaseCount: row.purchase_count,
    totalSpent: Number(row.total_spent),
    firstPurchaseAt: row.first_purchase_at,
    lastPurchaseAt: row.last_purchase_at,
    avgDaysBetweenPurchases: row.avg_days_between_purchases === null ? null : Number(row.avg_days_between_purchases),
    pendingFollowUps: row.pending_follow_ups,
    nextFollowUpAt: row.next_follow_up_at,
  }
}

function sanitizeSearch(value: string): string {
  return value.replace(/[%,()*\\]/g, ' ').trim()
}

export async function listCustomers(filters: CustomerFilters): Promise<Paginated<CustomerSummary>> {
  const from = (filters.page - 1) * filters.pageSize
  let query = supabase.from('customer_summaries').select('*', { count: 'exact' })

  const search = sanitizeSearch(filters.search)
  if (search) query = query.or(`name.ilike.%${search}%,business_name.ilike.%${search}%,phone.ilike.%${search}%`)
  if (filters.type !== 'all') query = query.eq('customer_type', filters.type)
  if (filters.status === 'active') query = query.eq('is_active', true)
  if (filters.status === 'inactive') query = query.eq('is_active', false)
  if (filters.status === 'follow_up') query = query.gt('pending_follow_ups', 0)

  switch (filters.sort) {
    case 'purchases':
      query = query.order('purchase_count', { ascending: false }).order('total_spent', { ascending: false })
      break
    case 'spent':
      query = query.order('total_spent', { ascending: false })
      break
    case 'recent':
      query = query.order('last_purchase_at', { ascending: false, nullsFirst: false })
      break
    default:
      query = query.order('name')
  }

  const { data, error, count } = await query.range(from, from + filters.pageSize - 1).returns<SummaryRow[]>()
  if (error) throw error
  return { rows: data.map(mapSummary), total: count ?? 0 }
}

export async function getCustomer(id: string): Promise<CustomerSummary> {
  const { data, error } = await supabase.from('customer_summaries').select('*').eq('id', id).single<SummaryRow>()
  if (error) throw error
  return mapSummary(data)
}

function toRow(input: CustomerInput) {
  return {
    name: input.name,
    business_name: input.businessName,
    customer_type: input.customerType,
    phone: input.phone,
    address: input.address,
    notes: input.notes,
    is_active: input.isActive,
  }
}

export async function createCustomer(input: CustomerInput): Promise<string> {
  const { data, error } = await supabase.from('customers').insert(toRow(input)).select('id').single<{ id: string }>()
  if (error) throw error
  return data.id
}

export async function updateCustomer(id: string, input: CustomerInput): Promise<void> {
  const { error } = await supabase.from('customers').update(toRow(input)).eq('id', id)
  if (error) throw error
}

/** Opciones ligeras para selectores (ventas, pedidos). */
export interface CustomerOption {
  id: string
  name: string
  businessName: string | null
  phone: string | null
  customerType: CustomerType
}

export async function listCustomerOptions(): Promise<CustomerOption[]> {
  const { data, error } = await supabase
    .from('customers')
    .select('id, name, business_name, phone, customer_type')
    .eq('is_active', true)
    .order('name')
    .returns<{ id: string; name: string; business_name: string | null; phone: string | null; customer_type: CustomerType }[]>()
  if (error) throw error
  return data.map((row) => ({ id: row.id, name: row.name, businessName: row.business_name, phone: row.phone, customerType: row.customer_type }))
}

// ---------------------------------------------------------------------
// Historial de compras
// ---------------------------------------------------------------------

export async function listCustomerSales(customerId: string, limit = 20): Promise<CustomerSale[]> {
  const { data, error } = await supabase
    .from('sales')
    .select('id, code, total, status, created_at, sale_items(quantity)')
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false })
    .limit(limit)
    .returns<{ id: string; code: string; total: number; status: SaleStatus; created_at: string; sale_items: { quantity: number }[] }[]>()
  if (error) throw error
  return data.map((row) => ({
    id: row.id,
    code: row.code,
    total: Number(row.total),
    status: row.status,
    itemCount: row.sale_items.reduce((sum, item) => sum + item.quantity, 0),
    createdAt: row.created_at,
  }))
}

// ---------------------------------------------------------------------
// Consultas y seguimientos (RF-35)
// ---------------------------------------------------------------------

export async function listInteractions(customerId: string): Promise<Interaction[]> {
  const { data, error } = await supabase
    .from('customer_interactions')
    .select('id, type, notes, follow_up_at, completed, created_at, author:profiles(full_name, email)')
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false })
    .returns<
      {
        id: string
        type: InteractionType
        notes: string
        follow_up_at: string | null
        completed: boolean
        created_at: string
        author: { full_name: string; email: string | null } | null
      }[]
    >()
  if (error) throw error
  return data.map((row) => ({
    id: row.id,
    type: row.type,
    notes: row.notes,
    followUpAt: row.follow_up_at,
    completed: row.completed,
    authorName: row.author?.full_name || row.author?.email || null,
    createdAt: row.created_at,
  }))
}

export async function createInteraction(input: InteractionInput): Promise<void> {
  const { error } = await supabase.from('customer_interactions').insert({
    customer_id: input.customerId,
    type: input.type,
    notes: input.notes,
    follow_up_at: input.followUpAt,
  })
  if (error) throw error
}

export async function setInteractionCompleted(id: string, completed: boolean): Promise<void> {
  const { error } = await supabase.from('customer_interactions').update({ completed }).eq('id', id)
  if (error) throw error
}

export async function deleteInteraction(id: string): Promise<void> {
  const { error } = await supabase.from('customer_interactions').delete().eq('id', id)
  if (error) throw error
}
