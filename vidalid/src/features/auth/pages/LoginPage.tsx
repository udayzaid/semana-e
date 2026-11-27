import { zodResolver } from '@hookform/resolvers/zod'
import { Eye, EyeOff, Leaf, Loader2, LockKeyhole, Mail, PackageCheck, ShieldCheck, TrendingUp } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Navigate, useLocation } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuthStore } from '@/stores/auth.store'
import { loginSchema, type LoginFormValues } from '../schemas/login.schema'
import { signIn } from '../services/auth.service'

const currentYear = new Date().getFullYear()

const highlights = [
  { icon: PackageCheck, text: 'Inventario por lotes y vencimientos' },
  { icon: TrendingUp, text: 'Ventas, clientes y pedidos en un solo lugar' },
  { icon: ShieldCheck, text: 'Acceso seguro por roles' },
]

export function LoginPage() {
  const location = useLocation()
  const status = useAuthStore((state) => state.status)
  const [showPassword, setShowPassword] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  })

  // Con sesión iniciada, volver a la página que se pidió (o al panel).
  if (status === 'authenticated') {
    const from = (location.state as { from?: string } | null)?.from ?? '/admin'
    return <Navigate to={from} replace />
  }

  const onSubmit = async (values: LoginFormValues) => {
    setFormError(null)
    try {
      await signIn(values.email, values.password)
      // La redirección ocurre cuando el store recibe la nueva sesión.
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'No se pudo iniciar sesión.')
    }
  }

  return (
    <div className="grid min-h-screen bg-background lg:grid-cols-[1.05fr_1fr]">
      {/* Panel de marca (solo en pantallas grandes) */}
      <aside className="relative hidden overflow-hidden bg-[#173d2b] p-12 text-white lg:flex lg:flex-col">
        <div className="pointer-events-none absolute -top-24 -right-24 size-80 rounded-full bg-[#2f946b]/25 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-20 size-96 rounded-full bg-[#8cc9a6]/15 blur-3xl" />

        <div className="relative flex items-center gap-3">
          <div className="grid size-11 place-items-center rounded-xl bg-white/10 ring-1 ring-white/15">
            <Leaf className="size-5" />
          </div>
          <div>
            <p className="font-heading text-lg font-extrabold tracking-[0.12em]">VIDALID</p>
            <p className="text-[10px] font-semibold tracking-[0.2em] text-white/60">GESTIÓN INTELIGENTE</p>
          </div>
        </div>

        <div className="relative mt-auto max-w-md">
          <h1 className="font-heading text-4xl leading-tight font-bold tracking-tight">
            Productos naturales, gestión clara.
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-white/70">
            Controla tu inventario, tus ventas y la relación con tus comerciantes desde un solo panel.
          </p>
          <ul className="mt-8 space-y-3">
            {highlights.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-sm text-white/85">
                <span className="grid size-8 place-items-center rounded-lg bg-white/10">
                  <Icon className="size-4" />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative mt-12 text-xs text-white/40">© {currentYear} VIDALID</p>
      </aside>

      {/* Formulario */}
      <main className="flex items-center justify-center px-4 py-10 sm:px-8">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <div className="grid size-10 place-items-center rounded-xl bg-secondary text-primary">
              <Leaf className="size-5" />
            </div>
            <p className="font-heading text-lg font-extrabold tracking-[0.12em] text-secondary-foreground">VIDALID</p>
          </div>

          <h2 className="font-heading text-2xl font-bold tracking-tight">Iniciar sesión</h2>
          <p className="mt-1.5 text-sm text-muted-foreground">Ingresa con tu cuenta para acceder al panel.</p>

          <form className="mt-8 space-y-5" onSubmit={handleSubmit(onSubmit)} noValidate>
            {formError && (
              <div role="alert" className="rounded-lg border border-destructive/25 bg-destructive/5 px-3 py-2.5 text-sm text-destructive">
                {formError}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Correo electrónico</Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="tu-correo@ejemplo.com"
                  className="h-10 bg-card pl-9"
                  aria-invalid={!!errors.email}
                  aria-describedby={errors.email ? 'email-error' : undefined}
                  {...register('email')}
                />
              </div>
              {errors.email && (
                <p id="email-error" className="text-xs text-destructive">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <div className="relative">
                <LockKeyhole className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="h-10 bg-card px-9"
                  aria-invalid={!!errors.password}
                  aria-describedby={errors.password ? 'password-error' : undefined}
                  {...register('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  className="absolute top-1/2 right-2 grid size-7 -translate-y-1/2 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
              {errors.password && (
                <p id="password-error" className="text-xs text-destructive">{errors.password.message}</p>
              )}
            </div>

            <Button type="submit" className="h-10 w-full" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="animate-spin" />}
              {isSubmitting ? 'Ingresando…' : 'Ingresar'}
            </Button>
          </form>

          <p className="mt-8 text-center text-xs text-muted-foreground">
            ¿No tienes cuenta? Solicítala al administrador de VIDALID.
          </p>
        </div>
      </main>
    </div>
  )
}
