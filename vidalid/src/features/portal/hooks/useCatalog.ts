import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  getCatalogProduct,
  getCatalogProductsByIds,
  listCatalog,
  listCatalogCategories,
  listFeatured,
  submitWebOrder,
  type CatalogFilters,
  type WebOrderInput,
} from '../services/catalog.service'

export const catalogKeys = {
  all: ['catalog'] as const,
  list: (filters: CatalogFilters) => ['catalog', 'list', filters] as const,
  detail: (id: string) => ['catalog', 'detail', id] as const,
  featured: ['catalog', 'featured'] as const,
  categories: ['catalog', 'categories'] as const,
  byIds: (ids: string[]) => ['catalog', 'by-ids', ids] as const,
}

export function useCatalog(filters: CatalogFilters) {
  return useQuery({ queryKey: catalogKeys.list(filters), queryFn: () => listCatalog(filters), placeholderData: keepPreviousData })
}

export function useCatalogProduct(id: string | undefined) {
  return useQuery({ queryKey: catalogKeys.detail(id ?? ''), queryFn: () => getCatalogProduct(id!), enabled: !!id })
}

export function useFeaturedProducts() {
  return useQuery({ queryKey: catalogKeys.featured, queryFn: () => listFeatured(8) })
}

export function useCatalogCategories() {
  return useQuery({ queryKey: catalogKeys.categories, queryFn: listCatalogCategories, staleTime: 5 * 60_000 })
}

export function useCartProducts(ids: string[]) {
  const sorted = [...ids].sort()
  return useQuery({ queryKey: catalogKeys.byIds(sorted), queryFn: () => getCatalogProductsByIds(sorted), enabled: sorted.length > 0 })
}

export function useSubmitWebOrder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: WebOrderInput) => submitWebOrder(input),
    // El pedido aparece en "Mis pedidos" y cambia la disponibilidad del catálogo.
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['account'] })
      void queryClient.invalidateQueries({ queryKey: catalogKeys.all })
    },
  })
}
