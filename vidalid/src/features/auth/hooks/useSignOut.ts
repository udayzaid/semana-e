import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { useChatStore } from '@/features/ai-assistant/store/chat.store'
import { useCartStore } from '@/features/sales/store/cart.store'
import { queryClient } from '@/lib/query-client'
import { signOut } from '../services/auth.service'

/**
 * Cierra la sesión, limpia los datos en caché y redirige.
 * Panel: al inicio de sesión. Portal del cliente: a la tienda.
 */
export function useSignOut(redirectTo = '/login') {
  const navigate = useNavigate()
  const [isSigningOut, setIsSigningOut] = useState(false)

  const handleSignOut = useCallback(async () => {
    setIsSigningOut(true)
    try {
      await signOut()
      // Limpiar todo lo que quedó en memoria: datos en caché, chats de IA y carrito del panel.
      queryClient.clear()
      useChatStore.getState().clear('admin')
      useChatStore.getState().clear('products')
      useCartStore.getState().clear()
      navigate(redirectTo, { replace: true })
      toast.success('Sesión cerrada.')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo cerrar la sesión.')
    } finally {
      setIsSigningOut(false)
    }
  }, [navigate, redirectTo])

  return { signOut: handleSignOut, isSigningOut }
}
