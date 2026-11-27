import type { PostgrestError } from '@supabase/supabase-js'

/** Mensajes para restricciones de unicidad, por nombre de índice o restricción. */
const uniqueMessages: Record<string, string> = {
  products_sku_key: 'Ya existe un producto con ese SKU.',
  categories_name_key: 'Ya existe una categoría con ese nombre.',
}

function isPostgrestError(error: unknown): error is PostgrestError {
  return typeof error === 'object' && error !== null && 'code' in error && 'message' in error
}

/**
 * Convierte errores de Supabase/PostgreSQL en mensajes claros en español.
 * Las funciones de la base de datos ya lanzan sus mensajes en español (P0001, P0002, 22023).
 */
export function toUserMessage(
  error: unknown,
  fallback = 'Ocurrió un error inesperado. Inténtalo de nuevo.',
  options: { foreignKey?: string } = {},
): string {
  if (isPostgrestError(error)) {
    switch (error.code) {
      case '23505': {
        const key = Object.keys(uniqueMessages).find((name) => error.message.includes(name))
        return key ? uniqueMessages[key]! : 'Ya existe un registro con esos datos.'
      }
      case '23503':
        return options.foreignKey ?? 'No se puede completar: el registro está relacionado con otros datos.'
      case '23514':
        return 'Algún valor no es válido. Revisa los datos ingresados.'
      case '42501':
        return error.message.startsWith('No tienes') ? error.message : 'No tienes permisos para realizar esta operación.'
      case 'P0001':
      case 'P0002':
      case '22023':
        return error.message
      case 'PGRST116':
        return 'No se encontró el registro.'
    }
    return fallback
  }
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return 'No se pudo conectar con el servidor. Revisa tu conexión.'
  }
  if (error instanceof Error && error.message) return error.message
  return fallback
}
