import { FunctionsFetchError, FunctionsHttpError, FunctionsRelayError } from '@supabase/supabase-js'
import { supabase } from '@/services/supabase/client'
import type { AiAgent, ChatMessage } from '../types'

const MAX_HISTORY = 12
const STORE_HISTORY = 8
const CLIENT_TIMEOUT_MS = 75_000

/**
 * Envía la conversación a la Edge Function del asistente.
 * - Panel (admin / products): `vidalid-ai`, solo administradores.
 * - Tienda (store): `vidalid-store-ai`, pública y con límite de uso.
 * La clave del proveedor de IA está en el servidor: el navegador solo manda su sesión (si la hay).
 */
export async function askAssistant(agent: AiAgent, history: ChatMessage[]): Promise<{ reply: string; tools: string[] }> {
  const messages = history
    .filter((message) => !message.error)
    .slice(agent === 'store' ? -STORE_HISTORY : -MAX_HISTORY)
    .map((message) => ({ role: message.role, content: message.content }))
  const fn = agent === 'store' ? 'vidalid-store-ai' : 'vidalid-ai'
  const name = agent === 'store' ? 'El asistente' : 'VIDALID AI'
  const slow = `${name} tardó demasiado en responder. Inténtalo de nuevo.`

  // Límite de espera: si no hay respuesta, se avisa en lugar de quedarse cargando.
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), CLIENT_TIMEOUT_MS)
  let result: Awaited<ReturnType<typeof supabase.functions.invoke<{ reply: string; tools: string[] }>>>
  try {
    result = await supabase.functions.invoke<{ reply: string; tools: string[] }>(fn, {
      body: agent === 'store' ? { messages } : { agent, messages },
      signal: controller.signal,
    })
  } catch {
    throw new Error(slow)
  } finally {
    clearTimeout(timer)
  }
  const { data, error } = result

  if (controller.signal.aborted) throw new Error(slow)

  if (error) {
    if (error instanceof FunctionsHttpError) {
      const payload = await (error.context as Response).json().catch(() => null)
      throw new Error(payload?.error ?? `${name} no pudo responder. Inténtalo de nuevo.`)
    }
    if (error instanceof FunctionsRelayError || error instanceof FunctionsFetchError) {
      throw new Error(
        agent === 'store'
          ? 'El asistente no está disponible en este momento. Puedes seguir comprando en la tienda con normalidad.'
          : 'No se pudo conectar con VIDALID AI. Verifica que la función esté desplegada y tu conexión.',
      )
    }
    throw new Error(`${name} no pudo responder. Inténtalo de nuevo.`)
  }

  return { reply: data?.reply ?? '', tools: data?.tools ?? [] }
}
