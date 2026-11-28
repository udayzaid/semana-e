import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { Ban, CheckCircle2, ClipboardCheck, MapPin, PackageCheck, Phone, Receipt, Store, Truck, UserRound } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import { WhatsAppButton } from '@/features/customers/components/WhatsAppButton'
import { ReceiptDialog } from '@/features/sales/components/ReceiptDialog'
import { toUserMessage } from '@/lib/errors'
import { cn, formatBolivianos } from '@/lib/utils'
import { useOrder } from '../hooks/useOrders'
import { modeLabels, sourceLabels, statusLabels, type OrderDetail } from '../types'
import { DeliverDialog, StatusDialog, type StatusAction } from './OrderActionDialogs'
import { OrderStatusBadge } from './OrderStatusBadge'

const cancelAction: StatusAction = {
  status: 'cancelled',
  title: 'Cancelar pedido',
  description: 'Si el pedido tenía stock reservado, se libera. Esta acción no se puede deshacer.',
  confirmLabel: 'Cancelar pedido',
  requireNote: true,
  destructive: true,
}

/** Acciones disponibles según el estado (mismas reglas que la base de datos). */
function nextActions(order: OrderDetail): StatusAction[] {
  switch (order.status) {
    case 'pending':
      return [{ status: 'confirmed', title: 'Confirmar pedido', description: 'Se reservará el stock de los productos para este pedido.', confirmLabel: 'Confirmar y reservar' }]
    case 'confirmed':
      return [{ status: 'preparing', title: 'Preparar pedido', description: 'Indica quién prepara los productos.', confirmLabel: 'Iniciar preparación', askAssignee: true }]
    case 'preparing':
      return order.deliveryMode === 'pickup'
        ? [{ status: 'ready', title: 'Listo para recoger', description: 'El cliente ya puede recogerlo en el almacén.', confirmLabel: 'Marcar como listo', askAssignee: true }]
        : [{ status: 'dispatched', title: 'Despachar pedido', description: 'El pedido sale a entrega. Indica el responsable.', confirmLabel: 'Despachar', askAssignee: true }]
    default:
      return []
  }
}

/** Mensaje de WhatsApp para avisar al cliente del estado de su pedido. */
function whatsAppMessage(order: OrderDetail): string {
  const name = order.contactName.split(' ')[0]
  const status = statusLabels[order.status].toLowerCase()
  return `Hola ${name}, le saludamos de Vidalid. Su pedido ${order.code} está: ${status}. Total: ${formatBolivianos(order.subtotal)}.`
}

