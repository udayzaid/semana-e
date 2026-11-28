import { useQuery } from '@tanstack/react-query'
import { getActiveCustomerCount, getSalesByDay, getStockAlerts, getTopProducts } from '../services/dashboard.service'

// Claves bajo 'sales', 'customers' e 'inventory' para que se refresquen
// automáticamente cuando se registra una venta, un cliente o un movimiento.
export function useSalesByDay(from: Date, to: Date) {
  return useQuery({
    queryKey: ['sales', 'by-day', from.toDateString(), to.toDateString()],
    queryFn: () => getSalesByDay(from, to),
  })
}

export function useTopProducts(from: Date, to: Date, limit = 5) {
  return useQuery({
    queryKey: ['sales', 'top-products', from.toISOString(), to.toISOString(), limit],
    queryFn: () => getTopProducts(from, to, limit),
  })
}

export function useActiveCustomerCount() {
  return useQuery({ queryKey: ['customers', 'count'], queryFn: getActiveCustomerCount })
}

export function useStockAlerts() {
  return useQuery({ queryKey: ['inventory', 'stock-alerts'], queryFn: () => getStockAlerts(5) })
}
