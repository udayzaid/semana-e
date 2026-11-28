import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { formatBolivianos } from '@/lib/utils'
import type { DailySales } from '../services/dashboard.service'

const BRAND = '#678c30'
const GRID = '#e2e6dc'
const AXIS_TEXT = '#66705c'

const compactBs = (value: number) => (value >= 1000 ? `${(value / 1000).toLocaleString('es-BO', { maximumFractionDigits: 1 })}k` : `${value}`)

interface TooltipProps {
  active?: boolean
  payload?: readonly { payload: DailySales }[]
}

function TrendTooltip({ active, payload }: TooltipProps) {
  const point = payload?.[0]?.payload
  if (!active || !point) return null
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-xs shadow-md">
      <p className="font-medium text-foreground first-letter:uppercase">{format(parseISO(point.day), "EEEE d 'de' MMMM", { locale: es })}</p>
      <p className="mt-1 flex items-center gap-1.5 text-foreground">
        <span className="size-2 rounded-full" style={{ background: BRAND }} />
        <span className="font-semibold tabular-nums">{formatBolivianos(point.total)}</span>
      </p>
      <p className="text-muted-foreground">
        {point.count} venta{point.count === 1 ? '' : 's'}
      </p>
    </div>
  )
}

/** Ventas por día (serie única: el título nombra la serie, sin leyenda). */
export function SalesTrendChart({ data }: { data: DailySales[] }) {
  return (
    <>
      <div className="h-56 w-full sm:h-64" role="img" aria-label="Gráfico de ventas por día de los últimos 30 días">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="salesTrendFill" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor={BRAND} stopOpacity={0.22} />
                <stop offset="100%" stopColor={BRAND} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke={GRID} strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="day"
              tickFormatter={(day: string) => format(parseISO(day), 'd MMM', { locale: es })}
              tick={{ fill: AXIS_TEXT, fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: GRID }}
              minTickGap={24}
            />
            <YAxis tickFormatter={compactBs} tick={{ fill: AXIS_TEXT, fontSize: 11 }} tickLine={false} axisLine={false} width={40} allowDecimals={false} />
            <Tooltip content={(props) => <TrendTooltip {...(props as TooltipProps)} />} cursor={{ stroke: AXIS_TEXT, strokeDasharray: '3 3' }} />
            <Area
              type="monotone"
              dataKey="total"
              stroke={BRAND}
              strokeWidth={2}
              fill="url(#salesTrendFill)"
              activeDot={{ r: 5, stroke: '#ffffff', strokeWidth: 2, fill: BRAND }}
              dot={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Vista de tabla para lectores de pantalla */}
      <table className="sr-only">
        <caption>Ventas por día</caption>
        <thead>
          <tr>
            <th>Día</th>
            <th>Total</th>
            <th>Ventas</th>
          </tr>
        </thead>
        <tbody>
          {data.map((point) => (
            <tr key={point.day}>
              <td>{point.day}</td>
              <td>{formatBolivianos(point.total)}</td>
              <td>{point.count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  )
}
