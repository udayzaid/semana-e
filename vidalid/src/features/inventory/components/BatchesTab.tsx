import { format, parseISO } from 'date-fns'
import { SlidersHorizontal } from 'lucide-react'
import { useState } from 'react'
import { Pagination } from '@/components/shared/Pagination'
import { SimpleSelect, type SelectOption } from '@/components/shared/SimpleSelect'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ProductPicker } from '@/features/products/components/ProductPicker'
import { toUserMessage } from '@/lib/errors'
import { cn, formatBolivianos } from '@/lib/utils'
import { useBatches } from '../hooks/useInventory'
import { getExpiry } from '../lib/expiry'
import { EXPIRING_DAYS, type Batch, type BatchFilter } from '../types'

const PAGE_SIZE = 10

const filterOptions: SelectOption[] = [
  { value: 'all', label: 'Todos los lotes con stock' },
  { value: 'expiring', label: `Próximos a vencer (${EXPIRING_DAYS} días)` },
  { value: 'expired', label: 'Vencidos' },
]

const expiryStyles = {
  none: 'text-muted-foreground',
  ok: 'text-foreground',
  expiring: 'rounded-full bg-warning/12 px-2 py-0.5 font-semibold text-warning',
  expired: 'rounded-full bg-destructive/10 px-2 py-0.5 font-semibold text-destructive',
}

/** RF-20 / RF-23 / RF-24 / RF-25 · Lotes, cantidades y vencimientos. */
export function BatchesTab({ onAdjust, initialFilter = 'all' }: { onAdjust: (batch: Batch) => void; initialFilter?: BatchFilter }) {
  const [filter, setFilter] = useState<BatchFilter>(initialFilter)
  const [productId, setProductId] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const batches = useBatches({ filter, productId, page, pageSize: PAGE_SIZE })
  const rows = batches.data?.rows ?? []

  return (
    <div className="space-y-4">
      <div className="grid gap-3 rounded-xl border bg-card p-3 sm:grid-cols-[1fr_260px]">
        <ProductPicker
          value={productId}
          onChange={(product) => {
            setProductId(product?.id ?? null)
            setPage(1)
          }}
          placeholder="Filtrar por producto…"
          className="h-9"
        />
        <SimpleSelect
          aria-label="Filtrar lotes"
          value={filter}
          onChange={(value) => {
            setFilter((value ?? 'all') as BatchFilter)
            setPage(1)
          }}
          options={filterOptions}
        />
      </div>

      <div className="overflow-hidden rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead className="pl-4">Producto</TableHead>
              <TableHead>Lote</TableHead>
              <TableHead>Ingreso</TableHead>
              <TableHead>Vencimiento</TableHead>
              <TableHead className="text-right">Cantidad</TableHead>
              <TableHead className="text-right">Costo u.</TableHead>
              <TableHead className="pr-4 text-right">Ajuste</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {batches.isLoading &&
              Array.from({ length: 4 }).map((_, index) => (
                <TableRow key={index}>
                  <TableCell colSpan={7} className="px-4">
                    <Skeleton className="h-8 w-full" />
                  </TableCell>
                </TableRow>
              ))}
            {batches.isError && (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-sm text-destructive">
                  {toUserMessage(batches.error, 'No se pudieron cargar los lotes.')}
                </TableCell>
              </TableRow>
            )}
            {!batches.isLoading && !batches.isError && rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="py-12 text-center text-sm text-muted-foreground">
                  {filter === 'expired'
                    ? 'No hay lotes vencidos con stock. 🎉'
                    : filter === 'expiring'
                      ? 'No hay lotes por vencer en los próximos días.'
                      : 'Aún no hay lotes. Se crean al registrar un ingreso de mercadería.'}
                </TableCell>
              </TableRow>
            )}
            {rows.map((batch) => {
              const expiry = getExpiry(batch.expiresAt)
              return (
                <TableRow key={batch.id}>
                  <TableCell className="pl-4">
                    <p className="font-medium">{batch.productName}</p>
                    <p className="text-xs text-muted-foreground">{batch.productSku}</p>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{batch.lotCode ?? '—'}</TableCell>
                  <TableCell className="text-muted-foreground">{format(parseISO(batch.receivedAt), 'dd/MM/yyyy')}</TableCell>
                  <TableCell>
                    <span className={cn('text-xs whitespace-nowrap', expiryStyles[expiry.state])}>{expiry.label}</span>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    <span className="font-semibold">{batch.quantity}</span>
                    <span className="text-xs text-muted-foreground"> / {batch.initialQuantity} {batch.unit}</span>
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground tabular-nums">
                    {batch.unitCost === null ? '—' : formatBolivianos(batch.unitCost)}
                  </TableCell>
                  <TableCell className="pr-4 text-right">
                    <Button variant="ghost" size="icon-sm" title="Ajustar por conteo" aria-label={`Ajustar lote de ${batch.productName}`} onClick={() => onAdjust(batch)}>
                      <SlidersHorizontal />
                    </Button>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
        <Pagination page={page} pageSize={PAGE_SIZE} total={batches.data?.total ?? 0} onPageChange={setPage} />
      </div>
    </div>
  )
}
