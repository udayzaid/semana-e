import { zodResolver } from '@hookform/resolvers/zod'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { ClipboardList, Loader2, LogOut, Receipt, Save, Store, Truck } from 'lucide-react'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { z } from 'zod'
import { FormField } from '@/components/shared/FormField'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { useSignOut } from '@/features/auth/hooks/useSignOut'
import { OrderStatusBadge } from '@/features/orders/components/OrderStatusBadge'
import { toUserMessage } from '@/lib/errors'
import { cn, formatBolivianos } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth.store'
import { useMyCustomer, useMyOrders, useMyPurchases, useUpdateMyProfile } from '../hooks/useAccount'

const profileSchema = z.object({
  name: z.string().trim().min(2, 'Indica tu nombre.').max(120, 'Máximo 120 caracteres.'),
  businessName: z.string().trim().max(120, 'Máximo 120 caracteres.'),
  phone: z
    .string()
    .trim()
    .refine((value) => !value || /^[0-9+() -]{6,20}$/.test(value), 'Teléfono no válido.'),
  address: z.string().trim().max(300, 'Máximo 300 caracteres.'),
})
type ProfileValues = z.infer<typeof profileSchema>

/** Cuenta del cliente: sus datos, sus pedidos (con estado) y sus compras. */
export function MyAccountPage() {
  const email = useAuthStore((state) => state.profile?.email)
  const customer = useMyCustomer()
  const orders = useMyOrders()
  const purchases = useMyPurchases()
  const update = useUpdateMyProfile()
  const { signOut, isSigningOut } = useSignOut('/')

  const { register, handleSubmit, reset, formState: { errors, isDirty } } = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: '', businessName: '', phone: '', address: '' },
  })

  // Cargar la ficha en el formulario cuando llega.
  useEffect(() => {
    if (customer.data) {
      reset({
        name: customer.data.name,
        businessName: customer.data.businessName ?? '',
        phone: customer.data.phone ?? '',
        address: customer.data.address ?? '',
      })
    }
  }, [customer.data, reset])

  const onSubmit = (values: ProfileValues) => {
    update.mutate(
      { name: values.name, businessName: values.businessName || null, phone: values.phone || null, address: values.address || null },
      {
        onSuccess: () => toast.success('Datos actualizados.'),
        onError: (error) => toast.error(toUserMessage(error, 'No se pudieron guardar tus datos.')),
      },
    )
  }

  const firstName = customer.data?.name.split(' ')[0]

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-heading text-3xl font-bold">{firstName ? `Hola, ${firstName}` : 'Mi cuenta'}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{email}</p>
        </div>
        <div className="flex gap-2">
          <Link to="/catalogo" className={buttonVariants({ className: 'h-10' })}>
            Hacer un pedido
          </Link>
          <Button variant="outline" className="h-10" onClick={signOut} disabled={isSigningOut}>
            {isSigningOut ? <Loader2 className="animate-spin" /> : <LogOut />} Salir
          </Button>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          {/* Mis pedidos */}
          <section className="rounded-2xl border bg-card p-5">
            <h2 className="flex items-center gap-2 font-heading text-lg font-bold">
              <ClipboardList className="size-5 text-brand" /> Mis pedidos
            </h2>
            {orders.isLoading ? (
              <Skeleton className="mt-4 h-24 w-full" />
            ) : orders.isError ? (
              <p className="mt-4 text-sm text-destructive">{toUserMessage(orders.error, 'No se pudieron cargar tus pedidos.')}</p>
            ) : orders.data?.length ? (
              <ul className="mt-3 divide-y">
                {orders.data.map((order) => (
                  <li key={order.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                    <div>
                      <p className="font-medium">{order.code}</p>
                      <p className="flex items-center gap-1 text-xs text-muted-foreground">
                        {format(parseISO(order.createdAt), "d 'de' MMM yyyy", { locale: es })} · {order.itemCount} unidades ·{' '}
                        {order.deliveryMode === 'pickup' ? <Store className="size-3" /> : <Truck className="size-3" />}
                        {order.deliveryMode === 'pickup' ? 'Recojo' : 'Envío'}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-semibold tabular-nums">{formatBolivianos(order.subtotal)}</span>
                      <OrderStatusBadge status={order.status} />
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 rounded-xl border border-dashed p-4 text-center text-sm text-muted-foreground">
                Aún no tienes pedidos. <Link to="/catalogo" className="font-semibold text-primary hover:underline">Ver catálogo</Link>
              </p>
            )}
          </section>

          {/* Mis compras */}
          <section className="rounded-2xl border bg-card p-5">
            <h2 className="flex items-center gap-2 font-heading text-lg font-bold">
              <Receipt className="size-5 text-brand" /> Mis compras
            </h2>
            {purchases.isLoading ? (
              <Skeleton className="mt-4 h-24 w-full" />
            ) : purchases.data?.length ? (
              <ul className="mt-3 divide-y">
                {purchases.data.map((sale) => (
                  <li key={sale.id} className={cn('flex items-center justify-between gap-2 py-3', sale.status === 'voided' && 'opacity-60')}>
                    <div>
                      <p className="font-medium">
                        {sale.code}
                        {sale.status === 'voided' && <span className="ml-2 text-xs font-semibold text-destructive">Anulada</span>}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(parseISO(sale.createdAt), "d 'de' MMM yyyy", { locale: es })} · {sale.itemCount} unidades
                      </p>
                    </div>
                    <span className={cn('font-semibold tabular-nums', sale.status === 'voided' && 'line-through')}>{formatBolivianos(sale.total)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 text-sm text-muted-foreground">Tus compras entregadas aparecerán aquí.</p>
            )}
          </section>
        </div>

        {/* Mis datos */}
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="h-fit space-y-4 rounded-2xl border bg-card p-5">
          <h2 className="font-heading text-lg font-bold">Mis datos</h2>
          <p className="-mt-2 text-xs text-muted-foreground">Se usan para completar tus pedidos automáticamente.</p>
          {customer.isLoading ? (
            <Skeleton className="h-56 w-full" />
          ) : (
            <>
              <FormField label="Nombre" htmlFor="me-name" error={errors.name?.message}>
                <Input id="me-name" className="h-10" aria-invalid={!!errors.name} {...register('name')} />
              </FormField>
              <FormField label="Tienda o negocio (opcional)" htmlFor="me-business" error={errors.businessName?.message}>
                <Input id="me-business" className="h-10" {...register('businessName')} />
              </FormField>
              <FormField label="WhatsApp o teléfono" htmlFor="me-phone" error={errors.phone?.message}>
                <Input id="me-phone" type="tel" inputMode="tel" className="h-10" aria-invalid={!!errors.phone} {...register('phone')} />
              </FormField>
              <FormField label="Dirección de entrega (opcional)" htmlFor="me-address" error={errors.address?.message}>
                <Input id="me-address" className="h-10" {...register('address')} />
              </FormField>
              <Button type="submit" className="h-10 w-full" disabled={update.isPending || !isDirty}>
                {update.isPending ? <Loader2 className="animate-spin" /> : <Save />} Guardar cambios
              </Button>
            </>
          )}
        </form>
      </div>
    </div>
  )
}
