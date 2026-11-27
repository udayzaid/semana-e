import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { useForm, useWatch } from 'react-hook-form'
import { toast } from 'sonner'
import { FormField } from '@/components/shared/FormField'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { toUserMessage } from '@/lib/errors'
import { useStockAdjust } from '../hooks/useInventory'
import { ADJUST_REASONS, stockAdjustSchema, type StockAdjustFormInput, type StockAdjustFormValues } from '../schemas/inventory.schema'
import type { Batch } from '../types'

interface StockAdjustDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  batch: Batch | null
}

/** RF-18 · Ajuste por conteo físico de un lote. */
export function StockAdjustDialog({ open, onOpenChange, batch }: StockAdjustDialogProps) {
  const adjust = useStockAdjust()
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<StockAdjustFormInput, unknown, StockAdjustFormValues>({
    resolver: zodResolver(stockAdjustSchema),
    defaultValues: { countedQuantity: batch?.quantity ?? 0, reason: 'Conteo físico' },
  })

  const counted = Number(useWatch({ control, name: 'countedQuantity' }))
  const delta = batch && Number.isFinite(counted) ? counted - batch.quantity : 0

  const onSubmit = (values: StockAdjustFormValues) => {
    if (!batch) return
    adjust.mutate(
      { batchId: batch.id, countedQuantity: values.countedQuantity, reason: values.reason },
      {
        onSuccess: () => {
          toast.success('Ajuste registrado.')
          onOpenChange(false)
        },
        onError: (error) => toast.error(toUserMessage(error, 'No se pudo registrar el ajuste.')),
      },
    )
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !adjust.isPending && onOpenChange(next)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Ajustar lote</DialogTitle>
          <DialogDescription>
            {batch
              ? `${batch.productName} · lote ${batch.lotCode ?? 'sin código'}. Registrado: ${batch.quantity} ${batch.unit}.`
              : ''}
          </DialogDescription>
        </DialogHeader>

        <form id="stock-adjust-form" onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          <FormField
            label="Cantidad contada en el almacén"
            htmlFor="adjust-counted"
            error={errors.countedQuantity?.message}
            hint={delta === 0 ? 'Sin diferencia.' : `Diferencia: ${delta > 0 ? '+' : ''}${delta} ${batch?.unit ?? ''}`}
          >
            <Input id="adjust-counted" type="number" inputMode="numeric" min="0" step="1" aria-invalid={!!errors.countedQuantity} {...register('countedQuantity')} />
          </FormField>
          <FormField label="Motivo" htmlFor="adjust-reason" error={errors.reason?.message}>
            <Input id="adjust-reason" list="adjust-reasons" aria-invalid={!!errors.reason} {...register('reason')} />
            <datalist id="adjust-reasons">
              {ADJUST_REASONS.map((reason) => (
                <option key={reason} value={reason} />
              ))}
            </datalist>
          </FormField>
        </form>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={adjust.isPending}>
            Cancelar
          </Button>
          <Button type="submit" form="stock-adjust-form" disabled={adjust.isPending || delta === 0}>
            {adjust.isPending && <Loader2 className="animate-spin" />}
            Guardar ajuste
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
