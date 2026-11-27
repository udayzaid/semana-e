import { cn } from '@/lib/utils'
import type { StockStatus } from '../types'

const styles: Record<StockStatus | 'inactive', { label: string; className: string }> = {
  ok: { label: 'Disponible', className: 'bg-success/10 text-success' },
  low: { label: 'Stock bajo', className: 'bg-warning/12 text-warning' },
  out: { label: 'Agotado', className: 'bg-destructive/10 text-destructive' },
  inactive: { label: 'Inactivo', className: 'bg-muted text-muted-foreground' },
}

export function StockBadge({ status, isActive }: { status: StockStatus; isActive: boolean }) {
  const style = styles[isActive ? status : 'inactive']
  return (
    <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold whitespace-nowrap', style.className)}>
      {style.label}
    </span>
  )
}
