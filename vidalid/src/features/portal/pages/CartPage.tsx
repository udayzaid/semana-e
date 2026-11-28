import { zodResolver } from '@hookform/resolvers/zod'
import { AlertTriangle, Loader2, Minus, Plus, ShoppingBag, Store, Trash2, Truck } from 'lucide-react'
import { useEffect } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { z } from 'zod'
import { FormField } from '@/components/shared/FormField'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { toUserMessage } from '@/lib/errors'
import { fromCents, toCents } from '@/lib/money'
import { cn, formatBolivianos } from '@/lib/utils'
import { ProductImage } from '../components/ProductImage'
import { useMyCustomer } from '../hooks/useAccount'
import { useCartProducts, useSubmitWebOrder } from '../hooks/useCatalog'
import { usePortalCart } from '../store/portalCart.store'

// RF-79 a RF-81 · Mismas reglas que la función submit_web_order de la base de datos.
const checkoutSchema = z
  .object({
    contactName: z.string().trim().min(2, 'Indica tu nombre.').max(120, 'Máximo 120 caracteres.'),
    contactPhone: z.string().trim().regex(/^[0-9+() -]{6,20}$/, 'Indica un número de WhatsApp o teléfono válido.'),
    deliveryMode: z.enum(['pickup', 'delivery']),
    address: z.string().trim().max(300, 'Máximo 300 caracteres.'),
    notes: z.string().trim().max(1000, 'Máximo 1000 caracteres.'),
  })
  .refine((values) => values.deliveryMode === 'pickup' || values.address.length >= 5, {
    path: ['address'],
    message: 'Indica la dirección de entrega.',
  })

type CheckoutValues = z.infer<typeof checkoutSchema>