export function OrderDetailSheet({ orderId, onOpenChange }: { orderId: string | null; onOpenChange: (open: boolean) => void }) {
  const query = useOrder(orderId)
  const order = query.data
  const [action, setAction] = useState<StatusAction | null>(null)
  const [actionKey, setActionKey] = useState(0)
  const [delivering, setDelivering] = useState(false)
  const [receiptId, setReceiptId] = useState<string | null>(null)

  const openAction = (next: StatusAction) => {
    setActionKey((key) => key + 1)
    setAction(next)
  }

  const canCancel = order && ['pending', 'confirmed', 'preparing', 'ready', 'dispatched'].includes(order.status)
  const canDeliver = order && ['ready', 'dispatched'].includes(order.status)
  const stockShort = order?.status === 'pending' && order.items.some((item) => item.quantity > item.availableStock)

  return (
    <>
      <Sheet open={!!orderId} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg">
          <SheetHeader className="border-b">
            {order ? (
              <>
                <SheetTitle className="flex flex-wrap items-center gap-2 font-heading text-lg">
                  {order.code} <OrderStatusBadge status={order.status} />
                </SheetTitle>
                <SheetDescription>
                  {format(parseISO(order.createdAt), "d 'de' MMMM, HH:mm", { locale: es })} · {sourceLabels[order.source]}
                </SheetDescription>
              </>
            ) : (
              <Skeleton className="h-6 w-40" />
            )}
          </SheetHeader>

          {query.isError && <p className="p-4 text-sm text-destructive">{toUserMessage(query.error, 'No se pudo cargar el pedido.')}</p>}

          {order && (
            <div className="space-y-5 p-4 text-sm">
              {/* Acciones */}
              <section className="flex flex-wrap gap-2">
                {nextActions(order).map((next) => (
                  <Button key={next.status} onClick={() => openAction(next)} disabled={next.status === 'confirmed' && stockShort}>
                    {next.status === 'confirmed' ? <ClipboardCheck /> : next.status === 'dispatched' ? <Truck /> : <PackageCheck />}
                    {next.title}
                  </Button>
                ))}
                {canDeliver && (
                  <Button onClick={() => setDelivering(true)}>
                    <CheckCircle2 /> Entregar y cobrar
                  </Button>
                )}
                {order.saleId && (
                  <Button variant="outline" onClick={() => setReceiptId(order.saleId)}>
                    <Receipt /> Ver comprobante
                  </Button>
                )}
                {canCancel && (
                  <Button variant="ghost" className="text-destructive" onClick={() => openAction(cancelAction)}>
                    <Ban /> Cancelar
                  </Button>
                )}
              </section>
              {stockShort && (
                <p className="rounded-lg border border-warning/30 bg-warning/5 p-3 text-xs">
                  No hay stock suficiente para confirmar todos los productos. Registra un ingreso en Inventario o ajusta el pedido con el cliente.
                </p>
              )}

              {/* Contacto y entrega */}
              <section className="grid gap-3 rounded-lg border p-3 sm:grid-cols-2">
                <div>
                  <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <UserRound className="size-3.5" /> Contacto
                  </p>
                  <p className="font-medium">{order.contactName}</p>
                  {order.customerName && order.customerName !== order.contactName && <p className="text-xs text-muted-foreground">Cliente: {order.customerName}</p>}
                  <p className="mt-1 flex items-center gap-1 text-muted-foreground">
                    <Phone className="size-3.5" /> {order.contactPhone}
                    <WhatsAppButton phone={order.contactPhone} message={whatsAppMessage(order)} />
                  </p>
                </div>
                <div>
                  <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    {order.deliveryMode === 'pickup' ? <Store className="size-3.5" /> : <Truck className="size-3.5" />} {modeLabels[order.deliveryMode]}
                  </p>
                  {order.deliveryAddress && (
                    <p className="flex items-start gap-1">
                      <MapPin className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" /> {order.deliveryAddress}
                    </p>
                  )}
                  {order.assignedTo && <p className="mt-1 text-muted-foreground">Responsable: {order.assignedTo}</p>}
                </div>
              </section>

              {/* Productos */}
              <section>
                <p className="mb-2 text-xs text-muted-foreground">Productos</p>
                <ul className="divide-y rounded-lg border">
                  {order.items.map((item) => (
                    <li key={item.productId} className="flex justify-between gap-3 px-3 py-2">
                      <div className="min-w-0">
                        <p className="truncate font-medium">{item.name}</p>
                        <p className={cn('text-xs', order.status === 'pending' && item.quantity > item.availableStock ? 'font-semibold text-warning' : 'text-muted-foreground')}>
                          {item.quantity} × {formatBolivianos(item.unitPrice)}
                          {order.status === 'pending' && ` · disponible ${item.availableStock}`}
                        </p>
                      </div>
                      <span className="font-semibold tabular-nums">{formatBolivianos(item.total)}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-2 flex justify-between px-1 font-semibold">
                  <span>Total {order.status === 'delivered' ? '' : 'estimado'}</span>
                  <span className="tabular-nums">{formatBolivianos(order.subtotal)}</span>
                </p>
              </section>

              {order.notes && (
                <section>
                  <p className="text-xs text-muted-foreground">Observaciones</p>
                  <p>{order.notes}</p>
                </section>
              )}
              {order.cancelReason && (
                <section className="rounded-lg border border-destructive/30 bg-destructive/5 p-3">
                  <p className="font-semibold text-destructive">Pedido cancelado</p>
                  <p className="mt-1">Motivo: {order.cancelReason}</p>
                </section>
              )}

              {/* Historial */}
              <section>
                <p className="mb-2 text-xs text-muted-foreground">Historial</p>
                <ol className="relative space-y-3 border-l pl-4">
                  {order.events.map((event) => (
                    <li key={event.id} className="relative">
                      <span className="absolute top-1.5 -left-[21px] size-2.5 rounded-full border-2 border-card bg-brand" />
                      <p className="font-medium">{statusLabels[event.toStatus]}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(parseISO(event.createdAt), 'dd/MM/yyyy HH:mm')}
                        {event.authorName && ` · ${event.authorName}`}
                      </p>
                      {event.note && <p className="mt-0.5 text-xs">{event.note}</p>}
                    </li>
                  ))}
                </ol>
              </section>
            </div>
          )}
        </SheetContent>
      </Sheet>

      <StatusDialog key={actionKey} order={order ?? null} action={action} onOpenChange={(open) => !open && setAction(null)} />
      <DeliverDialog key={`deliver-${order?.id}-${delivering}`} order={delivering ? order ?? null : null} onOpenChange={(open) => !open && setDelivering(false)} onDelivered={(saleId) => setReceiptId(saleId)} />
      <ReceiptDialog saleId={receiptId} onOpenChange={(open) => !open && setReceiptId(null)} />
    </>
  )
}
