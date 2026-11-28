import { zodResolver } from '@hookform/resolvers/zod'
import { AlertTriangle, ClipboardList, Loader2, LogIn, Minus, Plus, Receipt, ShoppingBag, Store, Trash2, Truck, UserPlus, UserRound } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { z } from 'zod'
import { FormField } from '@/components/shared/FormField'
import { Button, buttonVariants } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { toUserMessage } from '@/lib/errors'
import { fromCents, toCents } from '@/lib/money'
import { cn, formatBolivianos } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth.store'
import { MyOrdersList, MyPurchasesList } from '../components/AccountLists'
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

/** RF-78 a RF-81 · Carrito y solicitud de pedido (con o sin cuenta). */
function CartTab() {
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

  // Al enviar sin sesión se pregunta: ingresar, crear cuenta o continuar como invitado.
  const isLoggedIn = useAuthStore((state) => state.status === 'authenticated')
  const [askAccount, setAskAccount] = useState(false)
  const [pendingValues, setPendingValues] = useState<CheckoutValues | null>(null)

  const onSubmit = (values: CheckoutValues) => {
    if (hasProblems) {
      toast.error('Revisa los productos marcados antes de enviar tu pedido.')
      return
    }
    if (!isLoggedIn && !pendingValues) {
      setPendingValues(values)
      setAskAccount(true)
      return
    }
    sendOrder(values)
  }

  const sendOrder = (values: CheckoutValues) => {
    setAskAccount(false)
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
        onError: (error) => {
          setPendingValues(null)
          toast.error(toUserMessage(error, 'No se pudo enviar tu pedido. Inténtalo de nuevo.'))
        },
      },
    )
  }

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed bg-card px-4 py-16 text-center">
        <span className="mx-auto grid size-16 place-items-center rounded-3xl bg-secondary text-brand">
          <ShoppingBag className="size-8" />
        </span>
        <h2 className="mt-4 font-heading text-2xl font-bold">Tu carrito está vacío</h2>
        <p className="mt-2 text-sm text-muted-foreground">Agrega productos desde la tienda para enviar tu pedido.</p>
        <Link to="/" className={buttonVariants({ size: 'lg', className: 'mt-6 h-11 px-6' })}>
          Ir a la tienda
        </Link>
      </div>
    )
  }

  return (
    <div>
      <AccountChoiceDialog
        open={askAccount}
        onOpenChange={(open) => {
          setAskAccount(open)
          if (!open) setPendingValues(null)
        }}
        onGuest={() => pendingValues && sendOrder(pendingValues)}
        sending={submit.isPending}
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_400px]">
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
            <Link to="/" className="text-sm font-semibold text-primary hover:underline">
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

type CartTabKey = 'carrito' | 'pedidos' | 'compras'

/** "Mi pedido": carrito, mis pedidos y mis compras en un solo lugar. La pestaña vive en la URL (?tab=). */
export function CartPage() {
  const [params, setParams] = useSearchParams()
  const tab = (['carrito', 'pedidos', 'compras'].includes(params.get('tab') ?? '') ? params.get('tab') : 'carrito') as CartTabKey
  const count = usePortalCart((state) => state.items.reduce((sum, item) => sum + item.quantity, 0))
  const isCustomer = useAuthStore((state) => state.status === 'authenticated' && state.profile?.role === 'customer')

  const tabs: { key: CartTabKey; label: string; icon: typeof ShoppingBag; badge?: number }[] = [
    { key: 'carrito', label: 'Carrito', icon: ShoppingBag, badge: count },
    { key: 'pedidos', label: 'Mis pedidos', icon: ClipboardList },
    { key: 'compras', label: 'Mis compras', icon: Receipt },
  ]

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="font-heading text-3xl font-bold">Mi pedido</h1>
      <p className="mt-1 text-sm text-muted-foreground">Tu carrito, el estado de tus pedidos y tus compras.</p>

      <div className="mt-6 flex gap-1 overflow-x-auto rounded-xl bg-muted p-1 sm:inline-flex" role="tablist" aria-label="Mi pedido">
        {tabs.map(({ key, label, icon: Icon, badge }) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            onClick={() => setParams(key === 'carrito' ? {} : { tab: key }, { replace: true })}
            className={cn(
              'flex shrink-0 items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition',
              tab === key ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <Icon className="size-4" /> {label}
            {!!badge && <span className="rounded-full bg-primary px-1.5 text-xs font-bold text-primary-foreground tabular-nums">{badge}</span>}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {tab === 'carrito' && <CartTab />}
        {tab !== 'carrito' &&
          (isCustomer ? (
            <section className="rounded-2xl border bg-card p-5">{tab === 'pedidos' ? <MyOrdersList /> : <MyPurchasesList />}</section>
          ) : (
            <GuestPrompt what={tab === 'pedidos' ? 'el estado de tus pedidos' : 'tus compras'} from={`/carrito?tab=${tab}`} />
          ))}
      </div>
    </div>
  )
}

/** Para ver pedidos y compras hace falta una cuenta de cliente. */
function GuestPrompt({ what, from }: { what: string; from: string }) {
  return (
    <div className="rounded-2xl border bg-card px-6 py-12 text-center">
      <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-secondary text-brand">
        <UserRound className="size-7" />
      </span>
      <h2 className="mt-4 font-heading text-xl font-bold">Inicia sesión para ver {what}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
        Con tu cuenta de cliente puedes seguir cada pedido y revisar tu historial de compras. Si pediste sin cuenta, te contactaremos por WhatsApp.
      </p>
      <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
        <Link to="/login" state={{ from }} className={buttonVariants({ size: 'lg', className: 'h-11 px-6' })}>
          <LogIn /> Iniciar sesión
        </Link>
        <Link to="/registro" className={buttonVariants({ size: 'lg', variant: 'outline', className: 'h-11 px-6' })}>
          <UserPlus /> Crear cuenta
        </Link>
      </div>
    </div>
  )
}

/** Antes de enviar sin sesión: ingresar, crear cuenta o continuar como invitado (la cuenta es opcional). */
function AccountChoiceDialog({ open, onOpenChange, onGuest, sending }: { open: boolean; onOpenChange: (open: boolean) => void; onGuest: () => void; sending: boolean }) {
  return (
    <Dialog open={open} onOpenChange={(next) => !sending && onOpenChange(next)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>¿Cómo quieres continuar?</DialogTitle>
          <DialogDescription>Con una cuenta puedes seguir el estado de tu pedido y ver tus compras. Tu carrito se mantiene.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-2">
          <Link to="/login" state={{ from: '/carrito' }} className={buttonVariants({ size: 'lg', className: 'h-11' })}>
            <LogIn /> Iniciar sesión
          </Link>
          <Link to="/registro" state={{ from: '/carrito' }} className={buttonVariants({ size: 'lg', variant: 'outline', className: 'h-11' })}>
            <UserPlus /> Crear cuenta
          </Link>
          <Button size="lg" variant="ghost" className="h-11" onClick={onGuest} disabled={sending}>
            {sending && <Loader2 className="animate-spin" />}
            Continuar sin cuenta
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
