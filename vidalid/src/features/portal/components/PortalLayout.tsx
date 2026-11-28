import { Menu, MessageCircle, ShoppingBag, UserRound, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { BrandLogo } from '@/components/shared/BrandLogo'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth.store'
import { portalConfig, vidalidWhatsAppUrl } from '../config'
import { usePortalCart } from '../store/portalCart.store'
import { CartSheet } from './CartSheet'
import { StoreChatLauncher } from './StoreChatLauncher'

const currentYear = new Date().getFullYear()

const navItems = [
  { to: '/', label: 'Tienda', end: true },
  { to: '/carrito?tab=pedidos', label: 'Mis pedidos' },
]

/** Estructura del portal público: encabezado, contenido, pie y WhatsApp flotante. */
export function PortalLayout() {
  const count = usePortalCart((state) => state.items.reduce((sum, item) => sum + item.quantity, 0))
  const [menuOpen, setMenuOpen] = useState(false)
  const [cartOpen, setCartOpen] = useState(false)
  const { pathname } = useLocation()
  const whatsapp = vidalidWhatsAppUrl('Hola Vidalid, quisiera información sobre sus productos.')

  // Acceso según la sesión: cliente → su cuenta; administrador → panel; visitante → ingresar.
  const role = useAuthStore((state) => (state.status === 'authenticated' ? state.profile?.role : null))
  const account = role === 'customer' ? { to: '/mi-cuenta', label: 'Mi cuenta' } : role === 'admin' ? { to: '/admin', label: 'Panel' } : { to: '/login', label: 'Ingresar' }

  // Al cambiar de página: volver arriba y cerrar el menú móvil.
  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [pathname])

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-30 border-b bg-card/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4">
          <Link to="/" aria-label="Vidalid, inicio" onClick={() => setMenuOpen(false)}>
            <BrandLogo className="h-9" />
          </Link>

          <nav className="hidden items-center gap-1 md:flex" aria-label="Navegación principal">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cn('rounded-lg px-3 py-2 text-sm font-medium transition', isActive ? 'bg-secondary text-primary' : 'text-muted-foreground hover:text-foreground')
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <Link
              to={account.to}
              onClick={() => setMenuOpen(false)}
              className="hidden items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground sm:flex"
            >
              <UserRound className="size-4" /> {account.label}
            </Link>
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false)
                setCartOpen(true)
              }}
              className="relative flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
              aria-label={`Carrito: ${count} productos`}
            >
              <ShoppingBag className="size-4" />
              <span className="hidden sm:inline">Carrito</span>
              {count > 0 && (
                <span className="grid min-w-5 place-items-center rounded-full bg-brand-light px-1 text-xs font-bold text-brand-dark tabular-nums">{count}</span>
              )}
            </button>
            <button
              type="button"
              className="grid size-9 place-items-center rounded-lg text-muted-foreground hover:bg-muted md:hidden"
              onClick={() => setMenuOpen((open) => !open)}
              aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'}
              aria-expanded={menuOpen}
            >
              {menuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>
          </div>
        </div>

        {menuOpen && (
          <nav className="border-t bg-card px-4 py-2 md:hidden" aria-label="Navegación móvil">
            {[...navItems, { to: account.to, label: account.label, end: false }].map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={() => setMenuOpen(false)}
                className={({ isActive }) => cn('block rounded-lg px-3 py-2.5 text-sm font-medium', isActive ? 'bg-secondary text-primary' : 'text-foreground')}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        )}
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <CartSheet open={cartOpen} onOpenChange={setCartOpen} />
      <StoreChatLauncher />

      <footer className="mt-16 bg-brand-dark text-white/80">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:grid-cols-3">
          <div>
            <BrandLogo tone="white" className="h-10" />
            <p className="mt-3 text-sm">Productos naturales medicinales y suplementos: tinturas, polvos, cápsulas y jarabes.</p>
          </div>
          <div>
            <p className="text-xs font-bold tracking-[0.15em] text-brand-light">ENLACES</p>
            <ul className="mt-3 space-y-2 text-sm">
              <li><Link to="/" className="hover:text-white">Tienda</Link></li>
              <li><Link to="/carrito" className="hover:text-white">Mi pedido</Link></li>
              <li><Link to="/registro" className="hover:text-white">Crear cuenta de cliente</Link></li>
              <li><Link to="/login" className="hover:text-white">Iniciar sesión</Link></li>
            </ul>
          </div>
          <div>
            <p className="text-xs font-bold tracking-[0.15em] text-brand-light">CONTACTO</p>
            <ul className="mt-3 space-y-2 text-sm">
              {whatsapp && <li><a href={whatsapp} target="_blank" rel="noopener noreferrer" className="hover:text-white">WhatsApp: +{portalConfig.whatsappNumber}</a></li>}
              {portalConfig.facebookUrl && <li><a href={portalConfig.facebookUrl} target="_blank" rel="noopener noreferrer" className="hover:text-white">Facebook</a></li>}
              {portalConfig.instagramUrl && <li><a href={portalConfig.instagramUrl} target="_blank" rel="noopener noreferrer" className="hover:text-white">Instagram</a></li>}
              {portalConfig.tiktokUrl && <li><a href={portalConfig.tiktokUrl} target="_blank" rel="noopener noreferrer" className="hover:text-white">TikTok</a></li>}
              <li className="text-white/60">Pedidos con envío o recogida en almacén.</li>
            </ul>
          </div>
        </div>
        <p className="border-t border-white/10 py-4 text-center text-xs text-white/50">© {currentYear} Vidalid · Productos naturales</p>
      </footer>

      {/* RF-82 · Contacto por WhatsApp */}
      {whatsapp && (
        <a
          href={whatsapp}
          target="_blank"
          rel="noopener noreferrer"
          className="fixed right-4 bottom-20 z-30 grid size-14 sm:bottom-24 place-items-center rounded-full bg-[#25d366] text-white shadow-lg ring-4 ring-[#25d366]/20 transition hover:scale-105 sm:right-6"
          aria-label="Escribir a Vidalid por WhatsApp"
          title="Escríbenos por WhatsApp"
        >
          <MessageCircle className="size-7" />
        </a>
      )}
    </div>
  )
}
