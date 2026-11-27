import { AlertTriangle, ArrowDownToLine, ArrowUpFromLine, Boxes, CalendarClock, Wallet, type LucideIcon } from 'lucide-react'
import { useState } from 'react'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn, formatBolivianos } from '@/lib/utils'
import { BatchesTab } from '../components/BatchesTab'
import { MovementsTab } from '../components/MovementsTab'
import { StockAdjustDialog } from '../components/StockAdjustDialog'
import { StockEntryDialog } from '../components/StockEntryDialog'
import { StockExitDialog } from '../components/StockExitDialog'
import { StockTab } from '../components/StockTab'
import { useInventorySummary } from '../hooks/useInventory'
import type { Batch } from '../types'

type DialogState =
  | { kind: 'entry'; productId: string | null }
  | { kind: 'exit'; productId: string | null }
  | { kind: 'adjust'; batch: Batch }
  | null

export function InventoryPage() {
  const summary = useInventorySummary()
  const [dialog, setDialog] = useState<DialogState>(null)
  // Cambia en cada apertura para que los formularios empiecen limpios.
  const [dialogKey, setDialogKey] = useState(0)
  const [tab, setTab] = useState('stock')

  const open = (next: NonNullable<DialogState>) => {
    setDialogKey((key) => key + 1)
    setDialog(next)
  }
  const close = (isOpen: boolean) => !isOpen && setDialog(null)

  const s = summary.data

  return (
    <>
      <PageHeader
        title="Inventario"
        description="Existencias, lotes, vencimientos e historial de movimientos del almacén."
        actions={
          <>
            <Button variant="outline" onClick={() => open({ kind: 'exit', productId: null })}>
              <ArrowUpFromLine /> Registrar salida
            </Button>
            <Button onClick={() => open({ kind: 'entry', productId: null })}>
              <ArrowDownToLine /> Registrar ingreso
            </Button>
          </>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <SummaryCard icon={Wallet} label="Valor del inventario" loading={summary.isLoading} value={s ? formatBolivianos(s.inventoryValue) : ''} hint="Valorizado al costo" />
        <SummaryCard icon={Boxes} label="Unidades en stock" loading={summary.isLoading} value={s ? s.totalUnits.toLocaleString('es-BO') : ''} hint={s ? `${s.activeProducts} productos activos` : ''} />
        <SummaryCard
          icon={AlertTriangle}
          label="Stock bajo / agotados"
          loading={summary.isLoading}
          value={s ? `${s.lowStock} / ${s.outOfStock}` : ''}
          hint="Productos que requieren reposición"
          tone={s && s.lowStock + s.outOfStock > 0 ? 'warning' : undefined}
          onClick={() => setTab('stock')}
        />
        <SummaryCard
          icon={CalendarClock}
          label="Lotes por vencer / vencidos"
          loading={summary.isLoading}
          value={s ? `${s.expiringBatches} / ${s.expiredBatches}` : ''}
          hint="Próximos 30 días"
          tone={s && s.expiredBatches > 0 ? 'danger' : s && s.expiringBatches > 0 ? 'warning' : undefined}
          onClick={() => setTab('batches')}
        />
      </div>

      <Tabs value={tab} onValueChange={(value) => setTab(String(value))}>
        <TabsList className="mb-4">
          <TabsTrigger value="stock">Existencias</TabsTrigger>
          <TabsTrigger value="batches">Lotes y vencimientos</TabsTrigger>
          <TabsTrigger value="movements">Movimientos</TabsTrigger>
        </TabsList>
        <TabsContent value="stock">
          <StockTab onEntry={(productId) => open({ kind: 'entry', productId })} onExit={(productId) => open({ kind: 'exit', productId })} />
        </TabsContent>
        <TabsContent value="batches">
          <BatchesTab onAdjust={(batch) => open({ kind: 'adjust', batch })} />
        </TabsContent>
        <TabsContent value="movements">
          <MovementsTab />
        </TabsContent>
      </Tabs>

      <StockEntryDialog
        key={`entry-${dialogKey}`}
        open={dialog?.kind === 'entry'}
        onOpenChange={close}
        productId={dialog?.kind === 'entry' ? dialog.productId : null}
      />
      <StockExitDialog
        key={`exit-${dialogKey}`}
        open={dialog?.kind === 'exit'}
        onOpenChange={close}
        productId={dialog?.kind === 'exit' ? dialog.productId : null}
      />
      <StockAdjustDialog
        key={`adjust-${dialogKey}`}
        open={dialog?.kind === 'adjust'}
        onOpenChange={close}
        batch={dialog?.kind === 'adjust' ? dialog.batch : null}
      />
    </>
  )
}

interface SummaryCardProps {
  icon: LucideIcon
  label: string
  value: string
  hint?: string
  loading?: boolean
  tone?: 'warning' | 'danger'
  onClick?: () => void
}

function SummaryCard({ icon: Icon, label, value, hint, loading, tone, onClick }: SummaryCardProps) {
  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={cn('rounded-xl border bg-card p-4 text-left shadow-xs transition', onClick && 'cursor-pointer hover:border-primary/40')}
    >
      <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>{label}</span>
        <span
          className={cn(
            'grid size-8 place-items-center rounded-lg',
            tone === 'danger' ? 'bg-destructive/10 text-destructive' : tone === 'warning' ? 'bg-warning/12 text-warning' : 'bg-secondary text-primary',
          )}
        >
          <Icon className="size-4" />
        </span>
      </div>
      {loading ? <Skeleton className="mt-2 h-7 w-24" /> : <p className="mt-1 font-heading text-lg font-bold break-words tabular-nums sm:text-2xl">{value}</p>}
      {hint && <p className="mt-1 truncate text-xs text-muted-foreground">{hint}</p>}
    </Tag>
  )
}
