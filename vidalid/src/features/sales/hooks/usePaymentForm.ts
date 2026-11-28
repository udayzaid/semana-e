import { useState } from 'react'
import { fromCents, parseAmount, toCents } from '@/lib/money'
import type { PaymentInput } from '../types'

export type PayMode = 'cash' | 'qr' | 'mixed'

/**
 * Estado y validación del cobro (efectivo, QR o mixto) para un total en centavos.
 * Se usa en Nueva venta y al entregar pedidos.
 */
export function usePaymentForm(totalCents: number) {
  const [mode, setMode] = useState<PayMode>('cash')
  const [cashReceived, setCashReceived] = useState('')
  const [mixedCash, setMixedCash] = useState('')
  const [qrReference, setQrReference] = useState('')

  const cashReceivedCents = toCents(parseAmount(cashReceived))
  const mixedCashCents = Math.min(toCents(parseAmount(mixedCash)), totalCents)
  const mixedQrCents = totalCents - mixedCashCents
  const changeCents = mode === 'cash' && cashReceivedCents > totalCents ? cashReceivedCents - totalCents : 0

  let problem: string | null = null
  if (mode === 'cash' && cashReceived && cashReceivedCents < totalCents) problem = 'El efectivo recibido es menor al total.'
  if (mode === 'mixed' && totalCents > 0 && (mixedCashCents <= 0 || mixedQrCents <= 0)) problem = 'En pago mixto indica un monto en efectivo menor al total.'

  const payments = (): PaymentInput[] => {
    if (totalCents === 0) return []
    const reference = qrReference.trim() || null
    if (mode === 'cash') return [{ method: 'cash', amount: fromCents(totalCents), reference: null }]
    if (mode === 'qr') return [{ method: 'qr', amount: fromCents(totalCents), reference }]
    return [
      { method: 'cash', amount: fromCents(mixedCashCents), reference: null },
      { method: 'qr', amount: fromCents(mixedQrCents), reference },
    ]
  }

  const reset = () => {
    setMode('cash')
    setCashReceived('')
    setMixedCash('')
    setQrReference('')
  }

  return {
    totalCents,
    mode,
    setMode,
    cashReceived,
    setCashReceived,
    mixedCash,
    setMixedCash,
    qrReference,
    setQrReference,
    mixedQrCents,
    changeCents,
    problem,
    payments,
    reset,
  }
}

export type PaymentForm = ReturnType<typeof usePaymentForm>
