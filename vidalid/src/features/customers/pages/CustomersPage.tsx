import { formatDistanceToNow, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { CalendarClock, Eye, Pencil, Search, UserPlus } from 'lucide-react'
import { useState } from 'react'
import { PageHeader } from '@/components/shared/PageHeader'
import { Pagination } from '@/components/shared/Pagination'
import { SimpleSelect, type SelectOption } from '@/components/shared/SimpleSelect'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { toUserMessage } from '@/lib/errors'
import { cn, formatBolivianos } from '@/lib/utils'
import { CustomerDetailSheet } from '../components/CustomerDetailSheet'
import { CustomerFormDialog } from '../components/CustomerFormDialog'
import { WhatsAppButton } from '../components/WhatsAppButton'
import { useCustomers } from '../hooks/useCustomers'
import type { CustomerSort, CustomerStatusFilter, CustomerSummary, CustomerTypeFilter } from '../types'

const PAGE_SIZE = 10

const typeOptions: SelectOption[] = [
  { value: 'all', label: 'Todos los tipos' },
  { value: 'retailer', label: 'Comerciantes minoristas' },
  { value: 'final_consumer', label: 'Consumidores finales' },
]

const statusOptions: SelectOption[] = [
  { value: 'active', label: 'Activos' },
  { value: 'follow_up', label: 'Con seguimiento pendiente' },
  { value: 'inactive', label: 'Inactivos' },
  { value: 'all', label: 'Todos' },
]

const sortOptions: SelectOption[] = [
  { value: 'name', label: 'Ordenar: nombre' },
  { value: 'purchases', label: 'Más frecuentes' },
  { value: 'spent', label: 'Mayor compra total' },
  { value: 'recent', label: 'Compra más reciente' },
]

export function CustomersPage() {
  const [search, setSearch] = useState('')
  const [type, setType] = useState<CustomerTypeFilter>('all')
  const [status, setStatus] = useState<CustomerStatusFilter>('active')
  const [sort, setSort] = useState<CustomerSort>('name')
  const [page, setPage] = useState(1)

  const [detailId, setDetailId] = useState<string | null>(null)
  const [editing, setEditing] = useState<CustomerSummary | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [formKey, setFormKey] = useState(0)

  const debouncedSearch = useDebouncedValue(search)
  const customers = useCustomers({ search: debouncedSearch, type, status, sort, page, pageSize: PAGE_SIZE })
  const rows = customers.data?.rows ?? []

  const openForm = (customer: CustomerSummary | null) => {
    setEditing(customer)
    setFormKey((key) => key + 1)
    setFormOpen(true)
  }

  const withPageReset = <T,>(setter: (value: T) => void) => (value: T) => {
    setter(value)
    setPage(1)
  }

  return (
    <>
      <PageHeader
        title="Clientes / CRM"
        description="Comerciantes y consumidores, su historial de compras y los seguimientos comerciales."
        actions={
          <Button onClick={() => openForm(null)}>
            <UserPlus /> Nuevo cliente
          </Button>
        }
      />

      <div className="space-y-4">
        <div className="grid gap-3 rounded-xl border bg-card p-3 md:grid-cols-2 xl:grid-cols-[1fr_210px_230px_200px]">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => withPageReset(setSearch)(event.target.value)}
              placeholder="Buscar por nombre, negocio o teléfono…"
              className="h-9 bg-card pl-9"
              aria-label="Buscar clientes"
            />
          </div>
          <SimpleSelect aria-label="Tipo de cliente" value={type} onChange={(value) => withPageReset(setType)((value ?? 'all') as CustomerTypeFilter)} options={typeOptions} />
          <SimpleSelect aria-label="Estado" value={status} onChange={(value) => withPageReset(setStatus)((value ?? 'active') as CustomerStatusFilter)} options={statusOptions} />
          <SimpleSelect aria-label="Ordenar" value={sort} onChange={(value) => withPageReset(setSort)((value ?? 'name') as CustomerSort)} options={sortOptions} />
        </div>

        <div className="overflow-hidden rounded-xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="pl-4">Cliente</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Teléfono</TableHead>
                <TableHead className="text-right">Compras</TableHead>
                <TableHead className="text-right">Total comprado</TableHead>
                <TableHead>Última compra</TableHead>
                <TableHead>Seguimiento</TableHead>
                <TableHead className="pr-4 text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customers.isLoading &&
                Array.from({ length: 5 }).map((_, index) => (
                  <TableRow key={index}>
                    <TableCell colSpan={8} className="px-4">
                      <Skeleton className="h-9 w-full" />
                    </TableCell>
                  </TableRow>
                ))}
              {customers.isError && (
                <TableRow>
                  <TableCell colSpan={8} className="py-10 text-center text-sm text-destructive">
                    {toUserMessage(customers.error, 'No se pudieron cargar los clientes.')}
                  </TableCell>
                </TableRow>
              )}
              {!customers.isLoading && !customers.isError && rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="py-12 text-center text-sm text-muted-foreground">
                    {debouncedSearch || type !== 'all' || status !== 'active' ? 'No hay clientes con esos filtros.' : 'Aún no hay clientes. Registra el primero.'}
                  </TableCell>
                </TableRow>
              )}
              {rows.map((customer) => (
                <TableRow key={customer.id} className={cn('cursor-pointer', !customer.isActive && 'opacity-60')} onClick={() => setDetailId(customer.id)}>
                  <TableCell className="pl-4">
                    <p className="font-medium">{customer.name}</p>
                    {customer.businessName && <p className="text-xs text-muted-foreground">{customer.businessName}</p>}
                  </TableCell>
                  <TableCell>
                    <span
                      className={cn(
                        'rounded-full px-2 py-0.5 text-xs font-semibold whitespace-nowrap',
                        customer.customerType === 'retailer' ? 'bg-secondary text-secondary-foreground' : 'bg-chart-5/12 text-chart-5',
                      )}
                    >
                      {customer.customerType === 'retailer' ? 'Minorista' : 'Consumidor'}
                    </span>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    <div className="flex items-center gap-1" onClick={(event) => event.stopPropagation()}>
                      {customer.phone ?? '—'}
                      <WhatsAppButton phone={customer.phone} />
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">{customer.purchaseCount}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatBolivianos(customer.totalSpent)}</TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {customer.lastPurchaseAt ? formatDistanceToNow(parseISO(customer.lastPurchaseAt), { locale: es, addSuffix: true }) : '—'}
                  </TableCell>
                  <TableCell>
                    {customer.pendingFollowUps > 0 ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-warning/12 px-2 py-0.5 text-xs font-semibold whitespace-nowrap text-warning">
                        <CalendarClock className="size-3.5" /> {customer.pendingFollowUps} pendiente{customer.pendingFollowUps > 1 ? 's' : ''}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="pr-4" onClick={(event) => event.stopPropagation()}>
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon-sm" title="Ver ficha" aria-label={`Ver ficha de ${customer.name}`} onClick={() => setDetailId(customer.id)}>
                        <Eye />
                      </Button>
                      <Button variant="ghost" size="icon-sm" title="Editar" aria-label={`Editar ${customer.name}`} onClick={() => openForm(customer)}>
                        <Pencil />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Pagination page={page} pageSize={PAGE_SIZE} total={customers.data?.total ?? 0} onPageChange={setPage} />
        </div>
      </div>

      <CustomerDetailSheet
        customerId={detailId}
        onOpenChange={(open) => !open && setDetailId(null)}
        onEdit={(customer) => openForm(customer)}
      />

      <CustomerFormDialog key={formKey} open={formOpen} onOpenChange={setFormOpen} customer={editing} onSaved={(id) => !editing && setDetailId(id)} />
    </>
  )
}
