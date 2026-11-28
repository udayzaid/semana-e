import { zodResolver } from '@hookform/resolvers/zod'
import { Eye, EyeOff, Loader2, MailCheck, Store, UserRound } from 'lucide-react'
import { useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { Link, Navigate, useLocation } from 'react-router-dom'
import { z } from 'zod'
import { FormField } from '@/components/shared/FormField'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth.store'
import { signUpCustomer } from '../services/auth.service'

const registerSchema = z
  .object({
    customerType: z.enum(['retailer', 'final_consumer']),
    fullName: z.string().trim().min(2, 'Indica tu nombre.').max(120, 'Máximo 120 caracteres.'),
    businessName: z
      .string()
      .trim()
      .max(120, 'Máximo 120 caracteres.')
      .transform((value) => value || null),
    phone: z.string().trim().regex(/^[0-9+() -]{6,20}$/, 'Indica un WhatsApp o teléfono válido.'),
    email: z.string().trim().min(1, 'Indica tu correo.').pipe(z.email('Correo no válido.')),
    password: z
      .string()
      .min(8, 'Mínimo 8 caracteres.')
      .regex(/[A-Za-z]/, 'Incluye al menos una letra.')
      .regex(/\d/, 'Incluye al menos un número.'),
    confirm: z.string(),
  })
  .refine((values) => values.password === values.confirm, { path: ['confirm'], message: 'Las contraseñas no coinciden.' })

type RegisterInput = z.input<typeof registerSchema>
type RegisterValues = z.output<typeof registerSchema>

/** Registro OPCIONAL de clientes (minoristas o consumidores finales) desde el portal. */
export function RegisterPage() {
  const location = useLocation()
  const status = useAuthStore((state) => state.status)
  const [showPassword, setShowPassword] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [pendingEmail, setPendingEmail] = useState<string | null>(null)

  const { register, control, handleSubmit, setValue, formState: { errors, isSubmitting } } = useForm<RegisterInput, unknown, RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { customerType: 'retailer', fullName: '', businessName: '', phone: '', email: '', password: '', confirm: '' },
  })
  const customerType = useWatch({ control, name: 'customerType' })

  // Si la sesión se inicia al registrarse: volver a donde venía (p. ej. el carrito) o a su cuenta.
  const from = (location.state as { from?: string } | null)?.from
  if (status === 'authenticated' && !pendingEmail) return <Navigate to={from && !from.startsWith('/admin') ? from : '/mi-cuenta'} replace />

  const onSubmit = async (values: RegisterValues) => {
    setFormError(null)
    try {
      const { signedIn } = await signUpCustomer(values)
      if (!signedIn) setPendingEmail(values.email)
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'No se pudo crear la cuenta.')
    }
  }

  if (pendingEmail) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <span className="mx-auto grid size-16 place-items-center rounded-full bg-secondary text-brand">
          <MailCheck className="size-8" />
        </span>
        <h1 className="mt-4 font-heading text-2xl font-bold">Revisa tu correo</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Te enviamos un enlace a <strong className="text-foreground">{pendingEmail}</strong> para confirmar tu cuenta. Después podrás iniciar sesión.
        </p>
        <Link to="/login" className={buttonVariants({ className: 'mt-6 h-10 px-5' })}>
          Ir a iniciar sesión
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-10">
      <h1 className="font-heading text-3xl font-bold">Crear cuenta</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Es opcional: también puedes pedir sin cuenta. Con una cuenta tus datos se completan solos y puedes ver tus pedidos y compras.
      </p>

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-6 space-y-4 rounded-2xl border bg-card p-5">
        {formError && (
          <div role="alert" className="rounded-lg border border-destructive/25 bg-destructive/5 px-3 py-2.5 text-sm text-destructive">
            {formError}
          </div>
        )}

        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">Soy</legend>
          <div className="grid grid-cols-2 gap-2">
            {([
              { value: 'retailer', label: 'Comerciante / tienda', icon: Store },
              { value: 'final_consumer', label: 'Consumidor final', icon: UserRound },
            ] as const).map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                type="button"
                onClick={() => setValue('customerType', value)}
                aria-pressed={customerType === value}
                className={cn('flex flex-col items-center gap-1 rounded-xl border p-3 text-sm font-medium transition', customerType === value ? 'border-primary bg-secondary text-primary' : 'hover:bg-muted')}
              >
                <Icon className="size-5" /> {label}
              </button>
            ))}
          </div>
        </fieldset>

        <FormField label="Nombre completo" htmlFor="reg-name" error={errors.fullName?.message}>
          <Input id="reg-name" autoComplete="name" className="h-10" aria-invalid={!!errors.fullName} {...register('fullName')} />
        </FormField>
        {customerType === 'retailer' && (
          <FormField label="Nombre de tu tienda o negocio (opcional)" htmlFor="reg-business" error={errors.businessName?.message}>
            <Input id="reg-business" autoComplete="organization" className="h-10" {...register('businessName')} />
          </FormField>
        )}
        <FormField label="WhatsApp o teléfono" htmlFor="reg-phone" error={errors.phone?.message}>
          <Input id="reg-phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="70012345" className="h-10" aria-invalid={!!errors.phone} {...register('phone')} />
        </FormField>
        <FormField label="Correo electrónico" htmlFor="reg-email" error={errors.email?.message}>
          <Input id="reg-email" type="email" autoComplete="email" className="h-10" aria-invalid={!!errors.email} {...register('email')} />
        </FormField>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Contraseña" htmlFor="reg-password" error={errors.password?.message} hint="Mínimo 8, con letras y números.">
            <div className="relative">
              <Input id="reg-password" type={showPassword ? 'text' : 'password'} autoComplete="new-password" className="h-10 pr-9" aria-invalid={!!errors.password} {...register('password')} />
              <button type="button" onClick={() => setShowPassword((v) => !v)} className="absolute top-1/2 right-2 grid size-7 -translate-y-1/2 place-items-center rounded-md text-muted-foreground hover:bg-muted" aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}>
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </FormField>
          <FormField label="Repite la contraseña" htmlFor="reg-confirm" error={errors.confirm?.message}>
            <Input id="reg-confirm" type={showPassword ? 'text' : 'password'} autoComplete="new-password" className="h-10" aria-invalid={!!errors.confirm} {...register('confirm')} />
          </FormField>
        </div>

        <Button type="submit" size="lg" className="h-11 w-full" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="animate-spin" />}
          Crear mi cuenta
        </Button>
        <p className="text-center text-sm text-muted-foreground">
          ¿Ya tienes cuenta?{' '}
          <Link to="/login" className="font-semibold text-primary hover:underline">
            Inicia sesión
          </Link>
        </p>
      </form>
    </div>
  )
}
