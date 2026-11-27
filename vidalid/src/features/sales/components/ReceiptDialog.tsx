import { Printer } from 'lucide-react'
import { PrintPortal } from '@/components/shared/PrintPortal'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { toUserMessage } from '@/lib/errors'
import { useSale } from '../hooks/useSales'
import { SaleReceipt } from './SaleReceipt'

interface ReceiptDialogProps {
  saleId: string | null
  onOpenChange: (open: boolean) => void
}

/** Muestra el comprobante de una venta con opción de imprimir. */
export function ReceiptDialog({ saleId, onOpenChange }: ReceiptDialogProps) {
  const sale = useSale(saleId)

  return (
    <Dialog open={!!saleId} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Comprobante de venta</DialogTitle>
          <DialogDescription>Puedes imprimirlo o guardarlo como PDF desde la ventana de impresión.</DialogDescription>
        </DialogHeader>

        <div className="rounded-lg border bg-white p-4">
          {sale.isLoading && <Skeleton className="h-72 w-full" />}
          {sale.isError && <p className="text-sm text-destructive">{toUserMessage(sale.error, 'No se pudo cargar el comprobante.')}</p>}
          {sale.data && <SaleReceipt sale={sale.data} />}
        </div>

        {/* Copia completa para la impresora (fuera del diálogo). */}
        {sale.data && (
          <PrintPortal>
            <SaleReceipt sale={sale.data} />
          </PrintPortal>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
          <Button onClick={() => window.print()} disabled={!sale.data}>
            <Printer /> Imprimir
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
