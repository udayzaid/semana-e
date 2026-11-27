import { z } from 'zod'

const money = (label: string) =>
  z.coerce
    .number({ error: `${label} debe ser un número.` })
    .min(0, `${label} no puede ser negativo.`)
    .max(9_999_999, `${label} es demasiado alto.`)
    .refine((value) => Math.abs(value * 100 - Math.round(value * 100)) < 1e-6, {
      message: `${label} admite como máximo 2 decimales.`,
    })

// Las mismas reglas que las restricciones CHECK de la tabla products.
export const productSchema = z.object({
  name: z.string().trim().min(2, 'El nombre debe tener al menos 2 caracteres.').max(120, 'Máximo 120 caracteres.'),
  sku: z
    .string()
    .trim()
    .toUpperCase()
    .min(2, 'El SKU debe tener al menos 2 caracteres.')
    .max(40, 'Máximo 40 caracteres.')
    .regex(/^[A-Z0-9][A-Z0-9-]*$/, 'Usa solo letras, números y guiones (ej. VID-001).'),
  categoryId: z.string().min(1, 'Selecciona una categoría.'),
  unit: z.string().trim().min(1, 'Indica la unidad de medida.').max(30, 'Máximo 30 caracteres.'),
  description: z
    .string()
    .trim()
    .max(2000, 'Máximo 2000 caracteres.')
    .transform((value) => value || null),
  cost: money('El costo'),
  salePrice: money('El precio'),
  minStock: z.coerce
    .number({ error: 'El stock mínimo debe ser un número.' })
    .int('El stock mínimo debe ser un número entero.')
    .min(0, 'El stock mínimo no puede ser negativo.'),
  isActive: z.boolean(),
})

export type ProductFormInput = z.input<typeof productSchema>
export type ProductFormValues = z.output<typeof productSchema>

export const categorySchema = z.object({
  name: z.string().trim().min(2, 'El nombre debe tener al menos 2 caracteres.').max(80, 'Máximo 80 caracteres.'),
  description: z
    .string()
    .trim()
    .max(500, 'Máximo 500 caracteres.')
    .transform((value) => value || null),
  isActive: z.boolean(),
})

export type CategoryFormInput = z.input<typeof categorySchema>
export type CategoryFormValues = z.output<typeof categorySchema>
