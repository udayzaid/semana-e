export { cn } from 'cn'

/** Formatea importes en bolivianos para la interfaz. */
export function formatBolivianos(value: number): string {
  return new Intl.NumberFormat('es-BO', {
    style: 'currency',
    currency: 'BOB',
    maximumFractionDigits: 2,
  }).format(value)
}
