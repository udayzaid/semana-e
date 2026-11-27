import type { Session } from '@supabase/supabase-js'
import { create } from 'zustand'
import { fetchProfile } from '@/features/auth/services/auth.service'
import type { AuthStatus, Profile } from '@/features/auth/types'
import { supabase } from '@/services/supabase/client'

interface AuthState {
  status: AuthStatus
  session: Session | null
  profile: Profile | null
  profileError: string | null
  /** Escucha los cambios de sesión de Supabase. Devuelve la función para dejar de escuchar. */
  initialize: () => () => void
  /** Vuelve a leer el perfil (por ejemplo, tras un error de red). */
  reloadProfile: () => Promise<void>
}

// Identifica la última carga para ignorar respuestas antiguas si la sesión cambia rápido.
let loadToken = 0

export const useAuthStore = create<AuthState>()((set, get) => {
  async function applySession(session: Session | null) {
    const token = ++loadToken

    if (!session) {
      set({ status: 'unauthenticated', session: null, profile: null, profileError: null })
      return
    }

    // Mismo usuario ya cargado (p. ej. renovación del token): no volver a pedir el perfil.
    if (get().profile?.id === session.user.id) {
      set({ session, status: 'authenticated' })
      return
    }

    set({ status: 'loading', session })
    try {
      const profile = await fetchProfile(session.user.id)
      if (token === loadToken) set({ status: 'authenticated', profile, profileError: null })
    } catch (error) {
      if (token === loadToken) {
        set({
          status: 'authenticated',
          profile: null,
          profileError: error instanceof Error ? error.message : 'Error al cargar el perfil.',
        })
      }
    }
  }

  return {
    status: 'loading',
    session: null,
    profile: null,
    profileError: null,

    initialize: () => {
      // onAuthStateChange emite primero la sesión actual (INITIAL_SESSION).
      const { data } = supabase.auth.onAuthStateChange((_event, session) => {
        // No llamar a Supabase dentro del callback (puede bloquear el cliente): se difiere.
        setTimeout(() => void applySession(session), 0)
      })
      return () => data.subscription.unsubscribe()
    },

    reloadProfile: async () => {
      set({ profile: null })
      await applySession(get().session)
    },
  }
})
