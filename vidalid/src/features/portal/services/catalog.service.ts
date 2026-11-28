import { supabase } from '@/services/supabase/client'
import type { Paginated } from '@/types/database'

/** Producto del catálogo público (vista catalog_products: sin costos, solo activos). */
export interface CatalogProduct {
  id: string
  sku: string
  name: string
  description: string | null
  categoryId: string
  categoryName: string
  imagePath: string | null
  unit: string
  salePrice: number
  availableStock: number
  inStock: boolean
}

export interface CatalogCategory {
  id: string
  name: string
  description: string | null
}

interface CatalogRow {
  id: string
  sku: string
  name: string
  description: string | null
  category_id: string
  category_name: string
  image_path: string | null
  unit: string
  sale_price: number
  available_stock: number
  in_stock: boolean
}

const columns = 'id, sku, name, description, category_id, category_name, image_path, unit, sale_price, available_stock, in_stock'

function mapRow(row: CatalogRow): CatalogProduct {
  return {
    id: row.id,
    sku: row.sku,
    name: row.name,
    description: row.description,
    categoryId: row.category_id,
    categoryName: row.category_name,
    imagePath: row.image_path,
    unit: row.unit,
    salePrice: Number(row.sale_price),
    availableStock: row.available_stock,
    inStock: row.in_stock,
  }
}

export interface CatalogFilters {
  search: string
  categoryId: string | null
  onlyInStock: boolean
  sort: 'name' | 'price_asc' | 'price_desc'
  page: number
  pageSize: number
}

export async function listCatalog(filters: CatalogFilters): Promise<Paginated<CatalogProduct>> {
  const from = (filters.page - 1) * filters.pageSize
  let query = supabase.from('catalog_products').select(columns, { count: 'exact' })

  const search = filters.search.replace(/[%,()*\\]/g, ' ').trim()
  if (search) query = query.or(`name.ilike.%${search}%,sku.ilike.%${search}%,description.ilike.%${search}%`)
  if (filters.categoryId) query = query.eq('category_id', filters.categoryId)
  if (filters.onlyInStock) query = query.eq('in_stock', true)

  if (filters.sort === 'price_asc') query = query.order('sale_price', { ascending: true })
  else if (filters.sort === 'price_desc') query = query.order('sale_price', { ascending: false })
  else query = query.order('in_stock', { ascending: false }).order('name')

  const { data, error, count } = await query.range(from, from + filters.pageSize - 1).returns<CatalogRow[]>()
  if (error) throw error
  return { rows: data.map(mapRow), total: count ?? 0 }
}

export async function getCatalogProduct(id: string): Promise<CatalogProduct | null> {
  const { data, error } = await supabase.from('catalog_products').select(columns).eq('id', id).maybeSingle<CatalogRow>()
  if (error) throw error
  return data ? mapRow(data) : null
}

/** Productos destacados: con stock, para la página de inicio. */
export async function listFeatured(limit = 8): Promise<CatalogProduct[]> {
  const { data, error } = await supabase.from('catalog_products').select(columns).eq('in_stock', true).order('name').limit(limit).returns<CatalogRow[]>()
  if (error) throw error
  return data.map(mapRow)
}

/** Resumen real del catálogo para la portada: totales y portada (foto) de cada línea. */
export interface CatalogOverview {
  totalProducts: number
  inStockProducts: number
  byCategory: Record<string, { count: number; coverImage: string | null }>
}

export async function getCatalogOverview(): Promise<CatalogOverview> {
  const { data, error } = await supabase
    .from('catalog_products')
    .select('category_id, image_path, in_stock')
    .limit(2000)
    .returns<{ category_id: string; image_path: string | null; in_stock: boolean }[]>()
  if (error) throw error

  const byCategory: CatalogOverview['byCategory'] = {}
  for (const row of data) {
    const entry = (byCategory[row.category_id] ??= { count: 0, coverImage: null })
    entry.count += 1
    if (!entry.coverImage && row.image_path) entry.coverImage = row.image_path
  }
  return { totalProducts: data.length, inStockProducts: data.filter((row) => row.in_stock).length, byCategory }
}

export async function listCatalogCategories(): Promise<CatalogCategory[]> {
  const { data, error } = await supabase.from('categories').select('id, name, description').eq('is_active', true).order('name').returns<CatalogCategory[]>()
  if (error) throw error
  return data
}

/** Datos actuales de los productos del carrito (precio y disponibilidad). */
export async function getCatalogProductsByIds(ids: string[]): Promise<CatalogProduct[]> {
  if (ids.length === 0) return []
  const { data, error } = await supabase.from('catalog_products').select(columns).in('id', ids).returns<CatalogRow[]>()
  if (error) throw error
  return data.map(mapRow)
}

export interface WebOrderInput {
  items: { productId: string; quantity: number }[]
  contactName: string
  contactPhone: string
  deliveryMode: 'delivery' | 'pickup'
  address: string | null
  notes: string | null
}

/** RF-79 · Envía la solicitud de pedido (sin cuenta). Devuelve el código PED-XXXXXX. */
export async function submitWebOrder(input: WebOrderInput): Promise<string> {
  const { data, error } = await supabase.rpc('submit_web_order', {
    p_items: input.items.map((item) => ({ product_id: item.productId, quantity: item.quantity })),
    p_contact_name: input.contactName,
    p_contact_phone: input.contactPhone,
    p_delivery_mode: input.deliveryMode,
    p_address: input.address,
    p_notes: input.notes,
  })
  if (error) throw error
  return data as string
}
