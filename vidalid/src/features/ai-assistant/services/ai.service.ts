import { FunctionsFetchError, FunctionsHttpError, FunctionsRelayError } from '@supabase/supabase-js'
import { supabase } from '@/services/supabase/client'
import type { AiAgent, ChatMessage } from '../types'

const MAX_HISTORY = 12
const CLIENT_TIMEOUT_MS = 75_000

/**
 * Envía la conversación a la Edge Function `vidalid-ai`.
 * La clave de OpenAI está en el servidor: el navegador solo manda el token del usuario.
 */
export async function askAssistant(agent: AiAgent, history: ChatMessage[]): Promise<{ reply: string; tools: string[] }> {
  const messages = history
    .filter((message) => !message.error)
    .slice(-MAX_HISTORY)
    .map((message) => ({ role: message.role, content: message.content }))

  // Límite de espera: si no hay respuesta, se avisa en lugar de quedarse cargando.
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), CLIENT_TIMEOUT_MS)
  let result: Awaited<ReturnType<typeof supabase.functions.invoke<{ reply: string; tools: string[] }>>>
  try {
    result = await supabase.functions.invoke<{ reply: string; tools: string[] }>('vidalid-ai', {
      body: { agent, messages },
      signal: controller.signal,
    })
  } catch {
    throw new Error('VIDALID AI tardó demasiado en responder. Inténtalo de nuevo.')
  } finally {
    clearTimeout(timer)
  }
  const { data, error } = result

  if (controller.signal.aborted) {
    throw new Error('VIDALID AI tardó demasiado en responder. Inténtalo de nuevo.')
  }

  if (error) {
    if (error instanceof FunctionsHttpError) {
      const payload = await (error.context as Response).json().catch(() => null)
      throw new Error(payload?.error ?? 'VIDALID AI no pudo responder. Inténtalo de nuevo.')
    }
    if (error instanceof FunctionsRelayError || error instanceof FunctionsFetchError) {
      throw new Error('No se pudo conectar con VIDALID AI. Verifica que la función esté desplegada y tu conexión.')
    }
    throw new Error('VIDALID AI no pudo responder. Inténtalo de nuevo.')
  }

  return { reply: data?.reply ?? '', tools: data?.tools ?? [] }
}
