import { supabase } from '@/services/supabase/client'
import type { Category, CategoryInput } from '../types'

interface CategoryRow {
  id: string
  name: string
  description: string | null
  is_active: boolean
  products: { count: number }[]
}

const columns = 'id, name, description, is_active, products(count)'

function mapCategory(row: CategoryRow): Category {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    isActive: row.is_active,
    productCount: row.products?.[0]?.count ?? 0,
  }
}

function toRow(input: CategoryInput) {
  return { name: input.name, description: input.description, is_active: input.isActive }
}

export async function listCategories(): Promise<Category[]> {
  const { data, error } = await supabase.from('categories').select(columns).order('name').returns<CategoryRow[]>()
  if (error) throw error
  return data.map(mapCategory)
}

export async function createCategory(input: CategoryInput): Promise<Category> {
  const { data, error } = await supabase.from('categories').insert(toRow(input)).select(columns).single<CategoryRow>()
  if (error) throw error
  return mapCategory(data)
}

/** Elimina una categoría sin productos (si tiene, la base de datos lo impide). */
export async function deleteCategory(id: string): Promise<void> {
  const { error } = await supabase.from('categories').delete().eq('id', id)
  if (error) throw error
}

export async function updateCategory(id: string, input: Partial<CategoryInput>): Promise<Category> {
  const row: Record<string, unknown> = {}
  if (input.name !== undefined) row.name = input.name
  if (input.description !== undefined) row.description = input.description
  if (input.isActive !== undefined) row.is_active = input.isActive

  const { data, error } = await supabase.from('categories').update(row).eq('id', id).select(columns).single<CategoryRow>()
  if (error) throw error
  return mapCategory(data)
}
