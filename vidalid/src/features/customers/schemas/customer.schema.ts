import { z } from 'zod'

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Máximo ${max} caracteres.`)
    .transform((value) => value || null)

// Mismas reglas que las restricciones CHECK de la tabla customers.
export const customerSchema = z.object({
  name: z.string().trim().min(2, 'El nombre debe tener al menos 2 caracteres.').max(120, 'Máximo 120 caracteres.'),
  businessName: optionalText(120),
  customerType: z.enum(['retailer', 'final_consumer']),
  phone: z
    .string()
    .trim()
    .refine((value) => !value || /^[0-9+() -]{6,20}$/.test(value), 'Teléfono no válido. Usa solo números, espacios, +, ( ) o -.')
    .transform((value) => value || null),
  address: optionalText(300),
  notes: optionalText(2000),
  isActive: z.boolean(),
})

export type CustomerFormInput = z.input<typeof customerSchema>
export type CustomerFormValues = z.output<typeof customerSchema>

export const interactionSchema = z.object({
  type: z.enum(['whatsapp', 'call', 'visit', 'note', 'follow_up']),
  notes: z.string().trim().min(2, 'Escribe un detalle de la consulta o seguimiento.').max(1000, 'Máximo 1000 caracteres.'),
  followUpAt: z.string().transform((value) => value || null),
})

export type InteractionFormInput = z.input<typeof interactionSchema>
export type InteractionFormValues = z.output<typeof interactionSchema>
