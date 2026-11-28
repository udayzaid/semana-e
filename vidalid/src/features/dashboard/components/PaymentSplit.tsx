import { Banknote, QrCode } from 'lucide-react'
import { formatBolivianos } from '@/lib/utils'

// Par categórico validado con el script de dataviz (CVD ΔE 26, contraste ≥ 3:1).
const CASH = '#678c30'
const QR = '#3b6fd1'

/** Efectivo vs QR del mes: barra 100 % con leyenda y etiquetas directas (identidad no solo por color). */
export function PaymentSplit({ cash, qr }: { cash: number; qr: number }) {
  const total = cash + qr
  const cashPct = total ? Math.round((cash / total) * 100) : 0
  const qrPct = total ? 100 - cashPct : 0

  if (total === 0) {
    return <p className="py-6 text-center text-sm text-muted-foreground">Aún no hay cobros este mes.</p>
  }

  return (
    <div className="space-y-4">
      <div className="flex h-3 w-full gap-0.5 overflow-hidden rounded-full" role="img" aria-label={`Efectivo ${cashPct} por ciento, QR ${qrPct} por ciento`}>
        {cashPct > 0 && <div className="h-full" style={{ width: `${cashPct}%`, background: CASH }} title={`Efectivo ${cashPct}%`} />}
        {qrPct > 0 && <div className="h-full" style={{ width: `${qrPct}%`, background: QR }} title={`QR ${qrPct}%`} />}
      </div>
      <dl className="grid grid-cols-2 gap-3">
        <Legend color={CASH} icon={<Banknote className="size-4" />} label="Efectivo" amount={cash} pct={cashPct} />
        <Legend color={QR} icon={<QrCode className="size-4" />} label="QR" amount={qr} pct={qrPct} />
      </dl>
    </div>
  )
}

function Legend({ color, icon, label, amount, pct }: { color: string; icon: React.ReactNode; label: string; amount: number; pct: number }) {
  return (
    <div className="rounded-lg border p-3">
      <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <span className="size-2.5 rounded-full" style={{ background: color }} aria-hidden="true" />
        {icon}
        {label}
      </dt>
      <dd className="mt-1 font-heading text-lg font-bold tabular-nums">{formatBolivianos(amount)}</dd>
      <dd className="text-xs text-muted-foreground">{pct}% del total</dd>
    </div>
  )
}
