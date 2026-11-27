import { ArrowDownToLine, ArrowUpFromLine, Search } from 'lucide-react'
import { useState } from 'react'
import { Pagination } from '@/components/shared/Pagination'
import { SimpleSelect, type SelectOption } from '@/components/shared/SimpleSelect'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ProductThumb } from '@/features/products/components/ProductThumb'
import { StockBadge } from '@/features/products/components/StockBadge'
import { useProducts } from '@/features/products/hooks/useProducts'
import type { ProductStatusFilter } from '@/features/products/types'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { toUserMessage } from '@/lib/errors'
import { formatBolivianos } from '@/lib/utils'

const PAGE_SIZE = 10

const statusOptions: SelectOption[] = [
  { value: 'active', label: 'Todos los activos' },
  { value: 'low', label: 'Stock bajo' },
  { value: 'out', label: 'Agotados' },
]

interface StockTabProps {
  onEntry: (productId: string) => void
  onExit: (productId: string) => void
}

/** RF-14 / RF-16 / RF-17 · Existencias por producto con alertas de stock. */
export function StockTab({ onEntry, onExit }: StockTabProps) {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<ProductStatusFilter>('active')
  const [page, setPage] = useState(1)
  const debouncedSearch = useDebouncedValue(search)
  const products = useProducts({ search: debouncedSearch, categoryId: null, status, page, pageSize: PAGE_SIZE })
  const rows = products.data?.rows ?? []

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-xl border bg-card p-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value)
              setPage(1)
            }}
            placeholder="Buscar por nombre o SKU…"
            className="h-9 bg-card pl-9"
            aria-label="Buscar productos"
          />
        </div>
        <SimpleSelect
          aria-label="Filtrar por estado de stock"
          value={status}
          onChange={(value) => {
            setStatus((value ?? 'active') as ProductStatusFilter)
            setPage(1)
          }}
          options={statusOptions}
          className="sm:w-48"
        />
      </div>

      <div className="overflow-hidden rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead className="pl-4">Producto</TableHead>
              <TableHead className="text-right">Stock</TableHead>
              <TableHead className="text-right">Reservado</TableHead>
              <TableHead className="text-right">Disponible</TableHead>
              <TableHead className="text-right">Mínimo</TableHead>
              <TableHead className="text-right">Valor (costo)</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="pr-4 text-right">Movimiento</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.isLoading &&
              Array.from({ length: 5 }).map((_, index) => (
                <TableRow key={index}>
                  <TableCell colSpan={8} className="px-4">
                    <Skeleton className="h-10 w-full" />
                  </TableCell>
                </TableRow>
              ))}
            {products.isError && (
              <TableRow>
                <TableCell colSpan={8} className="py-10 text-center text-sm text-destructive">
                  {toUserMessage(products.error, 'No se pudieron cargar las existencias.')}
                </TableCell>
              </TableRow>
            )}
            {!products.isLoading && !products.isError && rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="py-12 text-center text-sm text-muted-foreground">
                  {status === 'active' && !debouncedSearch ? 'No hay productos activos. Créalos en el módulo Productos.' : 'No hay productos con esos filtros.'}
                </TableCell>
              </TableRow>
            )}
            {rows.map((product) => (
              <TableRow key={product.id}>
                <TableCell className="pl-4">
                  <div className="flex min-w-48 items-center gap-3">
                    <ProductThumb imagePath={product.imagePath} name={product.name} className="size-9" />
                    <div className="min-w-0">
                      <p className="truncate font-medium">{product.name}</p>
                      <p className="text-xs text-muted-foreground">{product.sku} · {product.unit}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-right tabular-nums">{product.stock}</TableCell>
                <TableCell className="text-right text-muted-foreground tabular-nums">{product.reservedStock}</TableCell>
                <TableCell className="text-right font-semibold tabular-nums">{product.availableStock}</TableCell>
                <TableCell className="text-right text-muted-foreground tabular-nums">{product.minStock}</TableCell>
                <TableCell className="text-right tabular-nums">{formatBolivianos(product.stock * product.cost)}</TableCell>
                <TableCell>
                  <StockBadge status={product.stockStatus} isActive={product.isActive} />
                </TableCell>
                <TableCell className="pr-4">
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="icon-sm" title="Registrar ingreso" aria-label={`Ingreso de ${product.name}`} onClick={() => onEntry(product.id)}>
                      <ArrowDownToLine className="text-success" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      title="Registrar salida"
                      aria-label={`Salida de ${product.name}`}
                      onClick={() => onExit(product.id)}
                      disabled={product.availableStock <= 0}
                    >
                      <ArrowUpFromLine className="text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <Pagination page={page} pageSize={PAGE_SIZE} total={products.data?.total ?? 0} onPageChange={setPage} />
      </div>
    </div>
  )
}
