import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { Store, Truck } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Skeleton } from '@/components/ui/skeleton'
import { OrderStatusBadge } from '@/features/orders/components/OrderStatusBadge'
import { toUserMessage } from '@/lib/errors'
import { cn, formatBolivianos } from '@/lib/utils'
import { useMyOrders, useMyPurchases } from '../hooks/useAccount'

/** Pedidos del cliente con su estado (Pendiente, Confirmado, Enviado…). */
export function MyOrdersList() {
  const orders = useMyOrders()

  if (orders.isLoading) return <Skeleton className="h-24 w-full" />
  if (orders.isError) return <p className="text-sm text-destructive">{toUserMessage(orders.error, 'No se pudieron cargar tus pedidos.')}</p>
  if (!orders.data?.length) {
    return (
      <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
        Aún no tienes pedidos.{' '}
        <Link to="/" className="font-semibold text-primary hover:underline">
          Ir a la tienda
        </Link>
      </p>
    )
  }

  return (
    <ul className="divide-y">
      {orders.data.map((order) => (
        <li key={order.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
          <div>
            <p className="font-medium">{order.code}</p>
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              {format(parseISO(order.createdAt), "d 'de' MMM yyyy", { locale: es })} · {order.itemCount} unidades ·{' '}
              {order.deliveryMode === 'pickup' ? <Store className="size-3" /> : <Truck className="size-3" />}
              {order.deliveryMode === 'pickup' ? 'Recojo' : 'Envío'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="font-semibold tabular-nums">{formatBolivianos(order.subtotal)}</span>
            <OrderStatusBadge status={order.status} />
          </div>
        </li>
      ))}
    </ul>
  )
}

/** Compras (ventas registradas a nombre del cliente). */
export function MyPurchasesList() {
  const purchases = useMyPurchases()

  if (purchases.isLoading) return <Skeleton className="h-24 w-full" />
  if (purchases.isError) return <p className="text-sm text-destructive">{toUserMessage(purchases.error, 'No se pudieron cargar tus compras.')}</p>
  if (!purchases.data?.length) return <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">Tus compras entregadas aparecerán aquí.</p>

  return (
    <ul className="divide-y">
      {purchases.data.map((sale) => (
        <li key={sale.id} className={cn('flex items-center justify-between gap-2 py-3', sale.status === 'voided' && 'opacity-60')}>
          <div>
            <p className="font-medium">
              {sale.code}
              {sale.status === 'voided' && <span className="ml-2 text-xs font-semibold text-destructive">Anulada</span>}
            </p>
            <p className="text-xs text-muted-foreground">
              {format(parseISO(sale.createdAt), "d 'de' MMM yyyy", { locale: es })} · {sale.itemCount} unidades
            </p>
          </div>
          <span className={cn('font-semibold tabular-nums', sale.status === 'voided' && 'line-through')}>{formatBolivianos(sale.total)}</span>
        </li>
      ))}
    </ul>
  )
}
