import { useEffect, type PropsWithChildren } from 'react'
import { useAuthStore } from '@/stores/auth.store'

/** Conecta el estado de sesión de Supabase con la aplicación. */
export function AuthProvider({ children }: PropsWithChildren) {
  const initialize = useAuthStore((state) => state.initialize)

  useEffect(() => initialize(), [initialize])

  return children
}
