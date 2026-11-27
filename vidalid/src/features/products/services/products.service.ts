import { supabase } from '@/services/supabase/client'
import type { Paginated, Product, ProductFilters, ProductInput, StockStatus } from '../types'

const BUCKET = 'product-images'
export const MAX_IMAGE_BYTES = 2 * 1024 * 1024
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']

interface ProductRow {
  id: string
  sku: string
  name: string
  description: string | null
  category_id: string
  image_path: string | null
  unit: string
  cost: number
  sale_price: number
  stock: number
  reserved_stock: number
  available_stock: number
  min_stock: number
  stock_status: StockStatus
  is_active: boolean
  updated_at: string
  category: { name: string } | null
}

const columns =
  'id, sku, name, description, category_id, image_path, unit, cost, sale_price, stock, reserved_stock, available_stock, min_stock, stock_status, is_active, updated_at, category:categories(name)'

function mapProduct(row: ProductRow): Product {
  return {
    id: row.id,
    sku: row.sku,
    name: row.name,
    description: row.description,
    categoryId: row.category_id,
    categoryName: row.category?.name ?? '—',
    imagePath: row.image_path,
    unit: row.unit,
    cost: Number(row.cost),
    salePrice: Number(row.sale_price),
    stock: row.stock,
    reservedStock: row.reserved_stock,
    availableStock: row.available_stock,
    minStock: row.min_stock,
    stockStatus: row.stock_status,
    isActive: row.is_active,
    updatedAt: row.updated_at,
  }
}

// Solo columnas editables: stock y reserved_stock no tienen permiso de escritura.
function toRow(input: ProductInput) {
  return {
    sku: input.sku,
    name: input.name,
    description: input.description,
    category_id: input.categoryId,
    image_path: input.imagePath,
    unit: input.unit,
    cost: input.cost,
    sale_price: input.salePrice,
    min_stock: input.minStock,
    is_active: input.isActive,
  }
}

/** Quita los caracteres con significado especial en los filtros de PostgREST. */
function sanitizeSearch(value: string): string {
  return value.replace(/[%,()*\\]/g, ' ').trim()
}

export async function listProducts(filters: ProductFilters): Promise<Paginated<Product>> {
  const from = (filters.page - 1) * filters.pageSize
  const to = from + filters.pageSize - 1

  let query = supabase.from('products').select(columns, { count: 'exact' })

  const search = sanitizeSearch(filters.search)
  if (search) query = query.or(`name.ilike.%${search}%,sku.ilike.%${search}%`)
  if (filters.categoryId) query = query.eq('category_id', filters.categoryId)

  switch (filters.status) {
    case 'active':
      query = query.eq('is_active', true)
      break
    case 'inactive':
      query = query.eq('is_active', false)
      break
    case 'low':
    case 'out':
      query = query.eq('is_active', true).eq('stock_status', filters.status)
      break
  }

  const { data, error, count } = await query.order('name').range(from, to).returns<ProductRow[]>()
  if (error) throw error
  return { rows: data.map(mapProduct), total: count ?? 0 }
}

export async function createProduct(input: ProductInput): Promise<Product> {
  const { data, error } = await supabase.from('products').insert(toRow(input)).select(columns).single<ProductRow>()
  if (error) throw error
  return mapProduct(data)
}

export async function updateProduct(id: string, input: ProductInput): Promise<Product> {
  const { data, error } = await supabase.from('products').update(toRow(input)).eq('id', id).select(columns).single<ProductRow>()
  if (error) throw error
  return mapProduct(data)
}

export async function setProductActive(id: string, isActive: boolean): Promise<void> {
  const { error } = await supabase.from('products').update({ is_active: isActive }).eq('id', id)
  if (error) throw error
}

/**
 * Elimina un producto que nunca tuvo movimientos.
 * Si tiene historial (lotes, ventas), la base de datos lo impide (error 23503).
 */
export async function deleteProduct(id: string): Promise<void> {
  const { error } = await supabase.from('products').delete().eq('id', id)
  if (error) throw error
}

// ---------------------------------------------------------------------
// Imágenes (Supabase Storage)
// ---------------------------------------------------------------------

export function validateImage(file: File): string | null {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) return 'La imagen debe ser JPG, PNG o WEBP.'
  if (file.size > MAX_IMAGE_BYTES) return 'La imagen no debe superar los 2 MB.'
  return null
}

export async function uploadProductImage(file: File): Promise<string> {
  const problem = validateImage(file)
  if (problem) throw new Error(problem)

  const extension = file.type.split('/')[1]?.replace('jpeg', 'jpg') ?? 'jpg'
  const path = `products/${crypto.randomUUID()}.${extension}`
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: '31536000',
    contentType: file.type,
    upsert: false,
  })
  if (error) throw new Error('No se pudo subir la imagen. Inténtalo de nuevo.')
  return path
}

/** Borra una imagen que ya no se usa. Si falla, no interrumpe la operación principal. */
export async function deleteProductImage(path: string): Promise<void> {
  await supabase.storage.from(BUCKET).remove([path])
}

export function getProductImageUrl(path: string | null): string | null {
  if (!path) return null
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl
}
