import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createProduct,
  deleteProduct,
  deleteProductImage,
  listProducts,
  setProductActive,
  updateProduct,
  uploadProductImage,
} from '../services/products.service'
import type { ProductFilters, ProductInput } from '../types'
import { categoryKeys } from './useCategories'

export const productKeys = {
  all: ['products'] as const,
  list: (filters: ProductFilters) => ['products', 'list', filters] as const,
}

export function useProducts(filters: ProductFilters) {
  return useQuery({
    queryKey: productKeys.list(filters),
    queryFn: () => listProducts(filters),
    placeholderData: keepPreviousData,
  })
}

interface SaveProductArgs {
  id?: string
  input: Omit<ProductInput, 'imagePath'>
  /** Ruta de la imagen actual (al editar). */
  currentImagePath: string | null
  /** Nueva imagen elegida, o null si no se cambia. */
  newImage: File | null
  /** true si el usuario quitó la imagen. */
  removeImage: boolean
}

export function useSaveProduct() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, input, currentImagePath, newImage, removeImage }: SaveProductArgs) => {
      let imagePath = removeImage ? null : currentImagePath
      let uploadedPath: string | null = null

      if (newImage) {
        uploadedPath = await uploadProductImage(newImage)
        imagePath = uploadedPath
      }

      try {
        const data = { ...input, imagePath }
        const product = id ? await updateProduct(id, data) : await createProduct(data)
        // La imagen anterior ya no se usa: se borra después de guardar.
        if (currentImagePath && currentImagePath !== imagePath) void deleteProductImage(currentImagePath)
        return product
      } catch (error) {
        // Si falla el guardado, no dejar la imagen nueva huérfana.
        if (uploadedPath) void deleteProductImage(uploadedPath)
        throw error
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: productKeys.all })
      void queryClient.invalidateQueries({ queryKey: categoryKeys.all })
    },
  })
}

export function useDeleteProduct() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, imagePath }: { id: string; imagePath: string | null }) => {
      await deleteProduct(id)
      if (imagePath) void deleteProductImage(imagePath)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: productKeys.all })
      void queryClient.invalidateQueries({ queryKey: categoryKeys.all })
    },
  })
}

export function useToggleProduct() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => setProductActive(id, isActive),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: productKeys.all }),
  })
}
