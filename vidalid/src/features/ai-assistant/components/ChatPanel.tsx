import { Bot, Database, Eraser, Loader2, SendHorizontal, Sparkles, User } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { SimpleMarkdown } from '@/components/shared/SimpleMarkdown'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { askAssistant } from '../services/ai.service'
import { useChatStore } from '../store/chat.store'
import { toolLabels, type AiAgent } from '../types'

interface ChatPanelProps {
  agent: AiAgent
  title: string
  description: string
  suggestions: string[]
  /** page = tarjeta dentro de una página · drawer = ocupa todo el panel lateral */
  variant?: 'page' | 'drawer'
  /** Textos opcionales (la tienda usa un tono para clientes). */
  intro?: string
  pendingText?: string
  placeholder?: string
  maxLength?: number
  /** Mostrar de qué consultas salió la respuesta. */
  showSources?: boolean
}

export function ChatPanel({
  agent,
  title,
  description,
  suggestions,
  variant = 'page',
  intro = 'Respondo con datos reales de VIDALID. Prueba con una de estas preguntas:',
  pendingText = 'Consultando los datos de VIDALID…',
  placeholder = 'Escribe tu pregunta… (Enter para enviar)',
  maxLength = 2000,
  showSources = true,
}: ChatPanelProps) {
  const messages = useChatStore((state) => state.conversations[agent])
  const pending = useChatStore((state) => state.pending[agent])
  const { add, setPending, clear } = useChatStore.getState()
  const [input, setInput] = useState('')
  const endRef = useRef<HTMLDivElement>(null)

  // Mantener visible el último mensaje.
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages.length, pending])

  const send = async (text: string) => {
    const question = text.trim()
    if (!question || pending) return
    setInput('')
    add(agent, { role: 'user', content: question })
    setPending(agent, true)
    try {
      const history = useChatStore.getState().conversations[agent]
      const { reply, tools } = await askAssistant(agent, history)
      add(agent, { role: 'assistant', content: reply, tools })
    } catch (error) {
      add(agent, { role: 'assistant', content: error instanceof Error ? error.message : 'Ocurrió un error.', error: true })
    } finally {
      setPending(agent, false)
    }
  }

  const onSubmit = (event: FormEvent) => {
    event.preventDefault()
    void send(input)
  }

  // Enter envía; Shift+Enter hace un salto de línea.
  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      void send(input)
    }
  }

  return (
    <section
      className={cn(
        'flex flex-col overflow-hidden bg-card',
        variant === 'page' ? 'h-[min(720px,calc(100dvh-13rem))] min-h-[460px] rounded-xl border shadow-xs' : 'h-full min-h-0',
      )}
    >
      <header className="flex items-center justify-between gap-3 border-b px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-[#f0eafd] text-[#6951a1]">
            <Sparkles className="size-4" />
          </span>
          <div className="min-w-0">
            <h2 className="truncate font-heading text-sm font-bold">{title}</h2>
            <p className="truncate text-xs text-muted-foreground">{description}</p>
          </div>
        </div>
        {messages.length > 0 && (
          <Button variant="ghost" size="sm" onClick={() => clear(agent)} disabled={pending}>
            <Eraser /> Nueva conversación
          </Button>
        )}
      </header>

      <div className="flex-1 space-y-4 overflow-y-auto p-4" aria-live="polite">
        {messages.length === 0 && (
          <div className="mx-auto max-w-lg py-6 text-center">
            <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-secondary text-brand">
              <Bot className="size-6" />
            </div>
            <p className="mt-3 font-heading font-semibold">¿En qué te ayudo hoy?</p>
            <p className="mt-1 text-sm text-muted-foreground">{intro}</p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => void send(suggestion)}
                  className="rounded-full border bg-background px-3 py-1.5 text-left text-xs transition hover:border-primary hover:text-primary"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((message) => (
          <div key={message.id} className={cn('flex gap-2.5', message.role === 'user' && 'flex-row-reverse')}>
            <span
              className={cn(
                'grid size-7 shrink-0 place-items-center rounded-full',
                message.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-brand',
              )}
            >
              {message.role === 'user' ? <User className="size-3.5" /> : <Bot className="size-3.5" />}
            </span>
            <div className={cn('max-w-[85%] min-w-0', message.role === 'user' && 'text-right')}>
              <div
                className={cn(
                  'inline-block rounded-2xl px-3.5 py-2 text-left',
                  message.role === 'user'
                    ? 'rounded-tr-sm bg-primary text-primary-foreground'
                    : message.error
                      ? 'rounded-tl-sm border border-destructive/30 bg-destructive/5 text-destructive'
                      : 'rounded-tl-sm bg-muted',
                )}
              >
                {message.role === 'user' ? <p className="text-sm whitespace-pre-wrap">{message.content}</p> : <SimpleMarkdown text={message.content} />}
              </div>
              {showSources && message.tools && message.tools.length > 0 && (
                <p className="mt-1 flex flex-wrap items-center gap-1 text-[11px] text-muted-foreground">
                  <Database className="size-3" /> Datos de: {[...new Set(message.tools)].map((tool) => toolLabels[tool] ?? tool).join(', ')}
                </p>
              )}
            </div>
          </div>
        ))}

        {pending && (
          <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
            <span className="grid size-7 place-items-center rounded-full bg-secondary text-brand">
              <Loader2 className="size-3.5 animate-spin" />
            </span>
            {pendingText}
          </div>
        )}
        <div ref={endRef} />
      </div>

      <form onSubmit={onSubmit} className="flex items-end gap-2 border-t bg-background/60 p-3">
        <Textarea
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={onKeyDown}
          rows={1}
          maxLength={maxLength}
          placeholder={placeholder}
          className="max-h-32 min-h-10 resize-none bg-card"
          aria-label={`Pregunta para ${title}`}
          disabled={pending}
        />
        <Button type="submit" size="icon-lg" disabled={pending || !input.trim()} aria-label="Enviar pregunta">
          {pending ? <Loader2 className="animate-spin" /> : <SendHorizontal />}
        </Button>
      </form>
    </section>
  )
}
