import {
  Activity,
  Boxes,
  BrainCircuit,
  ClipboardList,
  LayoutDashboard,
  Package,
  ShoppingBag,
  Truck,
  Users,
  type LucideIcon,
} from 'lucide-react'

export interface NavItem {
  to: string
  label: string
  icon: LucideIcon
  /** Coincidencia exacta (solo para el dashboard, que es la ruta índice). */
  end?: boolean
  highlight?: 'ai'
}

export interface NavSection {
  caption: string
  items: NavItem[]
}

/** Menú del panel. Una sola fuente para la barra lateral y los títulos del encabezado. */
export const adminNavigation: NavSection[] = [
  {
    caption: 'MENÚ PRINCIPAL',
    items: [
      { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
      { to: '/admin/inventario', label: 'Inventario', icon: Boxes },
      { to: '/admin/productos', label: 'Productos', icon: Package },
      { to: '/admin/ventas', label: 'Ventas', icon: ShoppingBag },
      { to: '/admin/pedidos', label: 'Pedidos', icon: ClipboardList },
      { to: '/admin/clientes', label: 'Clientes / CRM', icon: Users },
      { to: '/admin/distribucion', label: 'Distribución', icon: Truck },
    ],
  },
  {
    caption: 'ANÁLISIS',
    items: [
      { to: '/admin/reportes', label: 'Reportes', icon: Activity },
      { to: '/admin/asistente', label: 'VIDALID AI', icon: BrainCircuit, highlight: 'ai' },
    ],
  },
]

export function findNavItem(pathname: string): NavItem | undefined {
  const items = adminNavigation.flatMap((section) => section.items)
  return (
    items.find((item) => item.end && item.to === pathname) ??
    items.filter((item) => !item.end && pathname.startsWith(item.to)).sort((a, b) => b.to.length - a.to.length)[0]
  )
}
