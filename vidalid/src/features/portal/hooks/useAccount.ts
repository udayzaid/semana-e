import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/auth.store'
import { getMyCustomer, listMyOrders, listMyPurchases, updateMyProfile } from '../services/account.service'

/** Solo consulta si hay un cliente con sesión (los administradores no tienen ficha propia). */
function useIsCustomer() {
  return useAuthStore((state) => state.status === 'authenticated' && state.profile?.role === 'customer')
}

export function useMyCustomer() {
  const enabled = useIsCustomer()
  return useQuery({ queryKey: ['account', 'customer'], queryFn: getMyCustomer, enabled })
}

export function useMyOrders() {
  const enabled = useIsCustomer()
  return useQuery({ queryKey: ['account', 'orders'], queryFn: listMyOrders, enabled })
}

export function useMyPurchases() {
  const enabled = useIsCustomer()
  return useQuery({ queryKey: ['account', 'purchases'], queryFn: listMyPurchases, enabled })
}

export function useUpdateMyProfile() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: updateMyProfile,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['account'] }),
  })
}
