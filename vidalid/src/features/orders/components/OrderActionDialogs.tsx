import { Loader2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { FormField } from '@/components/shared/FormField'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { PaymentFields } from '@/features/sales/components/PaymentFields'
import { usePaymentForm } from '@/features/sales/hooks/usePaymentForm'
import { toUserMessage } from '@/lib/errors'
import { fromCents, parseAmount, toCents } from '@/lib/money'
import { formatBolivianos } from '@/lib/utils'
import { useDeliverOrder, useUpdateOrderStatus } from '../hooks/useOrders'
import { statusLabels, type OrderDetail, type OrderStatus } from '../types'

// ---------------------------------------------------------------------
// Cambio de estado con nota / responsable (preparar, despachar, cancelar)
// ---------------------------------------------------------------------

export interface StatusAction {
  status: OrderStatus
  title: string
  description: string
  confirmLabel: string
  askAssignee?: boolean
  requireNote?: boolean
  destructive?: boolean
}

interface StatusDialogProps {
  order: OrderDetail | null
  action: StatusAction | null
  onOpenChange: (open: boolean) => void
}

export function StatusDialog({ order, action, onOpenChange }: StatusDialogProps) {
  const update = useUpdateOrderStatus()
  const [note, setNote] = useState('')
  const [assignee, setAssignee] = useState(order?.assignedTo ?? '')
  const [error, setError] = useState<string | null>(null)

  const submit = () => {
    if (!order || !action) return
    if (action.requireNote && note.trim().length < 5) {
      setError('Indica el motivo (mínimo 5 caracteres).')
      return
    }
    update.mutate(
      { id: order.id, status: action.status, note: note.trim() || null, assignedTo: action.askAssignee ? assignee.trim() || null : null },
      {
        onSuccess: () => {
          toast.success(`Pedido ${order.code}: ${statusLabels[action.status].toLowerCase()}.`)
          onOpenChange(false)
        },
        onError: (err) => toast.error(toUserMessage(err, 'No se pudo actualizar el pedido.')),
      },
    )
  }

  return (
    <Dialog open={!!action} onOpenChange={(next) => !update.isPending && onOpenChange(next)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{action?.title}</DialogTitle>
          <DialogDescription>{action?.description}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {action?.askAssignee && (
            <FormField label="Responsable (opcional)" htmlFor="order-assignee" hint="Quién prepara o entrega el pedido.">
              <Input id="order-assignee" value={assignee} onChange={(event) => setAssignee(event.target.value)} maxLength={120} placeholder="Nombre" />
            </FormField>
          )}
          <FormField label={action?.requireNote ? 'Motivo' : 'Observación (opcional)'} htmlFor="order-note" error={error ?? undefined}>
            <Textarea
              id="order-note"
              rows={2}
              maxLength={500}
              value={note}
              onChange={(event) => {
                setNote(event.target.value)
                setError(null)
              }}
              aria-invalid={!!error}
            />
          </FormField>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={update.isPending}>
            Volver
          </Button>
          <Button variant={action?.destructive ? 'destructive' : 'default'} onClick={submit} disabled={update.isPending}>
            {update.isPending && <Loader2 className="animate-spin" />}
            {action?.confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ---------------------------------------------------------------------
// RF-58 · Entregar: registrar el pago (genera la venta)
// ---------------------------------------------------------------------

interface DeliverDialogProps {
  order: OrderDetail | null
  onOpenChange: (open: boolean) => void
  onDelivered: (saleId: string) => void
}

export function DeliverDialog({ order, onOpenChange, onDelivered }: DeliverDialogProps) {
  const deliver = useDeliverOrder()
  const [discountText, setDiscountText] = useState('')
  const [note, setNote] = useState('')

  // El total final lo recalcula la base de datos con los precios vigentes.
  const subtotalCents = order ? order.items.reduce((sum, item) => sum + toCents(item.unitPrice) * item.quantity, 0) : 0
  const discountCents = Math.min(toCents(parseAmount(discountText)), subtotalCents)
  const totalCents = subtotalCents - discountCents
  const payment = usePaymentForm(totalCents)

  const submit = () => {
    if (!order) return
    if (payment.problem) {
      toast.error(payment.problem)
      return
    }
    deliver.mutate(
      { id: order.id, payments: payment.payments(), discount: fromCents(discountCents), note: note.trim() || null },
      {
        onSuccess: (saleId) => {
          toast.success(`Pedido ${order.code} entregado. Se registró la venta.`)
          onOpenChange(false)
          onDelivered(saleId)
        },
        onError: (err) => toast.error(toUserMessage(err, 'No se pudo entregar el pedido.')),
      },
    )
  }

  return (
    <Dialog open={!!order} onOpenChange={(next) => !deliver.isPending && onOpenChange(next)}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Entregar pedido {order?.code}</DialogTitle>
          <DialogDescription>Registra el cobro. Se crea la venta, se descuenta el stock y se genera el comprobante.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <dl className="space-y-2 rounded-lg bg-muted/40 p-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Subtotal</dt>
              <dd className="tabular-nums">{formatBolivianos(fromCents(subtotalCents))}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-muted-foreground">
                <label htmlFor="deliver-discount">Descuento (Bs)</label>
              </dt>
              <dd>
                <Input id="deliver-discount" type="number" inputMode="decimal" min={0} step="0.01" value={discountText} onChange={(event) => setDiscountText(event.target.value)} placeholder="0,00" className="h-8 w-28 bg-card text-right tabular-nums" />
              </dd>
            </div>
            <div className="flex items-baseline justify-between border-t pt-2">
              <dt className="font-semibold">Total a cobrar</dt>
              <dd className="font-heading text-xl font-bold tabular-nums">{formatBolivianos(fromCents(totalCents))}</dd>
            </div>
          </dl>

          <PaymentFields form={payment} idPrefix="deliver" />

          <FormField label="Observación (opcional)" htmlFor="deliver-note">
            <Input id="deliver-note" value={note} onChange={(event) => setNote(event.target.value)} maxLength={500} placeholder="Recibido por…" />
          </FormField>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={deliver.isPending}>
            Volver
          </Button>
          <Button onClick={submit} disabled={deliver.isPending}>
            {deliver.isPending && <Loader2 className="animate-spin" />}
            Entregar y cobrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
