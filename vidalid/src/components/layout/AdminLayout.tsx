import { Outlet } from 'react-router-dom'
import '@/styles/admin.css'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'

/** Estructura del panel: barra lateral, encabezado y el contenido de cada módulo. */
export function AdminLayout() {
  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main-area">
        <Topbar />
        <div className="page-content">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
