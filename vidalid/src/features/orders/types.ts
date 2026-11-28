export type OrderStatus = 'pending' | 'confirmed' | 'preparing' | 'ready' | 'dispatched' | 'delivered' | 'cancelled'
export type OrderSource = 'whatsapp' | 'manual' | 'web'
export type DeliveryMode = 'delivery' | 'pickup'

/** "active" = todo lo que no está entregado ni cancelado; "dispatch" = lo que distribución debe atender. */
export type OrderStatusFilter = 'all' | 'active' | 'dispatch' | OrderStatus

export interface OrderListItem {
  id: string
  code: string
  status: OrderStatus
  source: OrderSource
  deliveryMode: DeliveryMode
  contactName: string
  contactPhone: string
  customerName: string | null
  subtotal: number
  itemCount: number
  assignedTo: string | null
  createdAt: string
}

export interface OrderFilters {
  status: OrderStatusFilter
  search: string
  source: OrderSource | null
  page: number
  pageSize: number
}

export interface OrderDetail extends OrderListItem {
  customerId: string | null
  deliveryAddress: string | null
  notes: string | null
  cancelReason: string | null
  saleId: string | null
  items: { productId: string; name: string; sku: string; unit: string; quantity: number; unitPrice: number; total: number; availableStock: number }[]
  events: { id: number; fromStatus: OrderStatus | null; toStatus: OrderStatus; note: string | null; authorName: string | null; createdAt: string }[]
}

export interface NewOrderInput {
  items: { productId: string; quantity: number }[]
  deliveryMode: DeliveryMode
  source: Exclude<OrderSource, 'web'>
  customerId: string | null
  contactName: string | null
  contactPhone: string | null
  address: string | null
  notes: string | null
}

export const statusLabels: Record<OrderStatus, string> = {
  pending: 'Pendiente',
  confirmed: 'Confirmado',
  preparing: 'En preparación',
  ready: 'Listo para recoger',
  dispatched: 'Enviado',
  delivered: 'Entregado',
  cancelled: 'Cancelado',
}

export const statusStyles: Record<OrderStatus, string> = {
  pending: 'bg-warning/12 text-warning',
  confirmed: 'bg-chart-5/12 text-chart-5',
  preparing: 'bg-chart-5/12 text-chart-5',
  ready: 'bg-success/10 text-success',
  dispatched: 'bg-success/10 text-success',
  delivered: 'bg-muted text-foreground',
  cancelled: 'bg-destructive/10 text-destructive',
}

export const sourceLabels: Record<OrderSource, string> = {
  whatsapp: 'WhatsApp',
  manual: 'Manual',
  web: 'Portal web',
}

export const modeLabels: Record<DeliveryMode, string> = {
  delivery: 'Envío',
  pickup: 'Recogida en almacén',
}

export const ACTIVE_STATUSES: OrderStatus[] = ['pending', 'confirmed', 'preparing', 'ready', 'dispatched']
export const DISPATCH_STATUSES: OrderStatus[] = ['confirmed', 'preparing', 'ready', 'dispatched']
