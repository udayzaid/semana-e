import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from '@/components/ui/combobox'
import { cn } from '@/lib/utils'
import { useProductOptions } from '../hooks/useProducts'
import type { ProductOption } from '../services/products.service'

interface ProductPickerProps {
  value: string | null
  onChange: (product: ProductOption | null) => void
  id?: string
  invalid?: boolean
  disabled?: boolean
  placeholder?: string
  className?: string
}

/** Buscador de productos activos por nombre o SKU (reutilizable en inventario y ventas). */
export function ProductPicker({ value, onChange, id, invalid, disabled, placeholder = 'Buscar producto por nombre o SKU…', className }: ProductPickerProps) {
  const { data: products = [], isLoading } = useProductOptions()
  const selected = products.find((product) => product.id === value) ?? null

  return (
    <Combobox<ProductOption>
      items={products}
      value={selected}
      onValueChange={(next) => onChange(next ?? null)}
      itemToStringLabel={(product) => `${product.name} · ${product.sku}`}
      isItemEqualToValue={(a, b) => a.id === b.id}
      disabled={disabled}
    >
      <ComboboxInput
        id={id}
        placeholder={isLoading ? 'Cargando productos…' : placeholder}
        aria-invalid={invalid || undefined}
        className={cn('w-full bg-card', className)}
        showClear={!!selected}
      />
      <ComboboxContent>
        <ComboboxEmpty>No se encontraron productos activos.</ComboboxEmpty>
        <ComboboxList>
          {(product: ProductOption) => (
            <ComboboxItem key={product.id} value={product}>
              <div className="flex w-full min-w-0 items-center justify-between gap-3">
                <span className="min-w-0 truncate">
                  {product.name} <span className="text-xs text-muted-foreground">· {product.sku}</span>
                </span>
                <span
                  className={cn(
                    'shrink-0 text-xs tabular-nums',
                    product.stockStatus === 'out' ? 'text-destructive' : product.stockStatus === 'low' ? 'text-warning' : 'text-muted-foreground',
                  )}
                >
                  {product.availableStock} {product.unit}
                </span>
              </div>
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  )
}
