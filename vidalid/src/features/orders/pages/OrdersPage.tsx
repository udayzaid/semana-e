import { formatDistanceToNow, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { Eye, Globe, MessageCircle, Plus, Search, Store, Truck, UserRound } from 'lucide-react'
import { useState } from 'react'
import { PageHeader } from '@/components/shared/PageHeader'
import { Pagination } from '@/components/shared/Pagination'
import { SimpleSelect } from '@/components/shared/SimpleSelect'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { toUserMessage } from '@/lib/errors'
import { cn, formatBolivianos } from '@/lib/utils'
import { NewOrderDialog } from '../components/NewOrderDialog'
import { OrderDetailSheet } from '../components/OrderDetailSheet'
import { OrderStatusBadge } from '../components/OrderStatusBadge'
import { useOrderStatusCounts, useOrders } from '../hooks/useOrders'
import { ACTIVE_STATUSES, DISPATCH_STATUSES, sourceLabels, statusLabels, type OrderSource, type OrderStatus, type OrderStatusFilter } from '../types'

const PAGE_SIZE = 15

const sourceIcons: Record<OrderSource, typeof Globe> = { whatsapp: MessageCircle, manual: UserRound, web: Globe }

const sourceOptions = [
  { value: 'all', label: 'Todos los orígenes' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'web', label: 'Portal web' },
  { value: 'manual', label: 'Manual' },
]

interface OrdersPageProps {
  /** orders = gestión de pedidos · distribution = preparación y despacho (RF-53 a RF-60) */
  mode?: 'orders' | 'distribution'
}

export function OrdersPage({ mode = 'orders' }: OrdersPageProps) {
  const isDistribution = mode === 'distribution'
  const chips: { value: OrderStatusFilter; label: string; statuses: OrderStatus[] }[] = isDistribution
    ? [
        { value: 'dispatch', label: 'Por atender', statuses: DISPATCH_STATUSES },
        ...DISPATCH_STATUSES.map((status) => ({ value: status, label: statusLabels[status], statuses: [status] })),
        { value: 'delivered', label: 'Entregados', statuses: ['delivered'] },
      ]
    : [
        { value: 'active', label: 'En curso', statuses: ACTIVE_STATUSES },
        ...ACTIVE_STATUSES.map((status) => ({ value: status, label: statusLabels[status], statuses: [status] })),
        { value: 'delivered', label: 'Entregados', statuses: ['delivered'] },
        { value: 'cancelled', label: 'Cancelados', statuses: ['cancelled'] },
        { value: 'all', label: 'Todos', statuses: [] },
      ]

  const [status, setStatus] = useState<OrderStatusFilter>(chips[0].value)
  const [search, setSearch] = useState('')
  const [source, setSource] = useState<OrderSource | null>(null)
  const [page, setPage] = useState(1)
  const [detailId, setDetailId] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [createKey, setCreateKey] = useState(0)

  const debouncedSearch = useDebouncedValue(search)
  const orders = useOrders({ status, search: debouncedSearch, source, page, pageSize: PAGE_SIZE })
  const counts = useOrderStatusCounts()
  const rows = orders.data?.rows ?? []

  const countFor = (statuses: OrderStatus[]) =>
    statuses.length === 0 ? Object.values(counts.data ?? {}).reduce((sum, n) => sum + (n ?? 0), 0) : statuses.reduce((sum, s) => sum + (counts.data?.[s] ?? 0), 0)

  return (
    <>
      <PageHeader
        title={isDistribution ? 'Distribución' : 'Pedidos'}
        description={
          isDistribution
            ? 'Pedidos confirmados por preparar, despachar o entregar. Los más antiguos primero.'
            : 'Pedidos de WhatsApp, del portal web y registrados en persona.'
        }
        actions={
          !isDistribution && (
            <Button
              onClick={() => {
                setCreateKey((key) => key + 1)
                setCreating(true)
              }}
            >
              <Plus /> Nuevo pedido
            </Button>
          )
        }
      />

      <div className="space-y-4">
        {/* Estados */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {chips.map((chip) => (
            <button
              key={chip.value}
              type="button"
              onClick={() => {
                setStatus(chip.value)
                setPage(1)
              }}
              aria-pressed={status === chip.value}
              className={cn(
                'flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition',
                status === chip.value ? 'border-primary bg-primary text-primary-foreground' : 'bg-card hover:border-primary/40',
              )}
            >
              {chip.label}
              <span className={cn('rounded-full px-1.5 tabular-nums', status === chip.value ? 'bg-white/20' : 'bg-muted')}>{countFor(chip.statuses)}</span>
            </button>
          ))}
        </div>

        <div className="grid gap-3 rounded-xl border bg-card p-3 sm:grid-cols-[1fr_220px]">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value)
                setPage(1)
              }}
              placeholder="Buscar por N.º de pedido, nombre o teléfono…"
              className="h-9 bg-card pl-9"
              aria-label="Buscar pedidos"
            />
          </div>
          <SimpleSelect
            aria-label="Origen"
            value={source ?? 'all'}
            onChange={(value) => {
              setSource(value === 'all' || !value ? null : (value as OrderSource))
              setPage(1)
            }}
            options={sourceOptions}
          />
        </div>

        <div className="overflow-hidden rounded-xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="pl-4">Pedido</TableHead>
                <TableHead>Cliente / contacto</TableHead>
                <TableHead>Origen</TableHead>
                <TableHead>Entrega</TableHead>
                <TableHead className="text-right">Unid.</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="pr-4 text-right">Ver</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.isLoading &&
                Array.from({ length: 5 }).map((_, index) => (
                  <TableRow key={index}>
                    <TableCell colSpan={8} className="px-4">
                      <Skeleton className="h-9 w-full" />
                    </TableCell>
                  </TableRow>
                ))}
              {orders.isError && (
                <TableRow>
                  <TableCell colSpan={8} className="py-10 text-center text-sm text-destructive">
                    {toUserMessage(orders.error, 'No se pudieron cargar los pedidos.')}
                  </TableCell>
                </TableRow>
              )}
              {!orders.isLoading && !orders.isError && rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="py-12 text-center text-sm text-muted-foreground">
                    {isDistribution ? 'No hay pedidos por atender. Los pedidos confirmados aparecerán aquí.' : 'No hay pedidos con esos filtros.'}
                  </TableCell>
                </TableRow>
              )}
              {rows.map((order) => {
                const SourceIcon = sourceIcons[order.source]
                return (
                  <TableRow key={order.id} className="cursor-pointer" onClick={() => setDetailId(order.id)}>
                    <TableCell className="pl-4">
                      <p className="font-medium">{order.code}</p>
                      <p className="text-xs text-muted-foreground">{formatDistanceToNow(parseISO(order.createdAt), { locale: es, addSuffix: true })}</p>
                    </TableCell>
                    <TableCell>
                      <p>{order.customerName ?? order.contactName}</p>
                      <p className="text-xs text-muted-foreground">{order.contactPhone}</p>
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                        <SourceIcon className="size-3.5" /> {sourceLabels[order.source]}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                        {order.deliveryMode === 'pickup' ? <Store className="size-3.5" /> : <Truck className="size-3.5" />}
                        {order.deliveryMode === 'pickup' ? 'Recogida' : 'Envío'}
                      </span>
                      {order.assignedTo && <p className="text-xs text-muted-foreground">{order.assignedTo}</p>}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{order.itemCount}</TableCell>
                    <TableCell className="text-right font-semibold tabular-nums">{formatBolivianos(order.subtotal)}</TableCell>
                    <TableCell>
                      <OrderStatusBadge status={order.status} />
                    </TableCell>
                    <TableCell className="pr-4 text-right">
                      <Button variant="ghost" size="icon-sm" aria-label={`Ver ${order.code}`}>
                        <Eye />
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
          <Pagination page={page} pageSize={PAGE_SIZE} total={orders.data?.total ?? 0} onPageChange={setPage} />
        </div>
      </div>

      <OrderDetailSheet orderId={detailId} onOpenChange={(open) => !open && setDetailId(null)} />
      <NewOrderDialog key={createKey} open={creating} onOpenChange={setCreating} onCreated={(id) => setDetailId(id)} />
    </>
  )
}
