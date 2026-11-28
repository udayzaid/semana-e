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

export interface CustomerSignUpInput {
  email: string
  password: string
  fullName: string
  businessName: string | null
  phone: string
  customerType: 'retailer' | 'final_consumer'
}

/**
 * Registro de clientes desde el portal. La base de datos crea su ficha de cliente
 * (signup_source = portal) y siempre le asigna el rol "customer".
 * Devuelve true si la sesión quedó iniciada, o false si Supabase pide confirmar el correo.
 */
export async function signUpCustomer(input: CustomerSignUpInput): Promise<{ signedIn: boolean }> {
  const { data, error } = await supabase.auth.signUp({
    email: input.email,
    password: input.password,
    options: {
      emailRedirectTo: `${window.location.origin}/login`,
      data: {
        signup_source: 'portal',
        full_name: input.fullName,
        business_name: input.businessName,
        phone: input.phone,
        customer_type: input.customerType,
      },
    },
  })
  if (error) {
    if (error.code === 'user_already_exists' || /already registered/i.test(error.message)) throw new Error('Ya existe una cuenta con ese correo. Inicia sesión.')
    if (error.code === 'weak_password') throw new Error('La contraseña es muy débil. Usa al menos 8 caracteres con letras y números.')
    if (error.code === 'over_email_send_rate_limit' || error.status === 429) throw new Error('Se enviaron demasiados correos. Espera unos minutos e inténtalo de nuevo.')
    if (error.code === 'signup_disabled') throw new Error('El registro de cuentas está desactivado por el momento.')
    throw new Error('No se pudo crear la cuenta. Inténtalo de nuevo.')
  }
  return { signedIn: !!data.session }
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
