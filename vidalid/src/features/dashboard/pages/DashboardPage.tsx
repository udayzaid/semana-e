import { ArrowDownRight, ArrowUpRight, ClipboardList, Package, ShoppingBag, Truck, Users, Wallet } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '@/stores/auth.store'

// TODO(dashboard): reemplazar estos datos de demostración por consultas reales a Supabase.
const stats = [
  { label: 'Ventas del día', value: 'Bs 2.840', change: '+12,8%', up: true, icon: Wallet, tone: 'green' },
  { label: 'Pedidos pendientes', value: '18', change: '6 por preparar', up: false, icon: ClipboardList, tone: 'amber' },
  { label: 'Productos activos', value: '246', change: '12 categorías', up: true, icon: Package, tone: 'blue' },
  { label: 'Clientes registrados', value: '184', change: '+8 este mes', up: true, icon: Users, tone: 'violet' },
]

const products = [
  { name: 'Omega 3 Premium', sku: 'VID-001', category: 'Suplementos', stock: 42, status: 'Disponible', tone: 'ok', price: 'Bs 85,00' },
  { name: 'Maca Andina', sku: 'VID-014', category: 'Extractos naturales', stock: 8, status: 'Stock bajo', tone: 'low', price: 'Bs 65,00' },
  { name: 'Colágeno Hidrolizado', sku: 'VID-027', category: 'Suplementos', stock: 0, status: 'Agotado', tone: 'out', price: 'Bs 120,00' },
  { name: 'Vitamina C 1000 mg', sku: 'VID-032', category: 'Vitaminas', stock: 31, status: 'Disponible', tone: 'ok', price: 'Bs 48,00' },
]

const orders = [
  { id: '#PED-0248', customer: 'Distribuidora San Miguel', date: 'Hoy, 10:42', total: 'Bs 680,00', status: 'En preparación', tone: 'prep' },
  { id: '#PED-0247', customer: 'María Fernanda Rojas', date: 'Hoy, 10:18', total: 'Bs 245,00', status: 'Pendiente', tone: 'pending' },
  { id: '#PED-0246', customer: 'Tienda Natural Vida', date: 'Hoy, 09:56', total: 'Bs 1.120,00', status: 'Listo para entrega', tone: 'ready' },
]

function greeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Buenos días'
  if (hour < 19) return 'Buenas tardes'
  return 'Buenas noches'
}

