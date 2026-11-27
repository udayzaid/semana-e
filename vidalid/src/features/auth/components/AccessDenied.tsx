import { Loader2, LogOut, RefreshCw, ShieldAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useSignOut } from '../hooks/useSignOut'

interface AccessDeniedProps {
  title: string
  message: string
  onRetry?: () => void
}

export function AccessDenied({ title, message, onRetry }: AccessDeniedProps) {
  const { signOut, isSigningOut } = useSignOut()

  return (
    <div className="grid min-h-screen place-items-center bg-background px-4">
      <div className="w-full max-w-md rounded-2xl border bg-card p-8 text-center shadow-sm">
        <div className="mx-auto grid size-12 place-items-center rounded-xl bg-destructive/10 text-destructive">
          <ShieldAlert className="size-6" />
        </div>
        <h1 className="mt-4 font-heading text-xl font-bold">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{message}</p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          {onRetry && (
            <Button variant="outline" onClick={onRetry}>
              <RefreshCw /> Reintentar
            </Button>
          )}
          <Button onClick={signOut} disabled={isSigningOut}>
            {isSigningOut ? <Loader2 className="animate-spin" /> : <LogOut />} Cerrar sesión
          </Button>
        </div>
      </div>
    </div>
  )
}
