import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { queryClient } from '@/lib/query-client'
import { signOut } from '../services/auth.service'

/** Cierra la sesión, limpia los datos en caché y vuelve al inicio de sesión. */
export function useSignOut() {
  const navigate = useNavigate()
  const [isSigningOut, setIsSigningOut] = useState(false)

  const handleSignOut = useCallback(async () => {
    setIsSigningOut(true)
    try {
      await signOut()
      queryClient.clear()
      navigate('/login', { replace: true })
      toast.success('Sesión cerrada.')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo cerrar la sesión.')
    } finally {
      setIsSigningOut(false)
    }
  }, [navigate])

  return { signOut: handleSignOut, isSigningOut }
}
