import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  adjustStock,
  getInventorySummary,
  listBatches,
  listMovements,
  listProductBatches,
  registerStockEntry,
  registerStockExit,
} from '../services/inventory.service'
import type { BatchFilter, MovementFilters, StockAdjustInput, StockEntryInput, StockExitInput } from '../types'

export const inventoryKeys = {
  all: ['inventory'] as const,
  summary: ['inventory', 'summary'] as const,
  batches: (params: object) => ['inventory', 'batches', params] as const,
  productBatches: (productId: string) => ['inventory', 'product-batches', productId] as const,
  movements: (filters: MovementFilters) => ['inventory', 'movements', filters] as const,
}

export function useInventorySummary() {
  return useQuery({ queryKey: inventoryKeys.summary, queryFn: getInventorySummary })
}

export function useBatches(params: { filter: BatchFilter; productId: string | null; page: number; pageSize: number }) {
  return useQuery({
    queryKey: inventoryKeys.batches(params),
    queryFn: () => listBatches(params),
    placeholderData: keepPreviousData,
  })
}

export function useProductBatches(productId: string | null) {
  return useQuery({
    queryKey: inventoryKeys.productBatches(productId ?? ''),
    queryFn: () => listProductBatches(productId!),
    enabled: !!productId,
  })
}

export function useMovements(filters: MovementFilters) {
  return useQuery({
    queryKey: inventoryKeys.movements(filters),
    queryFn: () => listMovements(filters),
    placeholderData: keepPreviousData,
  })
}

/** Tras cualquier operación de stock se refresca inventario y productos. */
function useInvalidateStock() {
  const queryClient = useQueryClient()
  return () => {
    void queryClient.invalidateQueries({ queryKey: inventoryKeys.all })
    void queryClient.invalidateQueries({ queryKey: ['products'] })
  }
}

export function useStockEntry() {
  const invalidate = useInvalidateStock()
  return useMutation({ mutationFn: (input: StockEntryInput) => registerStockEntry(input), onSuccess: invalidate })
}

export function useStockExit() {
  const invalidate = useInvalidateStock()
  return useMutation({ mutationFn: (input: StockExitInput) => registerStockExit(input), onSuccess: invalidate })
}

export function useStockAdjust() {
  const invalidate = useInvalidateStock()
  return useMutation({ mutationFn: (input: StockAdjustInput) => adjustStock(input), onSuccess: invalidate })
}
