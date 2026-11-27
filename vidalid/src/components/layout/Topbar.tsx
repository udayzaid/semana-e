import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { CalendarDays } from 'lucide-react'
import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuthStore } from '@/stores/auth.store'
import { getInitials } from './initials'
import { findNavItem } from './navigation'

export function Topbar() {
  const { pathname } = useLocation()
  const profile = useAuthStore((state) => state.profile)
  const current = findNavItem(pathname)
  const [today] = useState(() => format(new Date(), "EEEE, d 'de' MMMM", { locale: es }))

  return (
    <header className="topbar">
      <div className="breadcrumb">
        Panel de control <span>/</span> <strong>{current?.label ?? 'Inicio'}</strong>
      </div>
      <div className="top-actions">
        <div className="top-date first-letter:uppercase">
          <CalendarDays size={16} /> {today}
        </div>
        <div className="top-avatar" title={profile?.fullName || profile?.email || undefined}>
          {getInitials(profile?.fullName || 'Usuario')}
        </div>
      </div>
    </header>
  )
}
