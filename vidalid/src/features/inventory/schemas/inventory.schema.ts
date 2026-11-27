import { format } from 'date-fns'
import { z } from 'zod'

const quantity = (label = 'La cantidad') =>
  z.coerce
    .number({ error: `${label} debe ser un número.` })
    .int(`${label} debe ser un número entero.`)
    .positive(`${label} debe ser mayor a cero.`)
    .max(1_000_000, `${label} es demasiado alta.`)

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Máximo ${max} caracteres.`)
    .transform((value) => value || null)

export const stockEntrySchema = z.object({
  productId: z.string().min(1, 'Selecciona un producto.'),
  quantity: quantity(),
  lotCode: optionalText(60),
  expiresAt: z
    .string()
    .transform((value) => value || null)
    .refine((value) => !value || value >= format(new Date(), 'yyyy-MM-dd'), 'La fecha de vencimiento ya pasó.'),
  unitCost: z
    .union([z.literal(''), z.coerce.number({ error: 'El costo debe ser un número.' }).min(0, 'El costo no puede ser negativo.')])
    .transform((value) => (value === '' ? null : value)),
  reason: optionalText(300),
})

export const stockExitSchema = z.object({
  productId: z.string().min(1, 'Selecciona un producto.'),
  quantity: quantity(),
  batchId: z.string(),
  reason: z.string().trim().min(3, 'Indica el motivo de la salida.').max(300, 'Máximo 300 caracteres.'),
})

export const stockAdjustSchema = z.object({
  countedQuantity: z.coerce
    .number({ error: 'La cantidad debe ser un número.' })
    .int('La cantidad debe ser un número entero.')
    .min(0, 'La cantidad no puede ser negativa.'),
  reason: z.string().trim().min(3, 'Indica el motivo del ajuste.').max(300, 'Máximo 300 caracteres.'),
})

export type StockEntryFormInput = z.input<typeof stockEntrySchema>
export type StockEntryFormValues = z.output<typeof stockEntrySchema>
export type StockExitFormInput = z.input<typeof stockExitSchema>
export type StockExitFormValues = z.output<typeof stockExitSchema>
export type StockAdjustFormInput = z.input<typeof stockAdjustSchema>
export type StockAdjustFormValues = z.output<typeof stockAdjustSchema>

export const EXIT_REASONS = ['Producto vencido', 'Producto dañado', 'Muestra gratis', 'Uso interno', 'Pérdida o robo', 'Devolución a proveedor']
export const ADJUST_REASONS = ['Conteo físico', 'Error de registro', 'Diferencia de inventario']
