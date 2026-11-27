import type { AuthError } from '@supabase/supabase-js'
import { supabase } from '@/services/supabase/client'
import type { UserRole } from '@/types/database'
import type { Profile } from '../types'

interface ProfileRow {
  id: string
  email: string | null
  full_name: string
  role: UserRole
  is_active: boolean
}

/** Traduce los errores de Supabase Auth a mensajes claros en español. */
function toAuthMessage(error: AuthError): string {
  if (error.code === 'invalid_credentials' || error.message === 'Invalid login credentials') {
    return 'Correo o contraseña incorrectos.'
  }
  if (error.code === 'email_not_confirmed') {
    return 'Tu correo aún no está confirmado.'
  }
  if (error.code === 'over_request_rate_limit' || error.status === 429) {
    return 'Demasiados intentos. Espera unos minutos e inténtalo de nuevo.'
  }
  if (error.name === 'AuthRetryableFetchError' || error.status === 0) {
    return 'No se pudo conectar con el servidor. Revisa tu conexión.'
  }
  return 'No se pudo iniciar sesión. Inténtalo de nuevo.'
}

export async function signIn(email: string, password: string): Promise<void> {
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw new Error(toAuthMessage(error))
}

export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut()
  if (error) throw new Error('No se pudo cerrar la sesión. Inténtalo de nuevo.')
}

/** Lee el perfil del usuario. RLS solo permite leer el propio (o todos si es admin). */
export async function fetchProfile(userId: string): Promise<Profile> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, full_name, role, is_active')
    .eq('id', userId)
    .single<ProfileRow>()

  if (error || !data) {
    throw new Error('No se pudo cargar tu perfil de usuario.')
  }

  return {
    id: data.id,
    email: data.email,
    fullName: data.full_name,
    role: data.role,
    isActive: data.is_active,
  }
}
