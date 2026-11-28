import { OrdersPage } from '@/features/orders/pages/OrdersPage'

/**
 * RF-53 a RF-60 · Distribución y logística.
 * Reutiliza la gestión de pedidos filtrada a lo que hay que preparar, despachar o entregar.
 * La asignación de responsables y la modalidad (envío / recogida) se registran en cada pedido.
 */
export function DeliveriesPage() {
  return <OrdersPage mode="distribution" />
}
