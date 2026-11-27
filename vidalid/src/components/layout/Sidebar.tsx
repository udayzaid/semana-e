import { Loader2, LogOut } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { BrandLogo } from '@/components/shared/BrandLogo'
import { useSignOut } from '@/features/auth/hooks/useSignOut'
import { useAuthStore } from '@/stores/auth.store'
import { getInitials } from './initials'
import { adminNavigation } from './navigation'

/** Contenido del menú: se usa en la barra lateral (escritorio/tablet) y en el menú móvil. */
export function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const profile = useAuthStore((state) => state.profile)
  const { signOut, isSigningOut } = useSignOut()
  const name = profile?.fullName || 'Administrador'

  return (
    <>
      <div className="px-2 pb-6">
        <BrandLogo className="h-10" />
        <p className="mt-1 pl-1 text-[9px] font-bold tracking-[0.22em] text-muted-foreground">PRODUCTOS NATURALES</p>
      </div>

      <div className="workspace">
        <div className="workspace-avatar">
          <BrandLogo kind="isotipo" className="size-5" />
        </div>
        <div><strong>VIDALID Central</strong><span>Almacén principal</span></div>
      </div>

      <nav className="nav-list" aria-label="Menú principal">
        {adminNavigation.map((section, index) => (
          <div key={section.caption} className="contents">
            <span className={index > 0 ? 'nav-caption nav-caption-spaced' : 'nav-caption'}>{section.caption}</span>
            {section.items.map(({ to, label, icon: Icon, end, highlight }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                title={label}
                onClick={onNavigate}
                className={({ isActive }) =>
                  ['nav-item', highlight === 'ai' ? 'ai-link' : '', isActive ? 'active' : ''].filter(Boolean).join(' ')
                }
              >
                <Icon size={18} />
                {label}
                {highlight === 'ai' && <span className="ai-pill">IA</span>}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      <div className="sidebar-bottom">
        <button type="button" className="nav-item w-full cursor-pointer border-0 bg-transparent" onClick={signOut} disabled={isSigningOut} title="Cerrar sesión">
          {isSigningOut ? <Loader2 size={18} className="animate-spin" /> : <LogOut size={18} />}
          Cerrar sesión
        </button>
        <div className="profile-mini">
          <div className="profile-avatar">{getInitials(name)}</div>
          <div className="min-w-0">
            <strong className="truncate">{name}</strong>
            <span className="truncate">{profile?.email}</span>
          </div>
        </div>
      </div>
    </>
  )
}

/** Barra lateral fija (se oculta en celulares; ahí se usa el menú móvil). */
export function Sidebar() {
  return (
    <aside className="sidebar">
      <SidebarContent />
    </aside>
  )
}
