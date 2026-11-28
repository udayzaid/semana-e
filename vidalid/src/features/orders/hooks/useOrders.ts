import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { PaymentInput } from '@/features/sales/types'
import { createOrder, deliverOrder, getOrder, getOrderStatusCounts, listOrders, updateOrderStatus } from '../services/orders.service'
import type { NewOrderInput, OrderFilters, OrderStatus } from '../types'

export const orderKeys = {
  all: ['orders'] as const,
  list: (filters: OrderFilters) => ['orders', 'list', filters] as const,
  detail: (id: string) => ['orders', 'detail', id] as const,
  counts: ['orders', 'counts'] as const,
}

export function useOrders(filters: OrderFilters) {
  return useQuery({ queryKey: orderKeys.list(filters), queryFn: () => listOrders(filters), placeholderData: keepPreviousData })
}

export function useOrder(id: string | null) {
  return useQuery({ queryKey: orderKeys.detail(id ?? ''), queryFn: () => getOrder(id!), enabled: !!id })
}

export function useOrderStatusCounts() {
  return useQuery({ queryKey: orderKeys.counts, queryFn: getOrderStatusCounts })
}

/** Los pedidos cambian reservas de stock y, al entregarse, generan ventas. */
function useInvalidateOrders() {
  const queryClient = useQueryClient()
  return () => {
    for (const key of [['orders'], ['products'], ['inventory'], ['sales'], ['customers']]) {
      void queryClient.invalidateQueries({ queryKey: key })
    }
  }
}

export function useCreateOrder() {
  const invalidate = useInvalidateOrders()
  return useMutation({ mutationFn: (input: NewOrderInput) => createOrder(input), onSuccess: invalidate })
}

export function useUpdateOrderStatus() {
  const invalidate = useInvalidateOrders()
  return useMutation({
    mutationFn: ({ id, status, note, assignedTo }: { id: string; status: OrderStatus; note?: string | null; assignedTo?: string | null }) =>
      updateOrderStatus(id, status, note, assignedTo),
    onSuccess: invalidate,
  })
}

export function useDeliverOrder() {
  const invalidate = useInvalidateOrders()
  return useMutation({
    mutationFn: ({ id, payments, discount, note }: { id: string; payments: PaymentInput[]; discount: number; note: string | null }) =>
      deliverOrder(id, payments, discount, note),
    onSuccess: invalidate,
  })
}