export function DashboardPage() {
  const profile = useAuthStore((state) => state.profile)
  const firstName = profile?.fullName.split(' ')[0] || 'Administrador'

  return (
    <>
      <section className="welcome-row">
        <div>
          <div className="eyebrow">RESUMEN GENERAL</div>
          <h1>{greeting()}, {firstName} <span>✦</span></h1>
          <p>Esto es lo que está sucediendo hoy en VIDALID.</p>
        </div>
        <span className="rounded-md bg-warning/10 px-2.5 py-1 text-xs font-semibold text-warning">
          Datos de demostración
        </span>
      </section>

      <section className="stats-grid">
        {stats.map((s) => {
          const Icon = s.icon
          return (
            <article className="stat-card" key={s.label}>
              <div className="stat-top"><span>{s.label}</span><div className={`stat-icon ${s.tone}`}><Icon size={19} /></div></div>
              <div className="stat-value">{s.value}</div>
              <div className="stat-foot">{s.up ? <ArrowUpRight size={15} /> : <ArrowDownRight size={15} />}<strong>{s.change}</strong><span> vs. periodo anterior</span></div>
            </article>
          )
        })}
      </section>

      <section className="content-grid">
        <article className="panel sales-panel">
          <div className="panel-heading"><div><h2>Resumen de ventas</h2><p>Comportamiento de tus ventas durante la semana</p></div></div>
          <div className="chart-summary"><strong>Bs 18.450,00</strong><span className="positive"><ArrowUpRight size={15} /> 8,4%</span><small>Ingresos totales</small></div>
          <div className="chart-placeholder">
            <div className="chart-y-labels"><span>5k</span><span>4k</span><span>3k</span><span>2k</span><span>1k</span><span>0</span></div>
            <div className="chart-area">
              <div className="chart-gridlines"><i /><i /><i /><i /><i /><i /></div>
              <svg viewBox="0 0 650 190" preserveAspectRatio="none" role="img" aria-label="Gráfico ilustrativo de ventas semanales">
                <defs><linearGradient id="salesFill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#2f946b" stopOpacity=".2" /><stop offset="100%" stopColor="#2f946b" stopOpacity="0" /></linearGradient></defs>
                <path d="M0 145 C35 135 48 105 90 119 S145 145 185 105 S242 93 275 108 S330 65 365 84 S420 113 460 60 S525 72 555 42 S615 48 650 20 L650 190 L0 190Z" fill="url(#salesFill)" />
                <path d="M0 145 C35 135 48 105 90 119 S145 145 185 105 S242 93 275 108 S330 65 365 84 S420 113 460 60 S525 72 555 42 S615 48 650 20" fill="none" stroke="#27865f" strokeWidth="3" strokeLinecap="round" />
              </svg>
              <div className="chart-x-labels"><span>Vie</span><span>Sáb</span><span>Dom</span><span>Lun</span><span>Mar</span><span>Mié</span><span>Jue</span></div>
            </div>
          </div>
          <div className="chart-note"><span className="legend-dot" /> Ventas registradas <span className="demo-note">Datos de demostración</span></div>
        </article>

        <article className="panel alerts-panel">
          <div className="panel-heading"><div><h2>Atención necesaria</h2><p>Requieren seguimiento</p></div><span className="alert-counter">3</span></div>
          <div className="alert-item"><div className="alert-symbol amber"><Package size={17} /></div><div><strong>Stock bajo</strong><span>Maca Andina · 8 unidades</span></div><span className="alert-arrow">›</span></div>
          <div className="alert-item"><div className="alert-symbol red"><Package size={17} /></div><div><strong>Producto agotado</strong><span>Colágeno Hidrolizado</span></div><span className="alert-arrow">›</span></div>
          <div className="alert-item"><div className="alert-symbol blue"><Truck size={17} /></div><div><strong>Pedidos pendientes</strong><span>6 pedidos por preparar</span></div><span className="alert-arrow">›</span></div>
        </article>
      </section>

      <section className="bottom-grid">
        <article className="panel table-panel">
          <div className="panel-heading"><div><h2>Productos con bajo stock</h2><p>Supervisa las existencias de tu almacén</p></div><Link to="/admin/inventario" className="text-link">Ver inventario →</Link></div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>PRODUCTO</th><th>CATEGORÍA</th><th>STOCK</th><th>PRECIO</th><th>ESTADO</th></tr></thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.sku}>
                    <td><div className="product-cell"><div className="product-thumb"><Package size={17} /></div><div><strong>{p.name}</strong><span>{p.sku}</span></div></div></td>
                    <td>{p.category}</td><td><strong>{p.stock}</strong></td><td>{p.price}</td><td><span className={`status ${p.tone}`}>{p.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>

        <article className="panel orders-panel">
          <div className="panel-heading"><div><h2>Pedidos recientes</h2><p>Últimos movimientos comerciales</p></div><Link to="/admin/pedidos" className="text-link">Ver todos →</Link></div>
          <div className="orders-list">
            {orders.map((o) => (
              <div className="order-row" key={o.id}>
                <div className="order-icon"><ShoppingBag size={17} /></div>
                <div className="order-info"><strong>{o.id}</strong><span>{o.customer}</span><small>{o.date}</small></div>
                <div className="order-meta"><strong>{o.total}</strong><span className={`status ${o.tone}`}>{o.status}</span></div>
              </div>
            ))}
          </div>
        </article>
      </section>

      <footer className="footer-note">VIDALID · Sistema de gestión <span>Versión MVP 0.1.0</span></footer>
    </>
  )
}
