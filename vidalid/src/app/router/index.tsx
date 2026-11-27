import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AdminLayout } from '@/components/layout/AdminLayout'
import { ComingSoon } from '@/components/shared/ComingSoon'
import { LoginPage, RequireAuth } from '@/features/auth'
import { CustomersPage } from '@/features/customers'
import { DashboardPage } from '@/features/dashboard'
import { InventoryPage } from '@/features/inventory'
import { ProductsPage } from '@/features/products'
import { NewSalePage, SalesPage } from '@/features/sales'

export const router = createBrowserRouter([
  // El portal público del cliente ocupará "/" más adelante.
  { path: '/', element: <Navigate to="/admin" replace /> },
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
          { path: 'pedidos', element: <ComingSoon title="Pedidos" /> },
          { path: 'clientes', element: <CustomersPage /> },
          { path: 'distribucion', element: <ComingSoon title="Distribución" /> },
          { path: 'reportes', element: <ComingSoon title="Reportes" /> },
          { path: 'asistente', element: <ComingSoon title="VIDALID AI" /> },
        ],
      },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
])
