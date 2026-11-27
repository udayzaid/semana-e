/**
 * Cálculos de dinero en centavos (enteros) para evitar errores de coma flotante
 * (0.1 + 0.2 !== 0.3). La base de datos usa numeric(12,2).
 */
export const toCents = (amount: number): number => Math.round((Number.isFinite(amount) ? amount : 0) * 100)

export const fromCents = (cents: number): number => cents / 100

/** Convierte el texto de un input numérico en importe (vacío o inválido = 0). */
export function parseAmount(value: string | number | null | undefined): number {
  if (value === null || value === undefined || value === '') return 0
  const parsed = typeof value === 'number' ? value : Number(String(value).replace(',', '.'))
  return Number.isFinite(parsed) ? fromCents(toCents(parsed)) : 0
}
