import { supabase } from '@/services/supabase/client'
import type { CustomerType, SaleStatus } from '@/types/database'
import type { DeliveryMode, OrderStatus } from '@/features/orders/types'

/** Ficha del cliente con sesión (RLS solo devuelve la suya). */
export interface MyCustomer {
  id: string
  name: string
  businessName: string | null
  phone: string | null
  address: string | null
  customerType: CustomerType
}

export async function getMyCustomer(): Promise<MyCustomer | null> {
  const { data, error } = await supabase
    .from('customers')
    .select('id, name, business_name, phone, address, customer_type')
    .maybeSingle<{ id: string; name: string; business_name: string | null; phone: string | null; address: string | null; customer_type: CustomerType }>()
  if (error) throw error
  if (!data) return null
  return { id: data.id, name: data.name, businessName: data.business_name, phone: data.phone, address: data.address, customerType: data.customer_type }
}

export async function updateMyProfile(input: { name: string; businessName: string | null; phone: string | null; address: string | null }): Promise<void> {
  const { error } = await supabase.rpc('update_my_customer_profile', {
    p_name: input.name,
    p_business_name: input.businessName,
    p_phone: input.phone,
    p_address: input.address,
  })
  if (error) throw error
}

export interface MyOrder {
  id: string
  code: string
  status: OrderStatus
  deliveryMode: DeliveryMode
  subtotal: number
  itemCount: number
  createdAt: string
}

export async function listMyOrders(): Promise<MyOrder[]> {
  const { data, error } = await supabase
    .from('orders')
    .select('id, code, status, delivery_mode, subtotal, created_at, order_items(quantity)')
    .order('created_at', { ascending: false })
    .limit(30)
    .returns<{ id: string; code: string; status: OrderStatus; delivery_mode: DeliveryMode; subtotal: number; created_at: string; order_items: { quantity: number }[] }[]>()
  if (error) throw error
  return data.map((row) => ({
    id: row.id,
    code: row.code,
    status: row.status,
    deliveryMode: row.delivery_mode,
    subtotal: Number(row.subtotal),
    itemCount: row.order_items.reduce((sum, item) => sum + item.quantity, 0),
    createdAt: row.created_at,
  }))
}

export interface MyPurchase {
  id: string
  code: string
  status: SaleStatus
  total: number
  itemCount: number
  createdAt: string
}

export async function listMyPurchases(): Promise<MyPurchase[]> {
  const { data, error } = await supabase
    .from('sales')
    .select('id, code, status, total, created_at, sale_items(quantity)')
    .order('created_at', { ascending: false })
    .limit(30)
    .returns<{ id: string; code: string; status: SaleStatus; total: number; created_at: string; sale_items: { quantity: number }[] }[]>()
  if (error) throw error
  return data.map((row) => ({
    id: row.id,
    code: row.code,
    status: row.status,
    total: Number(row.total),
    itemCount: row.sale_items.reduce((sum, item) => sum + item.quantity, 0),
    createdAt: row.created_at,
  }))
}
