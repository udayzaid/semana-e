import { MessageSquareText } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { ChatPanel } from '@/features/ai-assistant/components/ChatPanel'
import { useChatStore } from '@/features/ai-assistant/store/chat.store'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth.store'

const guestSuggestions = ['¿Qué tienen para la próstata?', '¿Cuánto cuesta el colágeno?', '¿Qué jarabes tienen para la tos?', '¿Cómo hago un pedido?']
const customerSuggestions = ['¿Cómo va mi último pedido?', '¿Qué tienen para la próstata?', '¿Cuánto cuesta el colágeno?', '¿Cómo pago mi pedido?']

/**
 * Chat de la tienda: botón flotante que abre el asistente en un panel lateral.
 * Lo pueden usar visitantes y clientes; con sesión también consulta sus pedidos.
 */
export function StoreChatLauncher() {
  const [open, setOpen] = useState(false)
  const pending = useChatStore((state) => state.pending.store)
  const userId = useAuthStore((state) => state.session?.user.id ?? null)
  const isCustomer = useAuthStore((state) => state.status === 'authenticated' && state.profile?.role === 'customer')

  // Al iniciar o cerrar sesión se empieza una conversación nueva (no mezclar datos de cuentas).
  const lastUser = useRef(userId)
  useEffect(() => {
    if (lastUser.current !== userId) {
      lastUser.current = userId
      useChatStore.getState().clear('store')
    }
  }, [userId])

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          'fixed right-4 bottom-4 z-30 flex items-center gap-2 rounded-full bg-primary py-3 pr-4 pl-3.5 text-sm font-semibold text-primary-foreground shadow-lg ring-4 ring-primary/15 transition hover:scale-[1.03] hover:shadow-xl focus-visible:ring-primary/40 focus-visible:outline-none sm:right-6 sm:bottom-6 print:hidden',
          open && 'pointer-events-none opacity-0',
        )}
        aria-label="Abrir el asistente de la tienda"
      >
        <span className="relative grid size-6 place-items-center">
          <MessageSquareText className="size-5" />
          {pending && <span className="absolute -top-0.5 -right-0.5 size-2.5 animate-ping rounded-full bg-brand-light" />}
        </span>
        <span className="hidden sm:inline">¿Te ayudamos?</span>
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
          <SheetTitle className="sr-only">Asistente de la tienda</SheetTitle>
          {/* pr-12: deja espacio al botón de cerrar del panel */}
          <div className="min-h-0 flex-1 [&>section>header]:pr-12">
            <ChatPanel
              agent="store"
              title="Asistente Vidalid"
              description="Productos, precios y pedidos."
              suggestions={isCustomer ? customerSuggestions : guestSuggestions}
              intro="Pregúntame por productos, precios, disponibilidad o cómo hacer tu pedido."
              pendingText="Buscando en la tienda…"
              placeholder="Escribe tu consulta…"
              maxLength={600}
              showSources={false}
              variant="drawer"
            />
          </div>
          <p className="border-t px-4 py-2 text-center text-[11px] text-muted-foreground">
            Asistente automático: la información no reemplaza la consulta con un profesional de salud.
          </p>
        </SheetContent>
      </Sheet>
    </>
  )
}
