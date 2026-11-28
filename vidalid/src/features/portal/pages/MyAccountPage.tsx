import { zodResolver } from '@hookform/resolvers/zod'
import { ClipboardList, Loader2, LogOut, Receipt, Save } from 'lucide-react'
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
import { toUserMessage } from '@/lib/errors'
import { useAuthStore } from '@/stores/auth.store'
import { MyOrdersList, MyPurchasesList } from '../components/AccountLists'
import { useMyCustomer, useUpdateMyProfile } from '../hooks/useAccount'

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
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-heading text-3xl font-bold">{firstName ? `Hola, ${firstName}` : 'Mi cuenta'}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{email}</p>
        </div>
        <div className="flex gap-2">
          <Link to="/" className={buttonVariants({ className: 'h-10' })}>
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
            <div className="mt-3"><MyOrdersList /></div>
          </section>

          {/* Mis compras */}
          <section className="rounded-2xl border bg-card p-5">
            <h2 className="flex items-center gap-2 font-heading text-lg font-bold">
              <Receipt className="size-5 text-brand" /> Mis compras
            </h2>
            <div className="mt-3"><MyPurchasesList /></div>
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
