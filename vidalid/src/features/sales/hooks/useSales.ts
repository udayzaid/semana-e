import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getSale, getSalesSummary, listSales, registerSale, voidSale } from '../services/sales.service'
import type { SaleFilters, SaleInput } from '../types'

export const saleKeys = {
  all: ['sales'] as const,
  list: (filters: SaleFilters) => ['sales', 'list', filters] as const,
  detail: (id: string) => ['sales', 'detail', id] as const,
  summary: (from: string, to: string) => ['sales', 'summary', from, to] as const,
}

export function useSales(filters: SaleFilters) {
  return useQuery({ queryKey: saleKeys.list(filters), queryFn: () => listSales(filters), placeholderData: keepPreviousData })
}

export function useSale(id: string | null) {
  return useQuery({ queryKey: saleKeys.detail(id ?? ''), queryFn: () => getSale(id!), enabled: !!id })
}

export function useSalesSummary(from: Date, to: Date) {
  return useQuery({
    queryKey: saleKeys.summary(from.toISOString(), to.toISOString()),
    queryFn: () => getSalesSummary(from, to),
  })
}

/** Una venta cambia stock, lotes, movimientos y estadísticas de clientes. */
function useInvalidateAfterSale() {
  const queryClient = useQueryClient()
  return () => {
    for (const key of [['sales'], ['products'], ['inventory'], ['customers']]) {
      void queryClient.invalidateQueries({ queryKey: key })
    }
  }
}

export function useRegisterSale() {
  const invalidate = useInvalidateAfterSale()
  return useMutation({ mutationFn: (input: SaleInput) => registerSale(input), onSuccess: invalidate })
}

export function useVoidSale() {
  const invalidate = useInvalidateAfterSale()
  return useMutation({ mutationFn: ({ id, reason }: { id: string; reason: string }) => voidSale(id, reason), onSuccess: invalidate })
}
