import { addDays, format, parseISO, startOfDay, startOfMonth, subDays, subMonths } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  CalendarClock,
  ChevronRight,
  PackageX,
  Plus,
  ShoppingBag,
  TrendingUp,
  Users,
  Wallet,
  type LucideIcon,
} from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { buttonVariants } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useBatches, useInventorySummary } from '@/features/inventory/hooks/useInventory'
import { getExpiry } from '@/features/inventory/lib/expiry'
import { useSales, useSalesSummary } from '@/features/sales/hooks/useSales'
import { toUserMessage } from '@/lib/errors'
import { cn, formatBolivianos } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth.store'
import { PaymentSplit } from '../components/PaymentSplit'
import { SalesTrendChart } from '../components/SalesTrendChart'
import { TopProductsChart } from '../components/TopProductsChart'
import { useActiveCustomerCount, useSalesByDay, useStockAlerts, useTopProducts } from '../hooks/useDashboard'

/** Periodos calculados una sola vez (hora local). */
function usePeriods() {
  const [periods] = useState(() => {
    const now = new Date()
    const today = startOfDay(now)
    const lastMonth = subMonths(now, 1)
    return {
      now,
      dayFrom: today,
      dayTo: addDays(today, 1),
      monthFrom: startOfMonth(now),
      monthTo: addDays(today, 1),
      // Mismo tramo del mes anterior (del 1 al mismo día) para comparar en igualdad.
      prevFrom: startOfMonth(lastMonth),
      prevTo: addDays(startOfDay(lastMonth), 1),
      trendFrom: subDays(today, 29),
      trendTo: today,
    }
  })
  return periods
}

function greeting(hour: number): string {
  if (hour < 12) return 'Buenos días'
  if (hour < 19) return 'Buenas tardes'
  return 'Buenas noches'
}

