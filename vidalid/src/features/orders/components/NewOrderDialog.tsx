import { Loader2, Minus, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { FormField } from '@/components/shared/FormField'
import { SimpleSelect } from '@/components/shared/SimpleSelect'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { CustomerPicker } from '@/features/customers/components/CustomerPicker'
import type { CustomerOption } from '@/features/customers/services/customers.service'
import { ProductPicker } from '@/features/products/components/ProductPicker'
import type { ProductOption } from '@/features/products/services/products.service'
import { toUserMessage } from '@/lib/errors'
import { fromCents, toCents } from '@/lib/money'
import { cn, formatBolivianos } from '@/lib/utils'
import { useCreateOrder } from '../hooks/useOrders'
import type { DeliveryMode } from '../types'

interface Line {
  product: ProductOption
  quantity: number
}

const sourceOptions = [
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'manual', label: 'Manual (llamada / en persona)' },
]

interface NewOrderDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: (id: string) => void
}

/** RF-46 / RF-47 · Registrar un pedido recibido por WhatsApp o en persona. */
export function NewOrderDialog({ open, onOpenChange, onCreated }: NewOrderDialogProps) {
  const create = useCreateOrder()
  const [source, setSource] = useState<'whatsapp' | 'manual'>('whatsapp')
  const [customer, setCustomer] = useState<CustomerOption | null>(null)
  const [contactName, setContactName] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [mode, setMode] = useState<DeliveryMode>('pickup')
  const [address, setAddress] = useState('')
  const [notes, setNotes] = useState('')
  const [lines, setLines] = useState<Line[]>([])
  const [pickerKey, setPickerKey] = useState(0)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const totalCents = lines.reduce((sum, line) => sum + toCents(line.product.salePrice) * line.quantity, 0)

  const addProduct = (product: ProductOption | null) => {
    if (!product) return
    setLines((current) =>
      current.some((line) => line.product.id === product.id)
        ? current.map((line) => (line.product.id === product.id ? { ...line, quantity: line.quantity + 1 } : line))
        : [...current, { product, quantity: 1 }],
    )
    setPickerKey((key) => key + 1)
  }

  const setQuantity = (productId: string, quantity: number) =>
    setLines((current) => current.map((line) => (line.product.id === productId ? { ...line, quantity: Math.max(1, Math.floor(quantity) || 1) } : line)))

  const submit = () => {
    const next: Record<string, string> = {}
    if (lines.length === 0) next.items = 'Agrega al menos un producto.'
    if (!customer && contactName.trim().length < 2) next.contactName = 'Indica el nombre de contacto o elige un cliente.'
    if (!customer?.phone && !/^[0-9+() -]{6,20}$/.test(contactPhone.trim())) next.contactPhone = 'Indica un teléfono válido.'
    if (mode === 'delivery' && address.trim().length < 5) next.address = 'Indica la dirección de entrega.'
    setErrors(next)
    if (Object.keys(next).length) return

    create.mutate(
      {
        items: lines.map((line) => ({ productId: line.product.id, quantity: line.quantity })),
        deliveryMode: mode,
        source,
        customerId: customer?.id ?? null,
        contactName: contactName.trim() || null,
        contactPhone: contactPhone.trim() || null,
        address: mode === 'delivery' ? address.trim() : null,
        notes: notes.trim() || null,
      },
      {
        onSuccess: (id) => {
          toast.success('Pedido registrado.')
          onOpenChange(false)
          onCreated(id)
        },
        onError: (error) => toast.error(toUserMessage(error, 'No se pudo registrar el pedido.')),
      },
    )
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !create.isPending && onOpenChange(next)}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Nuevo pedido</DialogTitle>
          <DialogDescription>El pedido queda pendiente. Al confirmarlo se reserva el stock.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Origen" htmlFor="order-source">
            <SimpleSelect id="order-source" value={source} onChange={(value) => setSource((value ?? 'whatsapp') as 'whatsapp' | 'manual')} options={sourceOptions} className="h-8" />
          </FormField>
          <FormField label="Cliente (opcional)" htmlFor="order-customer">
            <CustomerPicker
              id="order-customer"
              value={customer?.id ?? null}
              onChange={(next) => {
                setCustomer(next)
                if (next) {
                  setContactName('')
                  setContactPhone('')
                }
              }}
              placeholder="Buscar cliente registrado…"
            />
          </FormField>

          <FormField label="Nombre de contacto" htmlFor="order-contact" error={errors.contactName} hint={customer ? `Si lo dejas vacío: ${customer.name}` : undefined}>
            <Input id="order-contact" value={contactName} onChange={(event) => setContactName(event.target.value)} maxLength={120} aria-invalid={!!errors.contactName} />
          </FormField>
          <FormField label="Teléfono / WhatsApp" htmlFor="order-phone" error={errors.contactPhone} hint={customer?.phone ? `Si lo dejas vacío: ${customer.phone}` : undefined}>
            <Input id="order-phone" type="tel" inputMode="tel" value={contactPhone} onChange={(event) => setContactPhone(event.target.value)} maxLength={20} aria-invalid={!!errors.contactPhone} />
          </FormField>

          <FormField label="Entrega" htmlFor="order-mode" className="sm:col-span-2">
            <div className="grid grid-cols-2 gap-2" id="order-mode">
              {(['pickup', 'delivery'] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setMode(value)}
                  aria-pressed={mode === value}
                  className={cn('rounded-lg border p-2.5 text-sm font-medium transition', mode === value ? 'border-primary bg-secondary text-primary' : 'hover:bg-muted')}
                >
                  {value === 'pickup' ? 'Recogida en almacén' : 'Envío a domicilio'}
                </button>
              ))}
            </div>
          </FormField>

          {mode === 'delivery' && (
            <FormField label="Dirección de entrega" htmlFor="order-address" error={errors.address} className="sm:col-span-2">
              <Input id="order-address" value={address} onChange={(event) => setAddress(event.target.value)} maxLength={300} placeholder="Calle, número, zona, referencia…" aria-invalid={!!errors.address} />
            </FormField>
          )}

          <FormField label="Productos" htmlFor="order-product" error={errors.items} className="sm:col-span-2">
            <ProductPicker key={pickerKey} id="order-product" value={null} onChange={addProduct} placeholder="Buscar y agregar producto…" />
            {lines.length > 0 && (
              <ul className="mt-2 divide-y rounded-lg border">
                {lines.map((line) => (
                  <li key={line.product.id} className="flex flex-wrap items-center gap-2 px-3 py-2 sm:flex-nowrap">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{line.product.name}</p>
                      <p className={cn('text-xs', line.quantity > line.product.availableStock ? 'font-semibold text-warning' : 'text-muted-foreground')}>
                        {formatBolivianos(line.product.salePrice)} · disponible {line.product.availableStock}
                        {line.quantity > line.product.availableStock && ' (no alcanza para confirmar)'}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button type="button" variant="outline" size="icon-sm" aria-label="Quitar uno" onClick={() => setQuantity(line.product.id, line.quantity - 1)} disabled={line.quantity <= 1}>
                        <Minus />
                      </Button>
                      <Input type="number" min={1} value={line.quantity} onChange={(event) => setQuantity(line.product.id, Number(event.target.value))} className="h-7 w-16 text-center tabular-nums" aria-label={`Cantidad de ${line.product.name}`} />
                      <Button type="button" variant="outline" size="icon-sm" aria-label="Agregar uno" onClick={() => setQuantity(line.product.id, line.quantity + 1)}>
                        <Plus />
                      </Button>
                    </div>
                    <span className="w-20 text-right text-sm font-semibold tabular-nums">{formatBolivianos(fromCents(toCents(line.product.salePrice) * line.quantity))}</span>
                    <Button type="button" variant="ghost" size="icon-sm" aria-label={`Quitar ${line.product.name}`} onClick={() => setLines((current) => current.filter((item) => item.product.id !== line.product.id))}>
                      <Trash2 className="text-destructive" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </FormField>

          <FormField label="Observaciones (opcional)" htmlFor="order-notes" className="sm:col-span-2">
            <Textarea id="order-notes" rows={2} maxLength={1000} value={notes} onChange={(event) => setNotes(event.target.value)} />
          </FormField>
        </div>

        <DialogFooter className="items-center sm:justify-between">
          <p className="text-sm">
            Total estimado: <span className="font-heading text-lg font-bold tabular-nums">{formatBolivianos(fromCents(totalCents))}</span>
          </p>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={create.isPending}>
              Cancelar
            </Button>
            <Button type="button" onClick={submit} disabled={create.isPending}>
              {create.isPending && <Loader2 className="animate-spin" />}
              Registrar pedido
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
