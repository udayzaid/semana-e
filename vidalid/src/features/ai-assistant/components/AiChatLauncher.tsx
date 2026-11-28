import { Maximize2, Sparkles } from 'lucide-react'
import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { buttonVariants } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { cn } from '@/lib/utils'
import { useChatStore } from '../store/chat.store'
import type { AiAgent } from '../types'

/** Asistentes del panel administrativo (el de la tienda vive en el portal). */
type AdminAgent = Exclude<AiAgent, 'store'>
import { ChatPanel } from './ChatPanel'

const agents: Record<AdminAgent, { label: string; title: string; description: string; suggestions: string[] }> = {
  admin: {
    label: 'Administrativo',
    title: 'VIDALID AI',
    description: 'Ventas, productos, clientes e inventario.',
    suggestions: ['¿Cuánto vendimos hoy?', '¿Qué productos necesitamos reponer?', '¿Qué clientes compran con mayor frecuencia?', 'Resume las ventas de este mes.'],
  },
  products: {
    label: 'Productos',
    title: 'Asistente de productos',
    description: 'Existencia, precios y categorías.',
    suggestions: ['¿Tenemos Omega 3 disponible?', '¿Qué productos están agotados?', '¿Qué categorías tenemos?'],
  },
}

/**
 * Botón flotante de VIDALID AI: abre el chat en un panel lateral desde cualquier
 * pantalla del panel administrativo. Comparte la conversación con la página completa.
 */
export function AiChatLauncher() {
  const { pathname } = useLocation()
  const [open, setOpen] = useState(false)
  const [agent, setAgent] = useState<AdminAgent>('admin')
  const pending = useChatStore((state) => state.pending.admin || state.pending.products)

  // En la página completa del asistente el botón sobra.
  if (pathname.startsWith('/admin/asistente')) return null

  const current = agents[agent]

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          'fixed right-4 bottom-4 z-40 flex items-center gap-2 rounded-full bg-primary py-3 pr-4 pl-3.5 text-sm font-semibold text-primary-foreground shadow-lg ring-4 ring-primary/15 transition hover:scale-[1.03] hover:shadow-xl focus-visible:ring-primary/40 focus-visible:outline-none sm:right-6 sm:bottom-6 print:hidden',
          open && 'pointer-events-none opacity-0',
        )}
        aria-label="Abrir VIDALID AI"
      >
        <span className="relative grid size-6 place-items-center">
          <Sparkles className="size-5" />
          {pending && <span className="absolute -top-0.5 -right-0.5 size-2.5 animate-ping rounded-full bg-brand-light" />}
        </span>
        <span className="hidden sm:inline">VIDALID AI</span>
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
          <SheetTitle className="sr-only">VIDALID AI</SheetTitle>
          <div className="flex items-center gap-2 border-b px-3 py-2 pr-12">
            <div className="flex flex-1 gap-1 rounded-lg bg-muted p-1" role="tablist" aria-label="Asistente">
              {(Object.keys(agents) as AdminAgent[]).map((key) => (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  aria-selected={agent === key}
                  onClick={() => setAgent(key)}
                  className={cn(
                    'flex-1 rounded-md px-2 py-1 text-xs font-medium transition',
                    agent === key ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {agents[key].label}
                </button>
              ))}
            </div>
            <Link
              to="/admin/asistente"
              onClick={() => setOpen(false)}
              className={buttonVariants({ variant: 'ghost', size: 'icon-sm' })}
              title="Abrir en pantalla completa"
              aria-label="Abrir en pantalla completa"
            >
              <Maximize2 />
            </Link>
          </div>
          <div className="min-h-0 flex-1">
            <ChatPanel key={agent} agent={agent} title={current.title} description={current.description} suggestions={current.suggestions} variant="drawer" />
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