/** RF-06 · Resumen general del negocio con datos reales. */
export function DashboardPage() {
  const p = usePeriods()
  const profile = useAuthStore((state) => state.profile)
  const firstName = profile?.fullName.split(' ')[0] || 'Administrador'

  const today = useSalesSummary(p.dayFrom, p.dayTo)
  const month = useSalesSummary(p.monthFrom, p.monthTo)
  const previous = useSalesSummary(p.prevFrom, p.prevTo)
  const inventory = useInventorySummary()
  const customers = useActiveCustomerCount()
  const trend = useSalesByDay(p.trendFrom, p.trendTo)
  const top = useTopProducts(p.monthFrom, p.monthTo, 5)
  const stockAlerts = useStockAlerts()
  const expiring = useBatches({ filter: 'expiring', productId: null, page: 1, pageSize: 5 })
  const recent = useSales({ search: '', customerId: null, status: 'all', from: null, to: null, page: 1, pageSize: 5 })

  const change =
    month.data && previous.data && previous.data.totalAmount > 0
      ? Math.round(((month.data.totalAmount - previous.data.totalAmount) / previous.data.totalAmount) * 100)
      : null

  const trendTotal = trend.data?.reduce((sum, day) => sum + day.total, 0) ?? 0
  const alertCount = (stockAlerts.data?.length ?? 0) + (expiring.data?.total ?? 0) + (inventory.data?.expiredBatches ?? 0)

  return (
    <div className="space-y-6">
      {/* Bienvenida */}
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-bold tracking-[0.15em] text-brand">RESUMEN GENERAL</p>
          <h1 className="mt-1 font-heading text-2xl font-bold tracking-tight sm:text-3xl">
            {greeting(p.now.getHours())}, {firstName}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground first-letter:uppercase">
            {format(p.now, "EEEE d 'de' MMMM 'de' yyyy", { locale: es })} · esto es lo que pasa hoy en Vidalid.
          </p>
        </div>
        <Link to="/admin/ventas/nueva" className={buttonVariants({ className: 'h-9' })}>
          <Plus /> Nueva venta
        </Link>
      </section>

      {/* Indicadores */}
      <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Kpi
          icon={Wallet}
          label="Ventas de hoy"
          loading={today.isLoading}
          value={today.data ? formatBolivianos(today.data.totalAmount) : '—'}
          hint={today.data ? `${today.data.salesCount} venta${today.data.salesCount === 1 ? '' : 's'}` : undefined}
        />
        <Kpi
          icon={TrendingUp}
          label="Ventas del mes"
          loading={month.isLoading}
          value={month.data ? formatBolivianos(month.data.totalAmount) : '—'}
          hint={
            change === null ? (
              month.data ? `${month.data.salesCount} ventas` : undefined
            ) : (
              <span className="inline-flex items-center gap-0.5">
                {change >= 0 ? <ArrowUpRight className="size-3.5 text-success" /> : <ArrowDownRight className="size-3.5 text-destructive" />}
                <span className="font-semibold text-foreground">{change > 0 ? '+' : ''}{change}%</span> vs. mes anterior
              </span>
            )
          }
        />
        <Kpi
          icon={ShoppingBag}
          label="Valor del inventario"
          loading={inventory.isLoading}
          value={inventory.data ? formatBolivianos(inventory.data.inventoryValue) : '—'}
          hint={inventory.data ? `${inventory.data.totalUnits.toLocaleString('es-BO')} unidades · ${inventory.data.activeProducts} productos` : undefined}
          to="/admin/inventario"
        />
        <Kpi
          icon={Users}
          label="Clientes activos"
          loading={customers.isLoading}
          value={customers.data ? String(customers.data.total) : '—'}
          hint={customers.data ? `${customers.data.retailers} comerciantes minoristas` : undefined}
          to="/admin/clientes"
        />
      </section>

      {/* Tendencia + atención */}
      <section className="grid gap-4 lg:grid-cols-3">
        <Panel
          className="lg:col-span-2"
          title="Ventas de los últimos 30 días"
          subtitle={trend.data ? `Total del periodo: ${formatBolivianos(trendTotal)}` : undefined}
        >
          <QueryState query={trend} skeleton="h-64" empty={trendTotal === 0} emptyText="Aún no hay ventas en los últimos 30 días. Registra una venta para ver la tendencia.">
            {trend.data && <SalesTrendChart data={trend.data} />}
          </QueryState>
        </Panel>

        <Panel
          title="Atención necesaria"
          subtitle="Requieren seguimiento"
          badge={alertCount > 0 ? String(alertCount) : undefined}
        >
          {stockAlerts.isLoading || expiring.isLoading ? (
            <Skeleton className="h-48 w-full" />
          ) : alertCount === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Todo en orden: sin productos agotados, con stock bajo ni lotes por vencer.</p>
          ) : (
            <ul className="divide-y">
              {stockAlerts.data?.map((product) => (
                <AlertRow
                  key={product.id}
                  to="/admin/inventario"
                  icon={product.stockStatus === 'out' ? PackageX : AlertTriangle}
                  tone={product.stockStatus === 'out' ? 'danger' : 'warning'}
                  title={product.stockStatus === 'out' ? 'Agotado' : 'Stock bajo'}
                  detail={`${product.name} · ${product.availableStock} / mín. ${product.minStock} ${product.unit}`}
                />
              ))}
              {(inventory.data?.expiredBatches ?? 0) > 0 && (
                <AlertRow to="/admin/inventario" icon={CalendarClock} tone="danger" title="Lotes vencidos" detail={`${inventory.data!.expiredBatches} lote(s) con stock vencido`} />
              )}
              {expiring.data?.rows.map((batch) => (
                <AlertRow
                  key={batch.id}
                  to="/admin/inventario"
                  icon={CalendarClock}
                  tone="warning"
                  title="Próximo a vencer"
                  detail={`${batch.productName} · ${batch.quantity} ${batch.unit} · ${getExpiry(batch.expiresAt).label}`}
                />
              ))}
            </ul>
          )}
        </Panel>
      </section>

      {/* Más vendidos + pagos */}
      <section className="grid gap-4 lg:grid-cols-3">
        <Panel className="lg:col-span-2" title="Productos más vendidos" subtitle="Este mes, por unidades vendidas">
          <QueryState query={top} skeleton="h-52" empty={top.data?.length === 0} emptyText="Todavía no hay productos vendidos este mes.">
            {top.data && <TopProductsChart data={top.data} />}
          </QueryState>
        </Panel>

        <Panel title="Cobros del mes" subtitle="Efectivo y QR">
          {month.isLoading ? <Skeleton className="h-32 w-full" /> : month.data && <PaymentSplit cash={month.data.cashTotal} qr={month.data.qrTotal} />}
          {month.data && month.data.salesCount > 0 && (
            <dl className="mt-4 grid grid-cols-2 gap-3 border-t pt-4 text-sm">
              <div>
                <dt className="text-xs text-muted-foreground">Ticket promedio</dt>
                <dd className="font-semibold tabular-nums">{formatBolivianos(month.data.averageTicket)}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Unidades vendidas</dt>
                <dd className="font-semibold tabular-nums">{month.data.unitsSold.toLocaleString('es-BO')}</dd>
              </div>
            </dl>
          )}
        </Panel>
      </section>

      {/* Ventas recientes */}
      <Panel
        title="Ventas recientes"
        subtitle="Últimos movimientos comerciales"
        action={
          <Link to="/admin/ventas" className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline">
            Ver todas <ChevronRight className="size-3.5" />
          </Link>
        }
      >
        <QueryState query={recent} skeleton="h-40" empty={recent.data?.rows.length === 0} emptyText="Todavía no hay ventas registradas.">
          <ul className="divide-y">
            {recent.data?.rows.map((sale) => (
              <li key={sale.id} className={cn('flex items-center gap-3 py-2.5', sale.status === 'voided' && 'opacity-60')}>
                <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-secondary text-primary">
                  <ShoppingBag className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {sale.code} · {sale.customerName ?? 'Cliente ocasional'}
                  </p>
                  <p className="text-xs text-muted-foreground">{format(parseISO(sale.createdAt), "d MMM, HH:mm", { locale: es })}</p>
                </div>
                <div className="text-right">
                  <p className={cn('text-sm font-semibold tabular-nums', sale.status === 'voided' && 'line-through')}>{formatBolivianos(sale.total)}</p>
                  <p className={cn('text-xs font-semibold', sale.status === 'completed' ? 'text-success' : 'text-destructive')}>
                    {sale.status === 'completed' ? 'Completada' : 'Anulada'}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </QueryState>
      </Panel>
    </div>
  )
}

// ---------------------------------------------------------------------
// Piezas del dashboard
// ---------------------------------------------------------------------

interface KpiProps {
  icon: LucideIcon
  label: string
  value: string
  hint?: ReactNode
  loading?: boolean
  to?: string
}

function Kpi({ icon: Icon, label, value, hint, loading, to }: KpiProps) {
  const body = (
    <>
      <div className="flex items-start justify-between gap-2">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-secondary text-brand">
          <Icon className="size-4" />
        </span>
      </div>
      {loading ? (
        <Skeleton className="mt-2 h-7 w-24" />
      ) : (
        <p className="mt-1 font-heading text-lg font-bold break-words tabular-nums sm:text-2xl">{value}</p>
      )}
      {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
    </>
  )
  const className = 'block rounded-xl border bg-card p-4 shadow-xs'
  return to ? (
    <Link to={to} className={cn(className, 'transition hover:border-primary/40')}>
      {body}
    </Link>
  ) : (
    <div className={className}>{body}</div>
  )
}

interface PanelProps {
  title: string
  subtitle?: string
  badge?: string
  action?: ReactNode
  className?: string
  children: ReactNode
}

function Panel({ title, subtitle, badge, action, className, children }: PanelProps) {
  return (
    <article className={cn('min-w-0 rounded-xl border bg-card p-4 shadow-xs sm:p-5', className)}>
      <header className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="font-heading text-sm font-bold">{title}</h2>
          {subtitle && <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        {badge && <span className="rounded-md bg-warning/12 px-2 py-0.5 text-xs font-semibold text-warning">{badge}</span>}
        {action}
      </header>
      {children}
    </article>
  )
}

interface QueryStateProps {
  query: { isLoading: boolean; isError: boolean; error: unknown }
  skeleton: string
  empty: boolean | undefined
  emptyText: string
  children: ReactNode
}

/** Estados de carga, error y vacío comunes a los paneles. */
function QueryState({ query, skeleton, empty, emptyText, children }: QueryStateProps) {
  if (query.isLoading) return <Skeleton className={cn('w-full', skeleton)} />
  if (query.isError) return <p className="py-8 text-center text-sm text-destructive">{toUserMessage(query.error, 'No se pudieron cargar los datos.')}</p>
  if (empty) return <p className="py-10 text-center text-sm text-muted-foreground">{emptyText}</p>
  return <>{children}</>
}

function AlertRow({ to, icon: Icon, tone, title, detail }: { to: string; icon: LucideIcon; tone: 'warning' | 'danger'; title: string; detail: string }) {
  return (
    <li>
      <Link to={to} className="flex items-center gap-3 py-2.5 hover:bg-muted/40">
        <span className={cn('grid size-8 shrink-0 place-items-center rounded-lg', tone === 'danger' ? 'bg-destructive/10 text-destructive' : 'bg-warning/12 text-warning')}>
          <Icon className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">{title}</p>
          <p className="truncate text-xs text-muted-foreground">{detail}</p>
        </div>
        <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
      </Link>
    </li>
  )
}
