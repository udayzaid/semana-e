import type { UserRole } from '@/types/database'

/** Perfil del usuario autenticado (tabla public.profiles). */
export interface Profile {
  id: string
  email: string | null
  fullName: string
  role: UserRole
  isActive: boolean
}

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated'
