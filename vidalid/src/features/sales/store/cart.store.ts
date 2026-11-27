import { create } from 'zustand'
import type { ProductOption } from '@/features/products/services/products.service'
import type { CartLine } from '../types'

interface CartState {
  customerId: string | null
  lines: CartLine[]
  setCustomer: (customerId: string | null) => void
  addProduct: (product: ProductOption) => 'added' | 'incremented' | 'no-stock'
  setQuantity: (productId: string, quantity: number) => void
  remove: (productId: string) => void
  clear: () => void
}

/**
 * Carrito de la venta en curso. Vive en memoria (Zustand) para no perderlo
 * al cambiar de página dentro del panel. Los precios son referenciales:
 * el total real lo calcula la base de datos al registrar la venta.
 */
export const useCartStore = create<CartState>()((set, get) => ({
  customerId: null,
  lines: [],

  setCustomer: (customerId) => set({ customerId }),

  addProduct: (product) => {
    if (product.availableStock <= 0) return 'no-stock'
    const existing = get().lines.find((line) => line.productId === product.id)
    if (existing) {
      set({
        lines: get().lines.map((line) =>
          line.productId === product.id
            ? { ...line, available: product.availableStock, quantity: Math.min(line.quantity + 1, product.availableStock) }
            : line,
        ),
      })
      return 'incremented'
    }
    set({
      lines: [
        ...get().lines,
        {
          productId: product.id,
          name: product.name,
          sku: product.sku,
          unit: product.unit,
          unitPrice: product.salePrice,
          quantity: 1,
          available: product.availableStock,
        },
      ],
    })
    return 'added'
  },

  setQuantity: (productId, quantity) =>
    set({
      lines: get().lines.map((line) =>
        line.productId === productId ? { ...line, quantity: Math.max(1, Math.min(Math.floor(quantity) || 1, line.available)) } : line,
      ),
    }),

  remove: (productId) => set({ lines: get().lines.filter((line) => line.productId !== productId) }),

  clear: () => set({ customerId: null, lines: [] }),
}))
