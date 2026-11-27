import type { CustomerType, SaleStatus } from '@/types/database'

export interface CustomerSummary {
  id: string
  name: string
  businessName: string | null
  customerType: CustomerType
  phone: string | null
  address: string | null
  notes: string | null
  isActive: boolean
  createdAt: string
  purchaseCount: number
  totalSpent: number
  firstPurchaseAt: string | null
  lastPurchaseAt: string | null
  avgDaysBetweenPurchases: number | null
  pendingFollowUps: number
  nextFollowUpAt: string | null
}

export type CustomerSort = 'name' | 'purchases' | 'spent' | 'recent'
export type CustomerTypeFilter = 'all' | CustomerType
export type CustomerStatusFilter = 'active' | 'inactive' | 'follow_up' | 'all'

export interface CustomerFilters {
  search: string
  type: CustomerTypeFilter
  status: CustomerStatusFilter
  sort: CustomerSort
  page: number
  pageSize: number
}

export interface CustomerInput {
  name: string
  businessName: string | null
  customerType: CustomerType
  phone: string | null
  address: string | null
  notes: string | null
  isActive: boolean
}

export interface CustomerSale {
  id: string
  code: string
  total: number
  status: SaleStatus
  itemCount: number
  createdAt: string
}

export type InteractionType = 'whatsapp' | 'call' | 'visit' | 'note' | 'follow_up'

export interface Interaction {
  id: string
  type: InteractionType
  notes: string
  followUpAt: string | null
  completed: boolean
  authorName: string | null
  createdAt: string
}

export interface InteractionInput {
  customerId: string
  type: InteractionType
  notes: string
  followUpAt: string | null
}

export const customerTypeLabels: Record<CustomerType, string> = {
  retailer: 'Comerciante minorista',
  final_consumer: 'Consumidor final',
}

export const interactionLabels: Record<InteractionType, string> = {
  whatsapp: 'WhatsApp',
  call: 'Llamada',
  visit: 'Visita',
  note: 'Nota',
  follow_up: 'Seguimiento',
}
