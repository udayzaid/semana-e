export type StockStatus = 'ok' | 'low' | 'out'

export interface Category {
  id: string
  name: string
  description: string | null
  isActive: boolean
  productCount: number
}

export interface Product {
  id: string
  sku: string
  name: string
  description: string | null
  categoryId: string
  categoryName: string
  imagePath: string | null
  unit: string
  cost: number
  salePrice: number
  stock: number
  reservedStock: number
  availableStock: number
  minStock: number
  stockStatus: StockStatus
  isActive: boolean
  updatedAt: string
}

/** Filtro de estado en la lista de productos. */
export type ProductStatusFilter = 'all' | 'active' | 'inactive' | 'low' | 'out'

export interface ProductFilters {
  search: string
  categoryId: string | null
  status: ProductStatusFilter
  page: number
  pageSize: number
}

export type { Paginated } from '@/types/database'

/** Datos editables de un producto (stock nunca se edita aquí: se usa Inventario). */
export interface ProductInput {
  sku: string
  name: string
  description: string | null
  categoryId: string
  imagePath: string | null
  unit: string
  cost: number
  salePrice: number
  minStock: number
  isActive: boolean
}

export interface CategoryInput {
  name: string
  description: string | null
  isActive: boolean
}
