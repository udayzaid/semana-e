import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createCustomer,
  createInteraction,
  deleteInteraction,
  getCustomer,
  listCustomerOptions,
  listCustomerSales,
  listCustomers,
  listInteractions,
  setInteractionCompleted,
  updateCustomer,
} from '../services/customers.service'
import type { CustomerFilters, CustomerInput, InteractionInput } from '../types'

export const customerKeys = {
  all: ['customers'] as const,
  list: (filters: CustomerFilters) => ['customers', 'list', filters] as const,
  detail: (id: string) => ['customers', 'detail', id] as const,
  sales: (id: string) => ['customers', 'sales', id] as const,
  interactions: (id: string) => ['customers', 'interactions', id] as const,
  options: ['customers', 'options'] as const,
}

export function useCustomers(filters: CustomerFilters) {
  return useQuery({ queryKey: customerKeys.list(filters), queryFn: () => listCustomers(filters), placeholderData: keepPreviousData })
}

export function useCustomer(id: string | null) {
  return useQuery({ queryKey: customerKeys.detail(id ?? ''), queryFn: () => getCustomer(id!), enabled: !!id })
}

export function useCustomerOptions() {
  return useQuery({ queryKey: customerKeys.options, queryFn: listCustomerOptions })
}

export function useCustomerSales(id: string | null) {
  return useQuery({ queryKey: customerKeys.sales(id ?? ''), queryFn: () => listCustomerSales(id!), enabled: !!id })
}

export function useInteractions(id: string | null) {
  return useQuery({ queryKey: customerKeys.interactions(id ?? ''), queryFn: () => listInteractions(id!), enabled: !!id })
}

export function useSaveCustomer() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, input }: { id?: string; input: CustomerInput }) => {
      if (id) {
        await updateCustomer(id, input)
        return id
      }
      return createCustomer(input)
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: customerKeys.all }),
  })
}

/** Las interacciones afectan a los contadores de seguimiento de la lista. */
export function useAddInteraction() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: InteractionInput) => createInteraction(input),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: customerKeys.all }),
  })
}

export function useToggleInteraction() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, completed }: { id: string; completed: boolean }) => setInteractionCompleted(id, completed),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: customerKeys.all }),
  })
}

export function useDeleteInteraction() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteInteraction(id),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: customerKeys.all }),
  })
}
