import { Hammer } from 'lucide-react'

/** Marcador para los módulos que todavía no están implementados. */
export function ComingSoon({ title }: { title: string }) {
  return (
    <div className="grid min-h-[60vh] place-items-center">
      <div className="max-w-sm text-center">
        <div className="mx-auto grid size-12 place-items-center rounded-xl bg-secondary text-primary">
          <Hammer className="size-5" />
        </div>
        <h1 className="mt-4 font-heading text-xl font-bold">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">Este módulo está en desarrollo y estará disponible pronto.</p>
      </div>
    </div>
  )
}
