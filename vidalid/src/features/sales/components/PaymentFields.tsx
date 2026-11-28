import { Banknote, QrCode, Wallet } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { fromCents } from '@/lib/money'
import { cn, formatBolivianos } from '@/lib/utils'
import type { PaymentForm, PayMode } from '../hooks/usePaymentForm'

const payModes: { value: PayMode; label: string; icon: typeof Banknote }[] = [
  { value: 'cash', label: 'Efectivo', icon: Banknote },
  { value: 'qr', label: 'QR', icon: QrCode },
  { value: 'mixed', label: 'Mixto', icon: Wallet },
]

export function PaymentFields({ form, idPrefix = 'pay' }: { form: PaymentForm; idPrefix?: string }) {
  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Label>Método de pago</Label>
        <div className="grid grid-cols-3 gap-2">
          {payModes.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              type="button"
              onClick={() => form.setMode(value)}
              aria-pressed={form.mode === value}
              className={cn(
                'flex flex-col items-center gap-1 rounded-lg border p-2 text-xs font-medium transition',
                form.mode === value ? 'border-primary bg-secondary text-primary' : 'hover:bg-muted',
              )}
            >
              <Icon className="size-4" /> {label}
            </button>
          ))}
        </div>
      </div>

      {form.mode === 'cash' && (
        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-cash-received`}>Efectivo recibido (opcional)</Label>
          <Input
            id={`${idPrefix}-cash-received`}
            type="number"
            inputMode="decimal"
            min={0}
            step="0.01"
            value={form.cashReceived}
            onChange={(event) => form.setCashReceived(event.target.value)}
            placeholder={fromCents(form.totalCents).toFixed(2)}
            className="tabular-nums"
          />
          {form.changeCents > 0 && (
            <p className="rounded-lg bg-success/10 px-3 py-2 text-sm font-semibold text-success">Cambio: {formatBolivianos(fromCents(form.changeCents))}</p>
          )}
        </div>
      )}

      {form.mode === 'mixed' && (
        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-mixed-cash`}>Monto en efectivo</Label>
          <Input
            id={`${idPrefix}-mixed-cash`}
            type="number"
            inputMode="decimal"
            min={0}
            step="0.01"
            value={form.mixedCash}
            onChange={(event) => form.setMixedCash(event.target.value)}
            className="tabular-nums"
          />
          <p className="text-sm text-muted-foreground">
            Por QR: <span className="font-semibold text-foreground tabular-nums">{formatBolivianos(fromCents(Math.max(form.mixedQrCents, 0)))}</span>
          </p>
        </div>
      )}

      {(form.mode === 'qr' || form.mode === 'mixed') && (
        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-qr-reference`}>Referencia del QR (opcional)</Label>
          <Input id={`${idPrefix}-qr-reference`} value={form.qrReference} maxLength={100} onChange={(event) => form.setQrReference(event.target.value)} placeholder="N.º de transacción" />
        </div>
      )}
    </div>
  )
}
