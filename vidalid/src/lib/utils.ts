/** Formatea importes en bolivianos para la interfaz. */
export function formatB bolivianos(value: number): string {
  return new Intl.NumberFormat('es-BO', {
    style: 'currency',
    currency: 'BOB',
    maximumFractionDigits: 2,
  }).format(value)
}
