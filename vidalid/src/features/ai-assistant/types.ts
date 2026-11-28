/** admin y products: panel administrativo · store: chat de la tienda para clientes y visitantes. */
export type AiAgent = 'admin' | 'products' | 'store'

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  /** Herramientas (consultas a la base de datos) que usó el asistente. */
  tools?: string[]
  error?: boolean
  createdAt: number
}

/** Nombre legible de cada consulta, para mostrar de dónde salió la respuesta. */
export const toolLabels: Record<string, string> = {
  sales_summary: 'Resumen de ventas',
  sales_by_day: 'Ventas por día',
  top_products: 'Productos más vendidos',
  slow_moving_products: 'Baja rotación',
  top_customers: 'Clientes frecuentes',
  inventory_summary: 'Resumen de inventario',
  stock_alerts: 'Alertas de stock',
  expiring_batches: 'Lotes por vencer',
  restock_suggestions: 'Sugerencias de reposición',
  search_products: 'Búsqueda de productos',
  products_by_category: 'Productos por categoría',
  search_catalog: 'Catálogo de la tienda',
  list_categories: 'Líneas de productos',
  products_in_category: 'Productos por línea',
  my_orders: 'Tus pedidos',
}
