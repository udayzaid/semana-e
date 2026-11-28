import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

export interface PortalCartItem {
  productId: string
  name: string
  unitPrice: number
  imagePath: string | null
  unit: string
  quantity: number
}

interface PortalCartState {
  items: PortalCartItem[]
  add: (item: Omit<PortalCartItem, 'quantity'>, quantity?: number, max?: number) => void
  setQuantity: (productId: string, quantity: number, max?: number) => void
  remove: (productId: string) => void
  clear: () => void
}

const MAX_PER_PRODUCT = 100

/** Almacenamiento seguro: si el navegador bloquea localStorage, el carrito funciona en memoria. */
const safeStorage = createJSONStorage(() => {
  try {
    const test = '__vidalid_test__'
    localStorage.setItem(test, test)
    localStorage.removeItem(test)
    return localStorage
  } catch {
    const memory = new Map<string, string>()
    return {
      getItem: (key: string) => memory.get(key) ?? null,
      setItem: (key: string, value: string) => void memory.set(key, value),
      removeItem: (key: string) => void memory.delete(key),
    }
  }
})

const clamp = (quantity: number, max?: number) => Math.max(1, Math.min(Math.floor(quantity) || 1, max ?? MAX_PER_PRODUCT, MAX_PER_PRODUCT))

/**
 * Carrito del portal del cliente. Se guarda en el navegador del visitante para no
 * perderlo al recargar. Los precios se vuelven a leer del catálogo al mostrarlo y
 * la base de datos los recalcula al enviar la solicitud.
 */
export const usePortalCart = create<PortalCartState>()(
  persist(
    (set, get) => ({
      items: [],
      add: (item, quantity = 1, max) => {
        const existing = get().items.find((current) => current.productId === item.productId)
        if (existing) {
          set({ items: get().items.map((current) => (current.productId === item.productId ? { ...current, ...item, quantity: clamp(current.quantity + quantity, max) } : current)) })
        } else {
          set({ items: [...get().items, { ...item, quantity: clamp(quantity, max) }] })
        }
      },
      setQuantity: (productId, quantity, max) =>
        set({ items: get().items.map((item) => (item.productId === productId ? { ...item, quantity: clamp(quantity, max) } : item)) }),
      remove: (productId) => set({ items: get().items.filter((item) => item.productId !== productId) }),
      clear: () => set({ items: [] }),
    }),
    { name: 'vidalid-portal-cart', storage: safeStorage, version: 1 },
  ),
)
