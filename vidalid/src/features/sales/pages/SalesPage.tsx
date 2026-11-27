import { addDays, format, parseISO, startOfDay, startOfMonth } from 'date-fns'
import { Banknote, CalendarDays, Eye, Plus, QrCode, Receipt, Search, TrendingUp } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { PageHeader } from '@/components/shared/PageHeader'
import { Pagination } from '@/components/shared/Pagination'
import { SimpleSelect, type SelectOption } from '@/components/shared/SimpleSelect'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { CustomerPicker } from '@/features/customers/components/CustomerPicker'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { toUserMessage } from '@/lib/errors'
import { cn, formatBolivianos } from '@/lib/utils'
import { ReceiptDialog } from '../components/ReceiptDialog'
import { SaleDetailSheet } from '../components/SaleDetailSheet'
import { VoidSaleDialog } from '../components/VoidSaleDialog'
import { useSales, useSalesSummary } from '../hooks/useSales'
import { paymentLabels, type SaleFilters } from '../types'

const PAGE_SIZE = 15

const statusOptions: SelectOption[] = [
  { value: 'all', label: 'Todas' },
  { value: 'completed', label: 'Completadas' },
  { value: 'voided', label: 'Anuladas' },
]

/** Límites del día y del mes en la hora local (calculados una vez). */
function usePeriods() {
  const [periods] = useState(() => {
    const now = new Date()
    return {
      dayFrom: startOfDay(now),
      dayTo: addDays(startOfDay(now), 1),
      monthFrom: startOfMonth(now),
      monthTo: addDays(startOfDay(now), 1),
    }
  })
  return periods
}

