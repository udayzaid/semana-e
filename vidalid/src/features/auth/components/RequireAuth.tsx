import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { FullScreenLoader } from '@/components/shared/FullScreenLoader'
import { useAuthStore } from '@/stores/auth.store'
import type { UserRole } from '@/types/database'
import { AccessDenied } from './AccessDenied'

interface RequireAuthProps {
  /** Roles con acceso. Si se omite, basta con iniciar sesión. */
  roles?: UserRole[]
}

/**
 * Protege rutas en el frontend (experiencia de usuario).
 * La seguridad real la imponen RLS y las funciones de la base de datos.
 */
export function RequireAuth({ roles }: RequireAuthProps) {
  const location = useLocation()
  const { status, profile, profileError, reloadProfile } = useAuthStore()

  if (status === 'loading') {
    return <FullScreenLoader label="Verificando sesión…" />
  }

  if (status === 'unauthenticated') {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
  }

  if (!profile) {
    return (
      <AccessDenied
        title="No se pudo cargar tu perfil"
        message={profileError ?? 'Inténtalo de nuevo en unos segundos.'}
        onRetry={() => void reloadProfile()}
      />
    )
  }

  if (!profile.isActive) {
    return (
      <AccessDenied
        title="Cuenta desactivada"
        message="Tu cuenta está desactivada. Comunícate con el administrador de VIDALID."
      />
    )
  }

  if (roles && !roles.includes(profile.role)) {
    return (
      <AccessDenied
        title="Sin acceso al panel"
        message="Tu cuenta no tiene permisos para el panel administrativo."
      />
    )
  }

  return <Outlet />
}
