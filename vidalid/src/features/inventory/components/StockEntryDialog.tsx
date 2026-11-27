import { zodResolver } from '@hookform/resolvers/zod'
import { format } from 'date-fns'
import { Loader2 } from 'lucide-react'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { FormField } from '@/components/shared/FormField'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { ProductPicker } from '@/features/products/components/ProductPicker'
import { toUserMessage } from '@/lib/errors'
import { useStockEntry } from '../hooks/useInventory'
import { stockEntrySchema, type StockEntryFormInput, type StockEntryFormValues } from '../schemas/inventory.schema'

interface StockEntryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Producto preseleccionado (desde la tabla de existencias). */
  productId?: string | null
}

/** RF-12 / RF-21 / RF-22 · Ingreso de mercadería: crea un lote y suma stock. */
export function StockEntryDialog({ open, onOpenChange, productId }: StockEntryDialogProps) {
  const entry = useStockEntry()
  const [today] = useState(() => format(new Date(), 'yyyy-MM-dd'))
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<StockEntryFormInput, unknown, StockEntryFormValues>({
    resolver: zodResolver(stockEntrySchema),
    // El padre vuelve a montar el diálogo (key) en cada apertura.
    defaultValues: { productId: productId ?? '', quantity: '', lotCode: '', expiresAt: '', unitCost: '', reason: '' },
  })

  const onSubmit = (values: StockEntryFormValues) => {
    entry.mutate(values, {
      onSuccess: () => {
        toast.success(`Ingreso registrado: ${values.quantity} unidades.`)
        onOpenChange(false)
      },
      onError: (error) => toast.error(toUserMessage(error, 'No se pudo registrar el ingreso.')),
    })
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !entry.isPending && onOpenChange(next)}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Registrar ingreso de mercadería</DialogTitle>
          <DialogDescription>Cada ingreso crea un lote. El código de lote y el vencimiento son opcionales, pero ayudan a controlar caducidades.</DialogDescription>
        </DialogHeader>

        <form id="stock-entry-form" onSubmit={handleSubmit(onSubmit)} noValidate className="grid gap-4 sm:grid-cols-2">
          <FormField label="Producto" htmlFor="entry-product" error={errors.productId?.message} className="sm:col-span-2">
            <Controller
              control={control}
              name="productId"
              render={({ field }) => (
                <ProductPicker id="entry-product" value={field.value || null} onChange={(product) => field.onChange(product?.id ?? '')} invalid={!!errors.productId} />
              )}
            />
          </FormField>

          <FormField label="Cantidad" htmlFor="entry-quantity" error={errors.quantity?.message}>
            <Input id="entry-quantity" type="number" inputMode="numeric" min="1" step="1" aria-invalid={!!errors.quantity} {...register('quantity')} />
          </FormField>

          <FormField label="Costo unitario (Bs, opcional)" htmlFor="entry-cost" error={errors.unitCost?.message} hint="Si lo dejas vacío se usa el costo del producto.">
            <Input id="entry-cost" type="number" inputMode="decimal" min="0" step="0.01" aria-invalid={!!errors.unitCost} {...register('unitCost')} />
          </FormField>

          <FormField label="Código de lote (opcional)" htmlFor="entry-lot" error={errors.lotCode?.message}>
            <Input id="entry-lot" placeholder="L-2026-11" aria-invalid={!!errors.lotCode} {...register('lotCode')} />
          </FormField>

          <FormField label="Fecha de vencimiento (opcional)" htmlFor="entry-expires" error={errors.expiresAt?.message}>
            <Input id="entry-expires" type="date" min={today} aria-invalid={!!errors.expiresAt} {...register('expiresAt')} />
          </FormField>

          <FormField label="Motivo / referencia (opcional)" htmlFor="entry-reason" error={errors.reason?.message} className="sm:col-span-2">
            <Input id="entry-reason" placeholder="Compra a proveedor de Perú, factura 123…" aria-invalid={!!errors.reason} {...register('reason')} />
          </FormField>
        </form>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={entry.isPending}>
            Cancelar
          </Button>
          <Button type="submit" form="stock-entry-form" disabled={entry.isPending}>
            {entry.isPending && <Loader2 className="animate-spin" />}
            Registrar ingreso
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