/** RF-43 · Historial de ventas con resumen del día y del mes. */
export function SalesPage() {
  const periods = usePeriods()
  const today = useSalesSummary(periods.dayFrom, periods.dayTo)
  const month = useSalesSummary(periods.monthFrom, periods.monthTo)

  const [search, setSearch] = useState('')
  const [customerId, setCustomerId] = useState<string | null>(null)
  const [status, setStatus] = useState<SaleFilters['status']>('all')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [page, setPage] = useState(1)

  const [detailId, setDetailId] = useState<string | null>(null)
  const [receiptId, setReceiptId] = useState<string | null>(null)
  const [voiding, setVoiding] = useState<{ id: string; code: string; total: number } | null>(null)
  const [voidKey, setVoidKey] = useState(0)

  const debouncedSearch = useDebouncedValue(search)
  const sales = useSales({ search: debouncedSearch, customerId, status, from: from || null, to: to || null, page, pageSize: PAGE_SIZE })
  const rows = sales.data?.rows ?? []
  const hasFilters = !!(debouncedSearch || customerId || status !== 'all' || from || to)

  const reset = <T,>(setter: (value: T) => void) => (value: T) => {
    setter(value)
    setPage(1)
  }

  return (
    <>
      <PageHeader
        title="Ventas"
        description="Historial de ventas, pagos y comprobantes."
        actions={
          <Link to="/admin/ventas/nueva" className={buttonVariants()}>
            <Plus /> Nueva venta
          </Link>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <SummaryCard icon={CalendarDays} label="Ventas de hoy" loading={today.isLoading} value={today.data ? formatBolivianos(today.data.totalAmount) : ''} hint={today.data ? `${today.data.salesCount} ventas` : ''} />
        <SummaryCard icon={TrendingUp} label="Ventas del mes" loading={month.isLoading} value={month.data ? formatBolivianos(month.data.totalAmount) : ''} hint={month.data ? `${month.data.salesCount} ventas · ${month.data.unitsSold} unidades` : ''} />
        <SummaryCard icon={Receipt} label="Ticket promedio (mes)" loading={month.isLoading} value={month.data ? formatBolivianos(month.data.averageTicket) : ''} hint={month.data?.voidedCount ? `${month.data.voidedCount} anuladas` : 'Sin anulaciones'} />
        <SummaryCard
          icon={Banknote}
          label="Efectivo / QR (mes)"
          loading={month.isLoading}
          value={month.data ? formatBolivianos(month.data.cashTotal) : ''}
          hint={month.data ? `QR: ${formatBolivianos(month.data.qrTotal)}` : ''}
        />
      </div>

      <div className="space-y-4">
        <div className="grid gap-3 rounded-xl border bg-card p-3 md:grid-cols-2 xl:grid-cols-[170px_1fr_160px_150px_150px_auto]">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(event) => reset(setSearch)(event.target.value)} placeholder="N.º VTA-…" className="h-9 bg-card pl-9" aria-label="Buscar por número" />
          </div>
          <CustomerPicker value={customerId} onChange={(customer) => reset(setCustomerId)(customer?.id ?? null)} placeholder="Filtrar por cliente…" className="h-9" />
          <SimpleSelect aria-label="Estado" value={status} onChange={(value) => reset(setStatus)((value ?? 'all') as SaleFilters['status'])} options={statusOptions} />
          <Input type="date" value={from} max={to || undefined} onChange={(event) => reset(setFrom)(event.target.value)} className="h-9 bg-card" aria-label="Desde" title="Desde" />
          <Input type="date" value={to} min={from || undefined} onChange={(event) => reset(setTo)(event.target.value)} className="h-9 bg-card" aria-label="Hasta" title="Hasta" />
          <Button
            variant="ghost"
            className="h-9"
            disabled={!hasFilters}
            onClick={() => {
              setSearch('')
              setCustomerId(null)
              setStatus('all')
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
                <TableHead className="pl-4">Venta</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Pago</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="pr-4 text-right">Detalle</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sales.isLoading &&
                Array.from({ length: 5 }).map((_, index) => (
                  <TableRow key={index}>
                    <TableCell colSpan={7} className="px-4">
                      <Skeleton className="h-8 w-full" />
                    </TableCell>
                  </TableRow>
                ))}
              {sales.isError && (
                <TableRow>
                  <TableCell colSpan={7} className="py-10 text-center text-sm text-destructive">
                    {toUserMessage(sales.error, 'No se pudo cargar el historial de ventas.')}
                  </TableCell>
                </TableRow>
              )}
              {!sales.isLoading && !sales.isError && rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="py-12 text-center text-sm text-muted-foreground">
                    {hasFilters ? 'No hay ventas con esos filtros.' : 'Todavía no hay ventas. Registra la primera con “Nueva venta”.'}
                  </TableCell>
                </TableRow>
              )}
              {rows.map((sale) => (
                <TableRow key={sale.id} className={cn('cursor-pointer', sale.status === 'voided' && 'opacity-60')} onClick={() => setDetailId(sale.id)}>
                  <TableCell className="pl-4 font-medium">{sale.code}</TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">{format(parseISO(sale.createdAt), 'dd/MM/yyyy HH:mm')}</TableCell>
                  <TableCell>
                    <p>{sale.customerName ?? <span className="text-muted-foreground">Cliente ocasional</span>}</p>
                    {sale.businessName && <p className="text-xs text-muted-foreground">{sale.businessName}</p>}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {sale.paymentMethods.map((method) => (
                        <span key={method} className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs">
                          {method === 'qr' ? <QrCode className="size-3" /> : <Banknote className="size-3" />}
                          {paymentLabels[method]}
                        </span>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className={cn('text-right font-semibold tabular-nums', sale.status === 'voided' && 'line-through')}>{formatBolivianos(sale.total)}</TableCell>
                  <TableCell>
                    <span
                      className={cn(
                        'rounded-full px-2 py-0.5 text-xs font-semibold',
                        sale.status === 'completed' ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive',
                      )}
                    >
                      {sale.status === 'completed' ? 'Completada' : 'Anulada'}
                    </span>
                  </TableCell>
                  <TableCell className="pr-4 text-right">
                    <Button variant="ghost" size="icon-sm" aria-label={`Ver ${sale.code}`} title="Ver detalle">
                      <Eye />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Pagination page={page} pageSize={PAGE_SIZE} total={sales.data?.total ?? 0} onPageChange={setPage} />
        </div>
      </div>

      <SaleDetailSheet
        saleId={detailId}
        onOpenChange={(open) => !open && setDetailId(null)}
        onPrint={(id) => setReceiptId(id)}
        onVoid={(sale) => {
          setVoidKey((key) => key + 1)
          setVoiding(sale)
        }}
      />
      <ReceiptDialog saleId={receiptId} onOpenChange={(open) => !open && setReceiptId(null)} />
      <VoidSaleDialog key={voidKey} sale={voiding} onOpenChange={(open) => !open && setVoiding(null)} />
    </>
  )
}

function SummaryCard({ icon: Icon, label, value, hint, loading }: { icon: typeof CalendarDays; label: string; value: string; hint?: string; loading?: boolean }) {
  return (
    <div className="rounded-xl border bg-card p-4 shadow-xs">
      <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>{label}</span>
        <span className="grid size-8 place-items-center rounded-lg bg-secondary text-primary">
          <Icon className="size-4" />
        </span>
      </div>
      {loading ? <Skeleton className="mt-2 h-7 w-24" /> : <p className="mt-1 font-heading text-lg font-bold break-words tabular-nums sm:text-2xl">{value}</p>}
      {hint && <p className="mt-1 truncate text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}
