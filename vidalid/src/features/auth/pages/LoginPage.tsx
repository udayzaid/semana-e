import { zodResolver } from '@hookform/resolvers/zod'
import { Eye, EyeOff, Loader2, LockKeyhole, Mail, PackageCheck, ShieldCheck, TrendingUp } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Navigate, useLocation } from 'react-router-dom'
import { BrandLogo } from '@/components/shared/BrandLogo'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuthStore } from '@/stores/auth.store'
import { LeafBackground } from '../components/LeafBackground'
import { NatureBackground } from '../components/NatureBackground'
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
    <div className="flex min-h-screen flex-col bg-background lg:grid lg:grid-cols-[1.1fr_1fr]">
      {/* Panel de marca (pantallas grandes) */}
      <aside className="relative hidden overflow-hidden bg-brand-dark p-12 text-white lg:flex lg:flex-col">
        <NatureBackground screen="large" />
        <LeafBackground />

        {/* Logo protagonista, centrado */}
        <div className="relative flex flex-1 flex-col items-center justify-center text-center">
          <BrandLogo tone="white" className="h-24 drop-shadow-[0_10px_30px_rgba(0,0,0,0.35)] xl:h-32" />
          <p className="mt-4 text-xs font-semibold tracking-[0.45em] text-brand-light">PRODUCTOS NATURALES</p>
          <p className="mt-6 max-w-sm text-base leading-relaxed text-white/80">
            Inventario, ventas y relación con tus comerciantes en un solo panel.
          </p>
        </div>

        <div className="relative">
          <ul className="flex flex-wrap justify-center gap-2">
            {highlights.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs text-white/90 ring-1 ring-white/15 backdrop-blur-sm">
                <Icon className="size-3.5" />
                {text}
              </li>
            ))}
          </ul>
          <p className="mt-6 text-center text-xs text-white/45">© {currentYear} Vidalid · Productos naturales</p>
        </div>
      </aside>

      {/* Banda de marca (celular y tablet) */}
      <header className="relative flex h-48 shrink-0 items-center justify-center overflow-hidden bg-brand-dark lg:hidden">
        <NatureBackground screen="small" />
        <LeafBackground />
        <div className="relative text-center">
          <BrandLogo tone="white" className="h-16 drop-shadow-[0_8px_24px_rgba(0,0,0,0.35)]" />
          <p className="mt-2 text-[10px] font-semibold tracking-[0.4em] text-brand-light">PRODUCTOS NATURALES</p>
        </div>
      </header>

      {/* Formulario */}
      <main className="flex flex-1 items-center justify-center px-4 py-10 sm:px-8">
        <div className="w-full max-w-sm">

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
