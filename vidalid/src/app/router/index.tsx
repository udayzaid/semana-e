import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AdminLayout } from '@/components/layout/AdminLayout'
import { ComingSoon } from '@/components/shared/ComingSoon'
import { LoginPage, RegisterPage, RequireAuth } from '@/features/auth'
import { AssistantPage } from '@/features/ai-assistant'
import { CustomersPage } from '@/features/customers'
import { DashboardPage } from '@/features/dashboard'
import { DeliveriesPage } from '@/features/deliveries'
import { InventoryPage } from '@/features/inventory'
import { OrdersPage } from '@/features/orders'
import { CartPage, MyAccountPage, OrderSentPage, PortalLayout, ProductDetailPage, StorePage } from '@/features/portal'
import { ProductsPage } from '@/features/products'
import { NewSalePage, SalesPage } from '@/features/sales'

export const router = createBrowserRouter([
  // Portal público del cliente (sin registro).
  {
    element: <PortalLayout />,
    children: [
      // La tienda es la página principal; /catalogo se mantiene por compatibilidad de enlaces.
      { path: '/', element: <StorePage /> },
      { path: '/catalogo', element: <StorePage /> },
      { path: '/producto/:id', element: <ProductDetailPage /> },
      { path: '/carrito', element: <CartPage /> },
      { path: '/pedido-enviado', element: <OrderSentPage /> },
      { path: '/registro', element: <RegisterPage /> },
      // Cuenta del cliente (opcional): requiere sesión con rol de cliente.
      {
        element: <RequireAuth roles={['customer']} />,
        children: [{ path: '/mi-cuenta', element: <MyAccountPage /> }],
      },
    ],
  },
  { path: '/login', element: <LoginPage /> },
  {
    path: '/admin',
    element: <RequireAuth roles={['admin']} />,
    children: [
      {
        element: <AdminLayout />,
        children: [
          { index: true, element: <DashboardPage /> },
          { path: 'inventario', element: <InventoryPage /> },
          { path: 'productos', element: <ProductsPage /> },
          { path: 'ventas', element: <SalesPage /> },
          { path: 'ventas/nueva', element: <NewSalePage /> },
          { path: 'pedidos', element: <OrdersPage /> },
          { path: 'clientes', element: <CustomersPage /> },
          { path: 'distribucion', element: <DeliveriesPage /> },
          { path: 'reportes', element: <ComingSoon title="Reportes" /> },
          { path: 'asistente', element: <AssistantPage /> },
        ],
      },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
])
