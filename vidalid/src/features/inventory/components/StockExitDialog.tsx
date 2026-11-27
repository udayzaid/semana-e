import { zodResolver } from '@hookform/resolvers/zod'
import { format, parseISO } from 'date-fns'
import { Loader2 } from 'lucide-react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { toast } from 'sonner'
import { FormField } from '@/components/shared/FormField'
import { SimpleSelect } from '@/components/shared/SimpleSelect'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { ProductPicker } from '@/features/products/components/ProductPicker'
import { useProductOptions } from '@/features/products/hooks/useProducts'
import { toUserMessage } from '@/lib/errors'
import { useProductBatches, useStockExit } from '../hooks/useInventory'
import { EXIT_REASONS, stockExitSchema, type StockExitFormInput, type StockExitFormValues } from '../schemas/inventory.schema'

const AUTO = 'auto'

interface StockExitDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  productId?: string | null
}

/** RF-13 · Salida de inventario (vencido, dañado, muestra…). Las ventas descuentan stock por su cuenta. */
export function StockExitDialog({ open, onOpenChange, productId }: StockExitDialogProps) {
  const exit = useStockExit()
  const { data: products = [] } = useProductOptions()
  const {
    register,
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<StockExitFormInput, unknown, StockExitFormValues>({
    resolver: zodResolver(stockExitSchema),
    defaultValues: { productId: productId ?? '', quantity: '', batchId: AUTO, reason: '' },
  })

  const selectedId = useWatch({ control, name: 'productId' })
  const product = products.find((item) => item.id === selectedId)
  const batches = useProductBatches(selectedId || null)

  const batchOptions = [
    { value: AUTO, label: 'Automático (primero el que vence antes)' },
    ...(batches.data ?? []).map((batch) => ({
      value: batch.id,
      label: `${batch.lotCode ?? 'Sin código'} · ${batch.quantity} u.${batch.expiresAt ? ` · vence ${format(parseISO(batch.expiresAt), 'dd/MM/yyyy')}` : ''}`,
    })),
  ]

  const onSubmit = (values: StockExitFormValues) => {
    exit.mutate(
      { productId: values.productId, quantity: values.quantity, reason: values.reason, batchId: values.batchId === AUTO ? null : values.batchId },
      {
        onSuccess: () => {
          toast.success(`Salida registrada: ${values.quantity} unidades.`)
          onOpenChange(false)
        },
        onError: (error) => toast.error(toUserMessage(error, 'No se pudo registrar la salida.')),
      },
    )
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !exit.isPending && onOpenChange(next)}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Registrar salida de inventario</DialogTitle>
          <DialogDescription>Para productos vencidos, dañados, muestras o uso interno. Las ventas descuentan el stock automáticamente.</DialogDescription>
        </DialogHeader>

        <form id="stock-exit-form" onSubmit={handleSubmit(onSubmit)} noValidate className="grid gap-4 sm:grid-cols-2">
          <FormField label="Producto" htmlFor="exit-product" error={errors.productId?.message} className="sm:col-span-2">
            <Controller
              control={control}
              name="productId"
              render={({ field }) => (
                <ProductPicker
                  id="exit-product"
                  value={field.value || null}
                  onChange={(next) => {
                    field.onChange(next?.id ?? '')
                    setValue('batchId', AUTO)
                  }}
                  invalid={!!errors.productId}
                />
              )}
            />
          </FormField>

          <FormField
            label="Cantidad"
            htmlFor="exit-quantity"
            error={errors.quantity?.message}
            hint={product ? `Disponible: ${product.availableStock} ${product.unit}` : undefined}
          >
            <Input
              id="exit-quantity"
              type="number"
              inputMode="numeric"
              min="1"
              max={product?.availableStock}
              step="1"
              aria-invalid={!!errors.quantity}
              {...register('quantity')}
            />
          </FormField>

          <FormField label="Lote" htmlFor="exit-batch" error={errors.batchId?.message}>
            <Controller
              control={control}
              name="batchId"
              render={({ field }) => (
                <SimpleSelect id="exit-batch" value={field.value} onChange={(value) => field.onChange(value ?? AUTO)} options={batchOptions} disabled={!selectedId} className="h-8" />
              )}
            />
          </FormField>

          <FormField label="Motivo" htmlFor="exit-reason" error={errors.reason?.message} className="sm:col-span-2">
            <Input id="exit-reason" list="exit-reasons" placeholder="Producto vencido" aria-invalid={!!errors.reason} {...register('reason')} />
            <datalist id="exit-reasons">
              {EXIT_REASONS.map((reason) => (
                <option key={reason} value={reason} />
              ))}
            </datalist>
          </FormField>
        </form>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={exit.isPending}>
            Cancelar
          </Button>
          <Button type="submit" form="stock-exit-form" variant="destructive" disabled={exit.isPending}>
            {exit.isPending && <Loader2 className="animate-spin" />}
            Registrar salida
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
