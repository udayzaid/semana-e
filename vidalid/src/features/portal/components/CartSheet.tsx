import { Minus, Plus, ShoppingBag, Trash2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button, buttonVariants } from '@/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { fromCents, toCents } from '@/lib/money'
import { formatBolivianos } from '@/lib/utils'
import { useCartProducts } from '../hooks/useCatalog'
import { usePortalCart } from '../store/portalCart.store'
import { ProductImage } from './ProductImage'

/** Carrito lateral: revisar y ajustar el pedido sin salir de la tienda. */
export function CartSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { items, setQuantity, remove } = usePortalCart()
  const live = useCartProducts(open ? items.map((item) => item.productId) : [])

  const lines = items.map((item) => {
    const current = live.data?.find((product) => product.id === item.productId)
    return { ...item, unitPrice: current?.salePrice ?? item.unitPrice, available: current?.availableStock ?? item.quantity, unavailable: live.data !== undefined && (!current || !current.inStock) }
  })
  const totalCents = lines.filter((line) => !line.unavailable).reduce((sum, line) => sum + toCents(line.unitPrice) * line.quantity, 0)
  const units = items.reduce((sum, item) => sum + item.quantity, 0)

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
        <SheetHeader className="border-b">
          <SheetTitle className="flex items-center gap-2 font-heading text-lg">
            <ShoppingBag className="size-5 text-brand" /> Mi carrito
          </SheetTitle>
          <SheetDescription>{units > 0 ? `${units} producto${units === 1 ? '' : 's'} en tu pedido` : 'Tu carrito está vacío'}</SheetDescription>
        </SheetHeader>

        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
            <span className="grid size-14 place-items-center rounded-2xl bg-secondary text-brand">
              <ShoppingBag className="size-7" />
            </span>
            <p className="text-sm text-muted-foreground">Agrega productos desde la tienda.</p>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Seguir comprando
            </Button>
          </div>
        ) : (
          <>
            <ul className="flex-1 divide-y overflow-y-auto">
              {lines.map((line) => (
                <li key={line.productId} className="flex gap-3 p-4">
                  <ProductImage imagePath={line.imagePath} name={line.name} className="size-16 shrink-0 rounded-xl" />
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-sm font-medium">{line.name}</p>
                    <p className="text-xs text-muted-foreground">{formatBolivianos(line.unitPrice)} · {line.unit}</p>
                    {line.unavailable && <p className="text-xs font-semibold text-destructive">Ya no está disponible</p>}
                    <div className="mt-2 flex items-center justify-between">
                      <div className="flex items-center rounded-full border">
                        <button type="button" className="grid size-7 place-items-center disabled:opacity-40" onClick={() => setQuantity(line.productId, line.quantity - 1, line.available)} disabled={line.quantity <= 1} aria-label="Quitar uno">
                          <Minus className="size-3.5" />
                        </button>
                        <span className="w-7 text-center text-sm font-semibold tabular-nums">{line.quantity}</span>
                        <button type="button" className="grid size-7 place-items-center disabled:opacity-40" onClick={() => setQuantity(line.productId, line.quantity + 1, line.available)} disabled={line.quantity >= line.available} aria-label="Agregar uno">
                          <Plus className="size-3.5" />
                        </button>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-sm font-semibold tabular-nums">{formatBolivianos(fromCents(toCents(line.unitPrice) * line.quantity))}</span>
                        <Button variant="ghost" size="icon-sm" onClick={() => remove(line.productId)} aria-label={`Quitar ${line.name}`}>
                          <Trash2 className="text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
            <div className="space-y-3 border-t bg-muted/30 p-4">
              <div className="flex items-baseline justify-between">
                <span className="text-sm text-muted-foreground">Total estimado</span>
                <span className="font-heading text-xl font-bold tabular-nums">{formatBolivianos(fromCents(totalCents))}</span>
              </div>
              <Link to="/carrito" onClick={() => onOpenChange(false)} className={buttonVariants({ size: 'lg', className: 'h-11 w-full text-base' })}>
                Finalizar pedido
              </Link>
              <Button variant="ghost" className="w-full" onClick={() => onOpenChange(false)}>
                Seguir comprando
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
