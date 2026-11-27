import { Loader2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { FormField } from '@/components/shared/FormField'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { toUserMessage } from '@/lib/errors'
import { formatBolivianos } from '@/lib/utils'
import { useVoidSale } from '../hooks/useSales'

interface VoidSaleDialogProps {
  sale: { id: string; code: string; total: number } | null
  onOpenChange: (open: boolean) => void
}

/** RF-45 · Anulación autorizada con motivo obligatorio. */
export function VoidSaleDialog({ sale, onOpenChange }: VoidSaleDialogProps) {
  const voidSale = useVoidSale()
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)

  const submit = () => {
    if (!sale) return
    if (reason.trim().length < 5) {
      setError('Indica el motivo de la anulación (mínimo 5 caracteres).')
      return
    }
    voidSale.mutate(
      { id: sale.id, reason: reason.trim() },
      {
        onSuccess: () => {
          toast.success(`Venta ${sale.code} anulada. El stock volvió al inventario.`)
          onOpenChange(false)
        },
        onError: (err) => toast.error(toUserMessage(err, 'No se pudo anular la venta.')),
      },
    )
  }

  return (
    <Dialog open={!!sale} onOpenChange={(next) => !voidSale.isPending && onOpenChange(next)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Anular venta {sale?.code}</DialogTitle>
          <DialogDescription>
            La venta de {sale ? formatBolivianos(sale.total) : ''} quedará marcada como anulada, los productos vuelven a sus lotes y queda registrado en el historial. Esta acción no se puede deshacer.
          </DialogDescription>
        </DialogHeader>
        <FormField label="Motivo de la anulación" htmlFor="void-reason" error={error ?? undefined}>
          <Textarea
            id="void-reason"
            rows={3}
            maxLength={500}
            value={reason}
            onChange={(event) => {
              setReason(event.target.value)
              setError(null)
            }}
            placeholder="El cliente devolvió los productos, error al registrar…"
            aria-invalid={!!error}
          />
        </FormField>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={voidSale.isPending}>
            Cancelar
          </Button>
          <Button variant="destructive" onClick={submit} disabled={voidSale.isPending}>
            {voidSale.isPending && <Loader2 className="animate-spin" />}
            Anular venta
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
