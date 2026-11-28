import { ArrowLeft, Loader2, Minus, Plus, ShoppingCart, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { CustomerPicker } from '@/features/customers/components/CustomerPicker'
import { ProductPicker } from '@/features/products/components/ProductPicker'
import { useProductOptions } from '@/features/products/hooks/useProducts'
import { toUserMessage } from '@/lib/errors'
import { fromCents, parseAmount, toCents } from '@/lib/money'
import { cn, formatBolivianos } from '@/lib/utils'
import { PaymentFields } from '../components/PaymentFields'
import { usePaymentForm } from '../hooks/usePaymentForm'
import { ReceiptDialog } from '../components/ReceiptDialog'
import { useRegisterSale } from '../hooks/useSales'
import { useCartStore } from '../store/cart.store'

/** Flujo de venta: cliente → productos → existencias → total → pago → confirmar → comprobante. */
export function NewSalePage() {
  const { customerId, lines, setCustomer, addProduct, setQuantity, remove, clear } = useCartStore()
  const { data: productOptions = [] } = useProductOptions()
  const registerSale = useRegisterSale()

  const [pickerKey, setPickerKey] = useState(0)
  const [discountText, setDiscountText] = useState('')
  const [notes, setNotes] = useState('')
  const [receiptId, setReceiptId] = useState<string | null>(null)

  // Totales en centavos.
  const subtotalCents = lines.reduce((sum, line) => sum + toCents(line.unitPrice) * line.quantity, 0)
  const discountCents = Math.min(toCents(parseAmount(discountText)), subtotalCents)
  const totalCents = subtotalCents - discountCents
  const payment = usePaymentForm(totalCents)

  // Avisos de stock con datos actualizados (otra venta pudo consumir unidades).
  const stockIssues = lines.filter((line) => {
    const current = productOptions.find((product) => product.id === line.productId)
    return current && line.quantity > current.availableStock
  })

  const problems: string[] = []
  if (lines.length === 0) problems.push('Agrega al menos un producto.')
  if (toCents(parseAmount(discountText)) > subtotalCents) problems.push('El descuento no puede superar el subtotal.')
  if (payment.problem) problems.push(payment.problem)
  if (stockIssues.length) problems.push('Hay productos con más cantidad que el stock disponible.')

  const resetPayment = () => {
    setDiscountText('')
    payment.reset()
    setNotes('')
  }

  const confirmSale = () => {
    if (problems.length) {
      toast.error(problems[0])
      return
    }
    registerSale.mutate(
      {
        customerId,
        items: lines.map((line) => ({ productId: line.productId, quantity: line.quantity })),
        payments: payment.payments(),
        discount: fromCents(discountCents),
        notes: notes.trim() || null,
      },
      {
        onSuccess: (saleId) => {
          toast.success('Venta registrada.')
          clear()
          resetPayment()
          setPickerKey((key) => key + 1)
          setReceiptId(saleId)
        },
        onError: (error) => toast.error(toUserMessage(error, 'No se pudo registrar la venta.')),
      },
    )
  }

  return (
    <>
      <PageHeader
        title="Nueva venta"
        description="Selecciona el cliente, agrega productos y registra el pago."
        actions={
          <Link to="/admin/ventas" className={buttonVariants({ variant: 'outline' })}>
            <ArrowLeft /> Historial de ventas
          </Link>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
        {/* Columna izquierda: cliente + productos */}
        <div className="space-y-4">
          <section className="grid gap-4 rounded-xl border bg-card p-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="sale-customer">Cliente</Label>
              <CustomerPicker id="sale-customer" value={customerId} onChange={(customer) => setCustomer(customer?.id ?? null)} placeholder="Cliente ocasional (opcional)" />
              <p className="text-xs text-muted-foreground">Déjalo vacío para una venta sin registrar cliente.</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sale-product">Agregar producto</Label>
              <ProductPicker
                key={pickerKey}
                id="sale-product"
                value={null}
                onChange={(product) => {
                  if (!product) return
                  const result = addProduct(product)
                  if (result === 'no-stock') toast.error(`“${product.name}” no tiene stock disponible.`)
                  setPickerKey((key) => key + 1)
                }}
              />
              <p className="text-xs text-muted-foreground">Busca por nombre o SKU. Se muestra el disponible.</p>
            </div>
          </section>

          <section className="overflow-hidden rounded-xl border bg-card">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <h2 className="flex items-center gap-2 text-sm font-semibold">
                <ShoppingCart className="size-4" /> Productos ({lines.length})
              </h2>
              {lines.length > 0 && (
                <Button variant="ghost" size="sm" className="text-destructive" onClick={() => clear()}>
                  <Trash2 /> Vaciar
                </Button>
              )}
            </div>

            {lines.length === 0 ? (
              <p className="px-4 py-12 text-center text-sm text-muted-foreground">El carrito está vacío. Busca un producto para empezar.</p>
            ) : (
              <ul className="divide-y">
                {lines.map((line) => {
                  const overStock = stockIssues.some((issue) => issue.productId === line.productId)
                  return (
                    <li key={line.productId} className="flex flex-wrap items-center gap-3 px-4 py-3 sm:flex-nowrap">
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{line.name}</p>
                        <p className={cn('text-xs', overStock ? 'font-semibold text-destructive' : 'text-muted-foreground')}>
                          {line.sku} · {formatBolivianos(line.unitPrice)} / {line.unit} · disponible {line.available}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button variant="outline" size="icon-sm" aria-label="Quitar uno" onClick={() => setQuantity(line.productId, line.quantity - 1)} disabled={line.quantity <= 1}>
                          <Minus />
                        </Button>
                        <Input
                          type="number"
                          inputMode="numeric"
                          min={1}
                          max={line.available}
                          value={line.quantity}
                          onChange={(event) => setQuantity(line.productId, Number(event.target.value))}
                          className="h-7 w-16 text-center tabular-nums"
                          aria-label={`Cantidad de ${line.name}`}
                        />
                        <Button variant="outline" size="icon-sm" aria-label="Agregar uno" onClick={() => setQuantity(line.productId, line.quantity + 1)} disabled={line.quantity >= line.available}>
                          <Plus />
                        </Button>
                      </div>
                      <p className="w-24 text-right font-semibold tabular-nums">{formatBolivianos(fromCents(toCents(line.unitPrice) * line.quantity))}</p>
                      <Button variant="ghost" size="icon-sm" aria-label={`Quitar ${line.name}`} onClick={() => remove(line.productId)}>
                        <Trash2 className="text-destructive" />
                      </Button>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>
        </div>

        {/* Columna derecha: totales y pago */}
        <aside className="h-fit space-y-4 rounded-xl border bg-card p-4 lg:sticky lg:top-20">
          <h2 className="text-sm font-semibold">Resumen y pago</h2>

          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Subtotal</dt>
              <dd className="tabular-nums">{formatBolivianos(fromCents(subtotalCents))}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt>
                <Label htmlFor="sale-discount" className="font-normal text-muted-foreground">
                  Descuento (Bs)
                </Label>
              </dt>
              <dd>
                <Input id="sale-discount" type="number" inputMode="decimal" min={0} step="0.01" value={discountText} onChange={(event) => setDiscountText(event.target.value)} placeholder="0,00" className="h-8 w-28 text-right tabular-nums" />
              </dd>
            </div>
            <div className="flex items-baseline justify-between border-t pt-3">
              <dt className="font-semibold">Total</dt>
              <dd className="font-heading text-2xl font-bold tabular-nums">{formatBolivianos(fromCents(totalCents))}</dd>
            </div>
          </dl>

          <PaymentFields form={payment} idPrefix="sale" />

          <div className="space-y-1.5">
            <Label htmlFor="sale-notes">Observaciones (opcional)</Label>
            <Textarea id="sale-notes" rows={2} maxLength={1000} value={notes} onChange={(event) => setNotes(event.target.value)} />
          </div>

          {problems.length > 0 && lines.length > 0 && <p className="text-xs text-destructive">{problems[0]}</p>}

          <Button className="h-11 w-full text-base" onClick={confirmSale} disabled={registerSale.isPending || lines.length === 0}>
            {registerSale.isPending && <Loader2 className="animate-spin" />}
            Confirmar venta · {formatBolivianos(fromCents(totalCents))}
          </Button>
        </aside>
      </div>

      <ReceiptDialog saleId={receiptId} onOpenChange={(open) => !open && setReceiptId(null)} />
    </>
  )
}
