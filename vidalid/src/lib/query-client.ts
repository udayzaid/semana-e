import { QueryClient } from '@tanstack/react-query'

/** Cliente único de TanStack Query (caché de datos del servidor). */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})