/** RF-78 a RF-81 · Carrito y solicitud de pedido sin registro. */
export function CartPage() {
  const navigate = useNavigate()
  const { items, setQuantity, remove, clear } = usePortalCart()
  const live = useCartProducts(items.map((item) => item.productId))
  const submit = useSubmitWebOrder()

  const { register, control, handleSubmit, setValue, getValues, formState: { errors } } = useForm<CheckoutValues>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: { contactName: '', contactPhone: '', deliveryMode: 'pickup', address: '', notes: '' },
  })
  const deliveryMode = useWatch({ control, name: 'deliveryMode' })

  // Cliente con cuenta: completar sus datos (sin pisar lo que ya escribió).
  const me = useMyCustomer()
  useEffect(() => {
    if (!me.data) return
    const current = getValues()
    if (!current.contactName) setValue('contactName', me.data.businessName ? `${me.data.name} (${me.data.businessName})`.slice(0, 120) : me.data.name)
    if (!current.contactPhone && me.data.phone) setValue('contactPhone', me.data.phone)
    if (!current.address && me.data.address) setValue('address', me.data.address)
  }, [me.data, getValues, setValue])

  // Datos vigentes del catálogo (precio y disponibilidad pueden haber cambiado).
  const lines = items.map((item) => {
    const current = live.data?.find((product) => product.id === item.productId)
    const unavailable = live.data !== undefined && (!current || !current.inStock)
    const available = current?.availableStock ?? item.quantity
    return { ...item, unitPrice: current?.salePrice ?? item.unitPrice, available, unavailable, tooMany: !!current && item.quantity > current.availableStock }
  })
  const totalCents = lines.filter((line) => !line.unavailable).reduce((sum, line) => sum + toCents(line.unitPrice) * line.quantity, 0)
  const hasProblems = lines.some((line) => line.unavailable || line.tooMany)

  const onSubmit = (values: CheckoutValues) => {
    if (hasProblems) {
      toast.error('Revisa los productos marcados antes de enviar tu pedido.')
      return
    }
    submit.mutate(
      {
        items: lines.map((line) => ({ productId: line.productId, quantity: line.quantity })),
        contactName: values.contactName,
        contactPhone: values.contactPhone,
        deliveryMode: values.deliveryMode,
        address: values.deliveryMode === 'delivery' ? values.address : null,
        notes: values.notes || null,
      },
      {
        onSuccess: (code) => {
          const summary = { code, name: values.contactName, total: fromCents(totalCents), mode: values.deliveryMode, items: lines.map((line) => `${line.quantity} × ${line.name}`) }
          clear()
          navigate('/pedido-enviado', { replace: true, state: summary })
        },
        onError: (error) => toast.error(toUserMessage(error, 'No se pudo enviar tu pedido. Inténtalo de nuevo.')),
      },
    )
  }

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-xl px-4 py-20 text-center">
        <span className="mx-auto grid size-16 place-items-center rounded-3xl bg-secondary text-brand">
          <ShoppingBag className="size-8" />
        </span>
        <h1 className="mt-4 font-heading text-2xl font-bold">Tu pedido está vacío</h1>
        <p className="mt-2 text-sm text-muted-foreground">Agrega productos desde el catálogo para enviar tu solicitud.</p>
        <Link to="/catalogo" className={buttonVariants({ size: 'lg', className: 'mt-6 h-11 px-6' })}>
          Ver catálogo
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="font-heading text-3xl font-bold">Mi pedido</h1>
      <p className="mt-1 text-sm text-muted-foreground">Revisa tus productos y envía tu solicitud. No necesitas crear una cuenta.</p>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_400px]">
        {/* Productos */}
        <section className="overflow-hidden rounded-2xl border bg-card">
          <ul className="divide-y">
            {lines.map((line) => (
              <li key={line.productId} className={cn('flex gap-3 p-4', line.unavailable && 'bg-destructive/5')}>
                <ProductImage imagePath={line.imagePath} name={line.name} className="size-20 shrink-0 rounded-xl" />
                <div className="min-w-0 flex-1">
                  <Link to={`/producto/${line.productId}`} className="line-clamp-2 font-medium hover:text-primary">
                    {line.name}
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    {formatBolivianos(line.unitPrice)} · {line.unit}
                  </p>
                  {line.unavailable && <p className="mt-1 flex items-center gap-1 text-xs font-semibold text-destructive"><AlertTriangle className="size-3.5" /> Ya no está disponible: quítalo para continuar.</p>}
                  {line.tooMany && !line.unavailable && <p className="mt-1 flex items-center gap-1 text-xs font-semibold text-warning"><AlertTriangle className="size-3.5" /> Solo hay {line.available} disponibles.</p>}
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <div className="flex items-center rounded-full border">
                      <button type="button" className="grid size-8 place-items-center disabled:opacity-40" onClick={() => setQuantity(line.productId, line.quantity - 1, line.available)} disabled={line.quantity <= 1} aria-label="Quitar uno">
                        <Minus className="size-3.5" />
                      </button>
                      <span className="w-8 text-center text-sm font-semibold tabular-nums">{line.quantity}</span>
                      <button type="button" className="grid size-8 place-items-center disabled:opacity-40" onClick={() => setQuantity(line.productId, line.quantity + 1, line.available)} disabled={line.quantity >= line.available} aria-label="Agregar uno">
                        <Plus className="size-3.5" />
                      </button>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="font-semibold tabular-nums">{formatBolivianos(fromCents(toCents(line.unitPrice) * line.quantity))}</span>
                      <Button variant="ghost" size="icon-sm" onClick={() => remove(line.productId)} aria-label={`Quitar ${line.name}`}>
                        <Trash2 className="text-destructive" />
                      </Button>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
          <div className="flex items-center justify-between border-t bg-muted/30 px-4 py-3">
            <Link to="/catalogo" className="text-sm font-semibold text-primary hover:underline">
              + Agregar más productos
            </Link>
            <p className="text-sm">
              Total estimado: <span className="font-heading text-lg font-bold tabular-nums">{formatBolivianos(fromCents(totalCents))}</span>
            </p>
          </div>
        </section>

        {/* Datos del pedido */}
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="h-fit space-y-4 rounded-2xl border bg-card p-5 lg:sticky lg:top-24">
          <h2 className="font-heading text-lg font-bold">Tus datos</h2>

          <FormField label="Nombre o nombre de tu negocio" htmlFor="checkout-name" error={errors.contactName?.message}>
            <Input id="checkout-name" autoComplete="name" className="h-10" aria-invalid={!!errors.contactName} {...register('contactName')} />
          </FormField>
          <FormField label="WhatsApp o teléfono" htmlFor="checkout-phone" error={errors.contactPhone?.message} hint="Te escribiremos para confirmar tu pedido.">
            <Input id="checkout-phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="70012345" className="h-10" aria-invalid={!!errors.contactPhone} {...register('contactPhone')} />
          </FormField>

          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">¿Cómo quieres recibirlo?</legend>
            <div className="grid grid-cols-2 gap-2">
              {([
                { value: 'pickup', label: 'Recojo en almacén', icon: Store },
                { value: 'delivery', label: 'Envío a domicilio', icon: Truck },
              ] as const).map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setValue('deliveryMode', value, { shouldValidate: false })}
                  aria-pressed={deliveryMode === value}
                  className={cn('flex flex-col items-center gap-1 rounded-xl border p-3 text-sm font-medium transition', deliveryMode === value ? 'border-primary bg-secondary text-primary' : 'hover:bg-muted')}
                >
                  <Icon className="size-5" /> {label}
                </button>
              ))}
            </div>
          </fieldset>

          {deliveryMode === 'delivery' && (
            <FormField label="Dirección de entrega" htmlFor="checkout-address" error={errors.address?.message}>
              <Input id="checkout-address" autoComplete="street-address" placeholder="Calle, número, zona, referencia" className="h-10" aria-invalid={!!errors.address} {...register('address')} />
            </FormField>
          )}

          <FormField label="Observaciones (opcional)" htmlFor="checkout-notes" error={errors.notes?.message}>
            <Textarea id="checkout-notes" rows={2} placeholder="Horario preferido, detalles de tu pedido…" {...register('notes')} />
          </FormField>

          <Button type="submit" size="lg" className="h-12 w-full text-base" disabled={submit.isPending || hasProblems || live.isLoading}>
            {submit.isPending && <Loader2 className="animate-spin" />}
            Enviar solicitud de pedido
          </Button>
          <p className="text-center text-xs text-muted-foreground">El pago se coordina al confirmar (efectivo o QR). El precio final puede variar si cambia en el catálogo.</p>
        </form>
      </div>
    </div>
  )
}
