import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AdminLayout } from '@/components/layout/AdminLayout'
import { ComingSoon } from '@/components/shared/ComingSoon'
import { LoginPage, RequireAuth } from '@/features/auth'
import { DashboardPage } from '@/features/dashboard'
import { ProductsPage } from '@/features/products'

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
          { path: 'inventario', element: <ComingSoon title="Inventario" /> },
          { path: 'productos', element: <ProductsPage /> },
          { path: 'ventas', element: <ComingSoon title="Ventas" /> },
          { path: 'pedidos', element: <ComingSoon title="Pedidos" /> },
          { path: 'clientes', element: <ComingSoon title="Clientes / CRM" /> },
          { path: 'distribucion', element: <ComingSoon title="Distribución" /> },
          { path: 'reportes', element: <ComingSoon title="Reportes" /> },
          { path: 'asistente', element: <ComingSoon title="VIDALID AI" /> },
        ],
      },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
])
