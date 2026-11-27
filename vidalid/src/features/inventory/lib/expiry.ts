import { differenceInCalendarDays, format, parseISO } from 'date-fns'
import { EXPIRING_DAYS } from '../types'

export type ExpiryState = 'none' | 'ok' | 'expiring' | 'expired'

export function getExpiry(expiresAt: string | null): { state: ExpiryState; days: number | null; label: string } {
  if (!expiresAt) return { state: 'none', days: null, label: 'Sin vencimiento' }
  const days = differenceInCalendarDays(parseISO(expiresAt), new Date())
  const date = format(parseISO(expiresAt), 'dd/MM/yyyy')
  if (days < 0) return { state: 'expired', days, label: `Vencido (${date})` }
  if (days === 0) return { state: 'expiring', days, label: `Vence hoy` }
  if (days <= EXPIRING_DAYS) return { state: 'expiring', days, label: `${date} · en ${days} días` }
  return { state: 'ok', days, label: date }
}
