import { Bar, BarChart, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { formatBolivianos } from '@/lib/utils'
import type { TopProduct } from '../services/dashboard.service'

const BRAND = '#678c30'
const AXIS_TEXT = '#66705c'
const INK = '#26351a'

interface TooltipProps {
  active?: boolean
  payload?: readonly { payload: TopProduct }[]
}

function TopTooltip({ active, payload }: TooltipProps) {
  const item = payload?.[0]?.payload
  if (!active || !item) return null
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-xs shadow-md">
      <p className="font-medium text-foreground">{item.name}</p>
      <p className="text-muted-foreground">{item.sku}</p>
      <p className="mt-1 text-foreground">
        <span className="font-semibold tabular-nums">{item.unitsSold}</span> {item.unit} vendidas
      </p>
      <p className="text-foreground tabular-nums">{formatBolivianos(item.revenue)}</p>
    </div>
  )
}

const truncate = (text: string, max = 18) => (text.length > max ? `${text.slice(0, max - 1)}…` : text)

/** Productos más vendidos (barras horizontales, una serie: unidades vendidas). */
export function TopProductsChart({ data }: { data: TopProduct[] }) {
  const height = Math.max(160, data.length * 44)

  return (
    <>
      <div className="w-full" style={{ height }} role="img" aria-label="Gráfico de productos más vendidos por unidades">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 4, right: 40, bottom: 4, left: 0 }} barCategoryGap={10}>
            <XAxis type="number" hide allowDecimals={false} />
            <YAxis
              type="category"
              dataKey="name"
              width={130}
              tickFormatter={(name: string) => truncate(name)}
              tick={{ fill: INK, fontSize: 12 }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip content={(props) => <TopTooltip {...(props as TooltipProps)} />} cursor={{ fill: 'rgba(103,140,48,0.08)' }} />
            <Bar dataKey="unitsSold" fill={BRAND} radius={[0, 4, 4, 0]} maxBarSize={22}>
              <LabelList dataKey="unitsSold" position="right" fill={AXIS_TEXT} fontSize={12} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <table className="sr-only">
        <caption>Productos más vendidos</caption>
        <thead>
          <tr>
            <th>Producto</th>
            <th>Unidades</th>
            <th>Ingresos</th>
          </tr>
        </thead>
        <tbody>
          {data.map((item) => (
            <tr key={item.productId}>
              <td>{item.name}</td>
              <td>{item.unitsSold}</td>
              <td>{formatBolivianos(item.revenue)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  )
}
