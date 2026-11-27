import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from '@/components/ui/combobox'
import { cn } from '@/lib/utils'
import { useCustomerOptions } from '../hooks/useCustomers'
import type { CustomerOption } from '../services/customers.service'

interface CustomerPickerProps {
  value: string | null
  onChange: (customer: CustomerOption | null) => void
  id?: string
  placeholder?: string
  className?: string
}

/** Buscador de clientes activos por nombre, negocio o teléfono. */
export function CustomerPicker({ value, onChange, id, placeholder = 'Buscar cliente…', className }: CustomerPickerProps) {
  const { data: customers = [], isLoading } = useCustomerOptions()
  const selected = customers.find((customer) => customer.id === value) ?? null

  return (
    <Combobox<CustomerOption>
      items={customers}
      value={selected}
      onValueChange={(next) => onChange(next ?? null)}
      itemToStringLabel={(customer) => [customer.name, customer.businessName, customer.phone].filter(Boolean).join(' · ')}
      isItemEqualToValue={(a, b) => a.id === b.id}
    >
      <ComboboxInput id={id} placeholder={isLoading ? 'Cargando clientes…' : placeholder} className={cn('w-full bg-card', className)} showClear={!!selected} />
      <ComboboxContent>
        <ComboboxEmpty>No se encontraron clientes.</ComboboxEmpty>
        <ComboboxList>
          {(customer: CustomerOption) => (
            <ComboboxItem key={customer.id} value={customer}>
              <div className="min-w-0">
                <p className="truncate">{customer.name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {[customer.businessName, customer.phone, customer.customerType === 'retailer' ? 'Minorista' : 'Consumidor'].filter(Boolean).join(' · ')}
                </p>
              </div>
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  )
}
