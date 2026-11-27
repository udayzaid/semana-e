import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { CalendarDays, Menu } from 'lucide-react'
import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { useAuthStore } from '@/stores/auth.store'
import { getInitials } from './initials'
import { findNavItem } from './navigation'
import { SidebarContent } from './Sidebar'

export function Topbar() {
  const { pathname } = useLocation()
  const profile = useAuthStore((state) => state.profile)
  const current = findNavItem(pathname)
  const [today] = useState(() => format(new Date(), "EEEE, d 'de' MMMM", { locale: es }))
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <header className="topbar">
      <div className="flex min-w-0 items-center gap-2">
        {/* Menú móvil: solo en pantallas pequeñas (la barra lateral se oculta). */}
        <button type="button" className="mobile-menu-button icon-button" onClick={() => setMenuOpen(true)} aria-label="Abrir menú">
          <Menu size={20} />
        </button>
        <div className="breadcrumb truncate">
          <span className="hidden sm:inline">Panel de control </span>
          <span className="hidden sm:inline">/</span> <strong>{current?.label ?? 'Inicio'}</strong>
        </div>
      </div>
      <div className="top-actions">
        <div className="top-date first-letter:uppercase">
          <CalendarDays size={16} /> {today}
        </div>
        <div className="top-avatar" title={profile?.fullName || profile?.email || undefined}>
          {getInitials(profile?.fullName || 'Usuario')}
        </div>
      </div>

      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent side="left" className="mobile-nav w-[280px] max-w-[85vw] overflow-y-auto p-0">
          <SheetTitle className="sr-only">Menú</SheetTitle>
          <div className="flex min-h-full flex-col px-4 pt-6 pb-4">
            <SidebarContent onNavigate={() => setMenuOpen(false)} />
          </div>
        </SheetContent>
      </Sheet>
    </header>
  )
}
