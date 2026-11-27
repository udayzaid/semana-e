import { format, parseISO } from 'date-fns'
import { useState } from 'react'
import { Pagination } from '@/components/shared/Pagination'
import { SimpleSelect, type SelectOption } from '@/components/shared/SimpleSelect'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ProductPicker } from '@/features/products/components/ProductPicker'
import { toUserMessage } from '@/lib/errors'
import { cn } from '@/lib/utils'
import type { MovementType } from '@/types/database'
import { useMovements } from '../hooks/useInventory'

const PAGE_SIZE = 15

const movementLabels: Record<MovementType, { label: string; className: string }> = {
  entry: { label: 'Ingreso', className: 'bg-success/10 text-success' },
  exit: { label: 'Salida', className: 'bg-destructive/10 text-destructive' },
  adjustment: { label: 'Ajuste', className: 'bg-chart-5/12 text-chart-5' },
  sale: { label: 'Venta', className: 'bg-primary/10 text-primary' },
  sale_void: { label: 'Anulación', className: 'bg-warning/12 text-warning' },
}

const typeOptions: SelectOption[] = [
  { value: 'all', label: 'Todos los tipos' },
  ...Object.entries(movementLabels).map(([value, { label }]) => ({ value, label })),
]

/** RF-19 · Historial de movimientos (auditoría). */
export function MovementsTab() {
  const [productId, setProductId] = useState<string | null>(null)
  const [type, setType] = useState<MovementType | null>(null)
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [page, setPage] = useState(1)

  const movements = useMovements({ productId, type, from: from || null, to: to || null, page, pageSize: PAGE_SIZE })
  const rows = movements.data?.rows ?? []
  const hasFilters = !!(productId || type || from || to)

  const resetPage = <T,>(setter: (value: T) => void) => (value: T) => {
    setter(value)
    setPage(1)
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 rounded-xl border bg-card p-3 md:grid-cols-2 xl:grid-cols-[1fr_200px_150px_150px_auto]">
        <ProductPicker value={productId} onChange={(product) => resetPage(setProductId)(product?.id ?? null)} placeholder="Filtrar por producto…" className="h-9" />
        <SimpleSelect
          aria-label="Filtrar por tipo"
          value={type ?? 'all'}
          onChange={(value) => resetPage(setType)(value === 'all' || !value ? null : (value as MovementType))}
          options={typeOptions}
        />
        <Input type="date" value={from} max={to || undefined} onChange={(event) => resetPage(setFrom)(event.target.value)} className="h-9 bg-card" aria-label="Desde" title="Desde" />
        <Input type="date" value={to} min={from || undefined} onChange={(event) => resetPage(setTo)(event.target.value)} className="h-9 bg-card" aria-label="Hasta" title="Hasta" />
        <Button
          variant="ghost"
          className="h-9"
          disabled={!hasFilters}
          onClick={() => {
            setProductId(null)
            setType(null)
            setFrom('')
            setTo('')
            setPage(1)
          }}
        >
          Limpiar
        </Button>
      </div>

      <div className="overflow-hidden rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead className="pl-4">Fecha</TableHead>
              <TableHead>Producto</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead className="text-right">Cantidad</TableHead>
              <TableHead className="text-right">Stock</TableHead>
              <TableHead>Lote</TableHead>
              <TableHead>Motivo</TableHead>
              <TableHead className="pr-4">Usuario</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {movements.isLoading &&
              Array.from({ length: 5 }).map((_, index) => (
                <TableRow key={index}>
                  <TableCell colSpan={8} className="px-4">
                    <Skeleton className="h-7 w-full" />
                  </TableCell>
                </TableRow>
              ))}
            {movements.isError && (
              <TableRow>
                <TableCell colSpan={8} className="py-10 text-center text-sm text-destructive">
                  {toUserMessage(movements.error, 'No se pudo cargar el historial.')}
                </TableCell>
              </TableRow>
            )}
            {!movements.isLoading && !movements.isError && rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="py-12 text-center text-sm text-muted-foreground">
                  {hasFilters ? 'No hay movimientos con esos filtros.' : 'Todavía no hay movimientos registrados.'}
                </TableCell>
              </TableRow>
            )}
            {rows.map((movement) => {
              const style = movementLabels[movement.type]
              return (
                <TableRow key={movement.id}>
                  <TableCell className="pl-4 whitespace-nowrap text-muted-foreground">{format(parseISO(movement.createdAt), 'dd/MM/yyyy HH:mm')}</TableCell>
                  <TableCell>
                    <p className="font-medium">{movement.productName}</p>
                    <p className="text-xs text-muted-foreground">{movement.productSku}</p>
                  </TableCell>
                  <TableCell>
                    <span className={cn('rounded-full px-2 py-0.5 text-xs font-semibold whitespace-nowrap', style.className)}>{style.label}</span>
                  </TableCell>
                  <TableCell className={cn('text-right font-semibold tabular-nums', movement.quantityChange > 0 ? 'text-success' : 'text-destructive')}>
                    {movement.quantityChange > 0 ? '+' : ''}
                    {movement.quantityChange}
                  </TableCell>
                  <TableCell className="text-right whitespace-nowrap text-muted-foreground tabular-nums">
                    {movement.stockBefore} → <span className="font-medium text-foreground">{movement.stockAfter}</span>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{movement.lotCode ?? '—'}</TableCell>
                  <TableCell className="max-w-64 truncate" title={movement.reason}>
                    {movement.reason}
                  </TableCell>
                  <TableCell className="pr-4 text-muted-foreground">{movement.authorName ?? '—'}</TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
        <Pagination page={page} pageSize={PAGE_SIZE} total={movements.data?.total ?? 0} onPageChange={setPage} />
      </div>
    </div>
  )
}
