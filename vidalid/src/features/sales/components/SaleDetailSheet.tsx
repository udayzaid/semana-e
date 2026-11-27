import { format, parseISO } from 'date-fns'
import { Ban, Printer } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import { toUserMessage } from '@/lib/errors'
import { formatBolivianos } from '@/lib/utils'
import { useSale } from '../hooks/useSales'
import { paymentLabels } from '../types'

interface SaleDetailSheetProps {
  saleId: string | null
  onOpenChange: (open: boolean) => void
  onPrint: (id: string) => void
  onVoid: (sale: { id: string; code: string; total: number }) => void
}

export function SaleDetailSheet({ saleId, onOpenChange, onPrint, onVoid }: SaleDetailSheetProps) {
  const sale = useSale(saleId)
  const s = sale.data

  return (
    <Sheet open={!!saleId} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader className="border-b">
          {s ? (
            <>
              <SheetTitle className="flex items-center gap-2 font-heading text-lg">
                {s.code}
                {s.status === 'voided' && <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-semibold text-destructive">Anulada</span>}
              </SheetTitle>
              <SheetDescription>
                {format(parseISO(s.createdAt), 'dd/MM/yyyy HH:mm')}
                {s.sellerName && ` · ${s.sellerName}`}
              </SheetDescription>
            </>
          ) : (
            <Skeleton className="h-6 w-40" />
          )}
        </SheetHeader>

        {sale.isError && <p className="p-4 text-sm text-destructive">{toUserMessage(sale.error, 'No se pudo cargar la venta.')}</p>}

        {s && (
          <div className="space-y-5 p-4 text-sm">
            <section>
              <p className="text-xs text-muted-foreground">Cliente</p>
              <p className="font-medium">{s.customer?.name ?? 'Cliente ocasional'}</p>
              {s.customer?.businessName && <p className="text-muted-foreground">{s.customer.businessName}</p>}
            </section>

            <section>
              <p className="mb-2 text-xs text-muted-foreground">Productos</p>
              <ul className="divide-y rounded-lg border">
                {s.lines.map((line) => (
                  <li key={line.productId} className="flex justify-between gap-3 px-3 py-2">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{line.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {line.quantity} × {formatBolivianos(line.unitPrice)}
                        {line.lots.length > 0 && ` · lote ${line.lots.join(', ')}`}
                      </p>
                    </div>
                    <span className="font-semibold tabular-nums">{formatBolivianos(line.total)}</span>
                  </li>
                ))}
              </ul>
            </section>

            <section className="space-y-1.5 rounded-lg bg-muted/40 p-3">
              <Row label="Subtotal" value={formatBolivianos(s.subtotal)} />
              {s.discount > 0 && <Row label="Descuento" value={`- ${formatBolivianos(s.discount)}`} />}
              <Row label="Total" value={formatBolivianos(s.total)} strong />
              {s.payments.map((payment, index) => (
                <Row key={index} label={`${paymentLabels[payment.method]}${payment.reference ? ` · ${payment.reference}` : ''}`} value={formatBolivianos(payment.amount)} muted />
              ))}
            </section>

            {s.notes && (
              <section>
                <p className="text-xs text-muted-foreground">Observaciones</p>
                <p>{s.notes}</p>
              </section>
            )}

            {s.status === 'voided' && (
              <section className="rounded-lg border border-destructive/30 bg-destructive/5 p-3">
                <p className="font-semibold text-destructive">Venta anulada{s.voidedAt ? ` el ${format(parseISO(s.voidedAt), 'dd/MM/yyyy HH:mm')}` : ''}</p>
                <p className="mt-1">Motivo: {s.voidReason}</p>
              </section>
            )}

            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => onPrint(s.id)}>
                <Printer /> Ver / imprimir comprobante
              </Button>
              {s.status === 'completed' && (
                <Button variant="destructive" onClick={() => onVoid({ id: s.id, code: s.code, total: s.total })}>
                  <Ban /> Anular venta
                </Button>
              )}
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}

function Row({ label, value, strong, muted }: { label: string; value: string; strong?: boolean; muted?: boolean }) {
  return (
    <div className={`flex justify-between gap-3 ${strong ? 'border-t pt-1.5 text-base font-bold' : ''} ${muted ? 'text-muted-foreground' : ''}`}>
      <span>{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  )
}
