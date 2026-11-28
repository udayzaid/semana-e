import { cn } from '@/lib/utils'
import { statusLabels, statusStyles, type OrderStatus } from '../types'

export function OrderStatusBadge({ status, className }: { status: OrderStatus; className?: string }) {
  return (
    <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold whitespace-nowrap', statusStyles[status], className)}>
      {statusLabels[status]}
    </span>
  )
}
