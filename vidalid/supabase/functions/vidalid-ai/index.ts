// =====================================================================
// VIDALID AI · Supabase Edge Function (Deno)
//
// React → esta función → proveedor de IA → funciones autorizadas → PostgreSQL → respuesta.
//
// Proveedor de IA: cualquiera compatible con la API de OpenAI (Chat Completions + tools).
// Por defecto Google Gemini (tiene nivel GRATUITO). Configuración con secretos de Supabase:
//   AI_API_KEY   clave del proveedor (obligatoria)
//   AI_BASE_URL  por defecto https://generativelanguage.googleapis.com/v1beta/openai   (Gemini)
//                Groq (gratis):  https://api.groq.com/openai/v1
//                OpenAI (pago):  https://api.openai.com/v1
//   AI_MODEL     por defecto gemini-flash-latest  ·  Groq: llama-3.3-70b-versatile  ·  OpenAI: gpt-4o-mini
//
// Seguridad:
// - La clave del proveedor vive solo aquí (secreto), nunca en el frontend.
// - Se consulta la base de datos CON EL TOKEN DEL USUARIO: aplican RLS y los
//   permisos de cada función (todas exigen rol admin).
// - La IA no escribe SQL: solo puede pedir las herramientas de la lista de abajo,
//   todas de SOLO LECTURA. No puede modificar inventario, precios ni ventas.
// =====================================================================

import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2.49.4'

// OPENAI_API_KEY / OPENAI_MODEL se aceptan por compatibilidad con la configuración anterior.
const AI_API_KEY = Deno.env.get('AI_API_KEY') ?? Deno.env.get('OPENAI_API_KEY') ?? ''
const AI_BASE_URL = (Deno.env.get('AI_BASE_URL') ?? 'https://generativelanguage.googleapis.com/v1beta/openai').replace(/\/+$/, '')
const AI_MODEL = Deno.env.get('AI_MODEL') ?? Deno.env.get('OPENAI_MODEL') ?? 'gemini-flash-latest'
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? ''

const TIMEZONE = 'America/La_Paz' // Bolivia: UTC-4 todo el año (sin horario de verano)
const TZ_OFFSET = '-04:00'
const MAX_MESSAGES = 20
const MAX_MESSAGE_LENGTH = 2000
const MAX_TOOL_ROUNDS = 4

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

type Agent = 'admin' | 'products'
type ChatMessage = { role: 'user' | 'assistant'; content: string }

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
}

// ---------------------------------------------------------------------
// Fechas (en hora de Bolivia)
// ---------------------------------------------------------------------

/** Fecha local de Bolivia en formato yyyy-MM-dd. */
function localDate(offsetDays = 0): string {
  const now = new Date(Date.now() - 4 * 60 * 60 * 1000 + offsetDays * 86_400_000)
  return now.toISOString().slice(0, 10)
}

function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

const PERIODS = ['today', 'yesterday', 'this_week', 'last_week', 'this_month', 'last_month', 'last_7_days', 'last_30_days', 'this_year', 'custom'] as const
type Period = (typeof PERIODS)[number]

/** Devuelve el rango [desde, hasta] en fechas locales (ambas incluidas). */
function resolvePeriod(period: Period = 'this_month', from?: string, to?: string): { from: string; to: string; label: string } {
  const today = localDate()
  const weekday = (new Date(`${today}T00:00:00Z`).getUTCDay() + 6) % 7 // lunes = 0
  const [y, m] = today.split('-').map(Number)
  const monthStart = `${y}-${String(m).padStart(2, '0')}-01`
  const isDate = (v?: string) => !!v && /^\d{4}-\d{2}-\d{2}$/.test(v)

  switch (period) {
    case 'today':
      return { from: today, to: today, label: 'hoy' }
    case 'yesterday':
      return { from: addDays(today, -1), to: addDays(today, -1), label: 'ayer' }
    case 'this_week':
      return { from: addDays(today, -weekday), to: today, label: 'esta semana' }
    case 'last_week':
      return { from: addDays(today, -weekday - 7), to: addDays(today, -weekday - 1), label: 'la semana pasada' }
    case 'last_month': {
      const prevStart = new Date(Date.UTC(y, m - 2, 1)).toISOString().slice(0, 10)
      return { from: prevStart, to: addDays(monthStart, -1), label: 'el mes pasado' }
    }
    case 'last_7_days':
      return { from: addDays(today, -6), to: today, label: 'los últimos 7 días' }
    case 'last_30_days':
      return { from: addDays(today, -29), to: today, label: 'los últimos 30 días' }
    case 'this_year':
      return { from: `${y}-01-01`, to: today, label: 'este año' }
    case 'custom':
      if (isDate(from) && isDate(to) && from! <= to!) return { from: from!, to: to!, label: `del ${from} al ${to}` }
      return { from: monthStart, to: today, label: 'este mes' }
    default:
      return { from: monthStart, to: today, label: 'este mes' }
  }
}

/** Convierte un rango local a timestamps [inicio, fin) para las funciones SQL. */
const toTimestamps = (range: { from: string; to: string }) => ({
  p_from: `${range.from}T00:00:00${TZ_OFFSET}`,
  p_to: `${addDays(range.to, 1)}T00:00:00${TZ_OFFSET}`,
})

// ---------------------------------------------------------------------
// Herramientas (solo lectura). Cada una llama a una función SQL autorizada.
// ---------------------------------------------------------------------

const periodParam = {
  period: { type: 'string', enum: PERIODS, description: 'Periodo. Usa "custom" con from/to para fechas exactas.' },
  from: { type: 'string', description: 'Fecha inicial yyyy-MM-dd (solo con period=custom).' },
  to: { type: 'string', description: 'Fecha final yyyy-MM-dd incluida (solo con period=custom).' },
}

const toolDefinitions: Record<string, { description: string; parameters: Record<string, unknown>; agents: Agent[] }> = {
  sales_summary: {
    description: 'Totales de ventas completadas en un periodo: cantidad de ventas, monto total, ticket promedio, descuentos, efectivo, QR, unidades vendidas y ventas anuladas.',
    parameters: { type: 'object', properties: periodParam, required: ['period'] },
    agents: ['admin'],
  },
  sales_by_day: {
    description: 'Ventas por día (monto y cantidad) en un periodo de hasta un año. Útil para tendencias y comparar días.',
    parameters: { type: 'object', properties: periodParam, required: ['period'] },
    agents: ['admin'],
  },
  top_products: {
    description: 'Productos más vendidos (unidades e ingresos) en un periodo.',
    parameters: { type: 'object', properties: { ...periodParam, limit: { type: 'integer', minimum: 1, maximum: 20 } }, required: ['period'] },
    agents: ['admin'],
  },
  slow_moving_products: {
    description: 'Productos activos con stock que se vendieron poco o nada en los últimos N días (baja rotación).',
    parameters: { type: 'object', properties: { days: { type: 'integer', minimum: 7, maximum: 365 }, limit: { type: 'integer', minimum: 1, maximum: 20 } } },
    agents: ['admin'],
  },
  top_customers: {
    description: 'Clientes que más compran en un periodo (cantidad de compras, total, última compra).',
    parameters: { type: 'object', properties: { ...periodParam, limit: { type: 'integer', minimum: 1, maximum: 20 } }, required: ['period'] },
    agents: ['admin'],
  },
  inventory_summary: {
    description: 'Resumen del inventario: productos activos, unidades, valor al costo, productos con stock bajo y agotados, lotes por vencer (30 días) y vencidos.',
    parameters: { type: 'object', properties: {} },
    agents: ['admin'],
  },
  stock_alerts: {
    description: 'Lista de productos activos agotados o con stock bajo (disponible <= stock mínimo).',
    parameters: { type: 'object', properties: { limit: { type: 'integer', minimum: 1, maximum: 30 } } },
    agents: ['admin', 'products'],
  },
  expiring_batches: {
    description: 'Lotes con stock que vencen en los próximos N días o que ya vencieron.',
    parameters: { type: 'object', properties: { days: { type: 'integer', minimum: 1, maximum: 365 }, include_expired: { type: 'boolean' } } },
    agents: ['admin'],
  },
  restock_suggestions: {
    description: 'Recomendaciones de reabastecimiento: productos a reponer con ritmo de venta diario, días de cobertura y cantidad sugerida.',
    parameters: { type: 'object', properties: { days: { type: 'integer', minimum: 7, maximum: 365, description: 'Días de historial para medir el ritmo de venta.' }, target_days: { type: 'integer', minimum: 7, maximum: 180, description: 'Días que debe cubrir el stock.' } } },
    agents: ['admin'],
  },
  search_products: {
    description: 'Busca productos por nombre o código SKU: precio, stock disponible, unidad/presentación, categoría y estado.',
    parameters: { type: 'object', properties: { query: { type: 'string', description: 'Texto a buscar, ej. "omega" o "VID-001".' } }, required: ['query'] },
    agents: ['admin', 'products'],
  },
  products_by_category: {
    description: 'Lista los productos activos de una categoría (por nombre de categoría) o, sin categoría, las categorías disponibles con su cantidad de productos.',
    parameters: { type: 'object', properties: { category: { type: 'string' } } },
    agents: ['admin', 'products'],
  },
}

type ToolArgs = Record<string, unknown>

const int = (value: unknown, fallback: number, min: number, max: number) => {
  const n = Number(value)
  return Number.isFinite(n) ? Math.min(Math.max(Math.round(n), min), max) : fallback
}
const sanitize = (value: unknown) => String(value ?? '').replace(/[%,()*\\]/g, ' ').trim().slice(0, 60)

async function runTool(db: SupabaseClient, name: string, args: ToolArgs): Promise<unknown> {
  const range = resolvePeriod(args.period as Period, args.from as string | undefined, args.to as string | undefined)

  const rpc = async (fn: string, params: Record<string, unknown>) => {
    const { data, error } = await db.rpc(fn, params)
    if (error) throw new Error(error.message)
    return data
  }

  switch (name) {
    case 'sales_summary': {
      const data = await rpc('get_sales_summary', toTimestamps(range))
      return { periodo: range, resumen: Array.isArray(data) ? data[0] : data }
    }
    case 'sales_by_day':
      return { periodo: range, dias: await rpc('get_sales_by_day', { p_from: range.from, p_to: range.to, p_timezone: TIMEZONE }) }
    case 'top_products':
      return { periodo: range, productos: await rpc('get_top_products', { ...toTimestamps(range), p_limit: int(args.limit, 5, 1, 20) }) }
    case 'slow_moving_products':
      return { dias: int(args.days, 30, 7, 365), productos: await rpc('get_slow_moving_products', { p_days: int(args.days, 30, 7, 365), p_limit: int(args.limit, 10, 1, 20) }) }
    case 'top_customers':
      return { periodo: range, clientes: await rpc('get_top_customers', { ...toTimestamps(range), p_limit: int(args.limit, 5, 1, 20) }) }
    case 'inventory_summary': {
      const data = await rpc('get_inventory_summary', { p_expiring_days: 30 })
      return Array.isArray(data) ? data[0] : data
    }
    case 'restock_suggestions':
      return await rpc('get_restock_suggestions', { p_days: int(args.days, 30, 7, 365), p_target_days: int(args.target_days, 30, 7, 180), p_limit: 15 })
    case 'stock_alerts': {
      const { data, error } = await db
        .from('products')
        .select('name, sku, unit, sale_price, available_stock, min_stock, stock_status')
        .eq('is_active', true)
        .in('stock_status', ['low', 'out'])
        .order('available_stock')
        .limit(int(args.limit, 15, 1, 30))
      if (error) throw new Error(error.message)
      return data
    }
    case 'expiring_batches': {
      const days = int(args.days, 30, 1, 365)
      let query = db
        .from('batches')
        .select('lot_code, expires_at, quantity, product:products(name, sku, unit)')
        .gt('quantity', 0)
        .not('expires_at', 'is', null)
        .lte('expires_at', addDays(localDate(), days))
        .order('expires_at')
        .limit(30)
      if (!args.include_expired) query = query.gte('expires_at', localDate())
      const { data, error } = await query
      if (error) throw new Error(error.message)
      return { hoy: localDate(), dias: days, lotes: data }
    }
    case 'search_products': {
      const q = sanitize(args.query)
      if (!q) return []
      const { data, error } = await db
        .from('products')
        .select('name, sku, unit, sale_price, available_stock, stock_status, is_active, description, category:categories(name)')
        .or(`name.ilike.%${q}%,sku.ilike.%${q}%`)
        .order('is_active', { ascending: false })
        .order('name')
        .limit(10)
      if (error) throw new Error(error.message)
      return data?.map((p) => ({ ...p, description: p.description ? String(p.description).slice(0, 160) : null }))
    }
    case 'products_by_category': {
      const category = sanitize(args.category)
      if (!category) {
        const { data, error } = await db.from('categories').select('name, products(count)').eq('is_active', true).order('name')
        if (error) throw new Error(error.message)
        return { categorias: data }
      }
      const { data, error } = await db
        .from('products')
        .select('name, sku, unit, sale_price, available_stock, stock_status, category:categories!inner(name)')
        .eq('is_active', true)
        .ilike('category.name', `%${category}%`)
        .order('name')
        .limit(40)
      if (error) throw new Error(error.message)
      return { categoria: category, productos: data }
    }
    default:
      throw new Error(`Herramienta no permitida: ${name}`)
  }
}

// ---------------------------------------------------------------------
// Instrucciones del asistente
// ---------------------------------------------------------------------

function systemPrompt(agent: Agent): string {
  const common = `Hoy es ${localDate()} (hora de Bolivia, ${TIMEZONE}). Moneda: bolivianos (Bs), formato "Bs 1.234,50".
VIDALID comercializa y distribuye productos naturales medicinales y suplementos (tinturas, polvos, cápsulas, jarabes). La mayoría de sus clientes son comerciantes minoristas que revenden; los pagos son en efectivo o QR.

Reglas obligatorias:
- Responde SIEMPRE en español, breve y claro. Usa listas cortas cuando ayuden.
- Usa ÚNICAMENTE datos obtenidos con las herramientas. Nunca inventes cifras, productos ni clientes. Si una herramienta devuelve vacío, dilo.
- No puedes modificar nada (inventario, precios, ventas). Si te lo piden, explica que debe hacerse en el módulo correspondiente del sistema.
- Indica el periodo que usaste ("esta semana", "del 1 al 27 de noviembre").
- No muestres identificadores internos (UUID). Puedes mostrar códigos SKU y de venta.
- Si la pregunta no tiene relación con VIDALID o sus datos, indícalo amablemente.`

  if (agent === 'products') {
    return `Eres el asistente de consultas de productos de VIDALID.
Respondes sobre existencia, disponibilidad, precios, presentaciones y categorías de productos.
Ejemplo de respuesta: "Sí, tenemos 25 unidades de Omega 3 disponibles. Su precio actual es Bs 85,00."
No compartas costos, márgenes ni datos de ventas o clientes.
${common}`
  }

  return `Eres VIDALID AI, el asistente administrativo de VIDALID para el administrador.
Analizas ventas, productos, clientes e inventario, y das recomendaciones prácticas (por ejemplo, qué reponer o qué productos impulsar).
Cuando des recomendaciones, explica brevemente el porqué con los datos. Para comparar periodos, consulta cada periodo por separado.
${common}`
}

// ---------------------------------------------------------------------
// Proveedor de IA (API compatible con OpenAI: Chat Completions con herramientas)
// ---------------------------------------------------------------------

type OpenAIMessage =
  | { role: 'system' | 'user' | 'assistant'; content: string | null; tool_calls?: OpenAIToolCall[] }
  | { role: 'tool'; tool_call_id: string; content: string }
type OpenAIToolCall = { id: string; type: 'function'; function: { name: string; arguments: string } }

// Modelo en uso. Si el configurado ya no existe (los proveedores retiran modelos),
// se detecta automáticamente uno disponible y se recuerda mientras la función siga activa.
let activeModel = AI_MODEL
const modelWasConfigured = !!(Deno.env.get('AI_MODEL') ?? Deno.env.get('OPENAI_MODEL'))

/** Pide al proveedor la lista de modelos que la clave puede usar. */
async function listProviderModels(): Promise<string[]> {
  const response = await fetch(`${AI_BASE_URL}/models`, { headers: { Authorization: `Bearer ${AI_API_KEY}` } })
  if (!response.ok) {
    console.error('AI models list error', response.status, await response.text())
    return []
  }
  const data = await response.json()
  // Gemini devuelve ids como "models/gemini-x-flash"; OpenAI y Groq, "gpt-4o-mini".
  return ((data?.data ?? []) as { id?: string }[]).map((model) => String(model.id ?? '').replace(/^models\//, '')).filter(Boolean)
}

/**
 * Elige el mejor modelo de chat disponible: preferimos los "flash" de Gemini
 * (rápidos y con nivel gratuito), estables antes que preview, y la versión más nueva.
 */
export function pickChatModel(ids: string[]): string | null {
  const excluded = /(embedding|image|imagen|tts|audio|live|vision|veo|aqa|learnlm|gemma|lite)/i
  const score = (id: string) => {
    const version = Number(id.match(/(\d+(?:\.\d+)?)/)?.[1] ?? 0)
    return (/flash/i.test(id) ? 1000 : 0) + (/latest/i.test(id) ? 50 : 0) + (/(preview|exp)/i.test(id) ? -100 : 0) + version
  }
  const candidates = ids.filter((id) => /gemini|gpt|llama|mixtral|qwen/i.test(id) && !excluded.test(id))
  return candidates.sort((a, b) => score(b) - score(a))[0] ?? null
}

const IS_GEMINI = AI_BASE_URL.includes('generativelanguage.googleapis.com')
const PROVIDER_TIMEOUT_MS = 30_000
// Se desactiva si el modelo no admite el parámetro reasoning_effort.
let useReasoningEffort = IS_GEMINI

async function requestCompletion(model: string, messages: OpenAIMessage[], tools: unknown[]) {
  const payload: Record<string, unknown> = {
    model,
    messages,
    tools,
    tool_choice: 'auto',
    temperature: 0.2,
    // Los modelos que "piensan" cuentan ese razonamiento dentro del límite: se deja margen.
    max_tokens: 4096,
  }
  // Gemini: razonamiento ligero = respuestas mucho más rápidas para consultas de datos.
  if (useReasoningEffort) payload.reasoning_effort = 'low'

  try {
    return await fetch(`${AI_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${AI_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS),
    })
  } catch (error) {
    if (error instanceof DOMException && (error.name === 'TimeoutError' || error.name === 'AbortError')) {
      throw new Error('El servicio de IA tardó demasiado en responder. Inténtalo de nuevo con una pregunta más corta.')
    }
    throw new Error('No se pudo conectar con el servicio de IA. Inténtalo de nuevo.')
  }
}

/** Extrae el mensaje de error del proveedor (Gemini lo envuelve en una lista; OpenAI no). */
export function providerErrorMessage(body: string): string {
  try {
    const parsed = JSON.parse(body)
    const error = Array.isArray(parsed) ? parsed[0]?.error : parsed?.error
    const message = typeof error === 'string' ? error : error?.message
    if (message) return String(message).slice(0, 220)
  } catch {
    // no es JSON
  }
  return body.slice(0, 220)
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * Quita del esquema JSON las palabras que no todos los proveedores aceptan
 * (minimum/maximum). Los límites se siguen aplicando en el servidor con int().
 */
export function cleanSchema(schema: unknown): unknown {
  if (Array.isArray(schema)) return schema.map(cleanSchema)
  if (schema && typeof schema === 'object') {
    return Object.fromEntries(
      Object.entries(schema as Record<string, unknown>)
        .filter(([key]) => key !== 'minimum' && key !== 'maximum')
        .map(([key, value]) => [key, cleanSchema(value)]),
    )
  }
  return schema
}

async function callOpenAI(messages: OpenAIMessage[], agent: Agent) {
  const tools = Object.entries(toolDefinitions)
    .filter(([, def]) => def.agents.includes(agent))
    .map(([name, def]) => {
      // Sin parámetros: se omite "parameters" (Gemini rechaza objetos con "properties" vacío).
      const hasParams = Object.keys((def.parameters as { properties?: object }).properties ?? {}).length > 0
      return { type: 'function', function: { name, description: def.description, ...(hasParams ? { parameters: cleanSchema(def.parameters) } : {}) } }
    })

  let response = await requestCompletion(activeModel, messages, tools)

  // Modelo sin soporte de reasoning_effort: reintentar sin ese parámetro.
  if (response.status === 400 && useReasoningEffort) {
    const detail = await response.clone().text()
    if (/reasoning|thinking/i.test(detail)) {
      console.warn('El modelo no admite reasoning_effort; se reintenta sin él.', activeModel)
      useReasoningEffort = false
      response = await requestCompletion(activeModel, messages, tools)
    }
  }

  // Servicio saturado o error temporal (frecuente en el nivel gratuito): reintentar una vez.
  if (response.status >= 500 || response.status === 503) {
    console.warn('AI provider temporary error', response.status, activeModel, providerErrorMessage(await response.clone().text()))
    await sleep(1200)
    response = await requestCompletion(activeModel, messages, tools)
  }

  // Modelo inexistente: detectar uno disponible y reintentar una vez.
  if (response.status === 404 || response.status === 400) {
    const detail = await response.clone().text()
    const modelProblem = response.status === 404 || /model/i.test(detail)
    if (modelProblem) {
      const available = await listProviderModels()
      const fallback = pickChatModel(available.filter((id) => id !== activeModel))
      console.warn(`Modelo "${activeModel}" no disponible. Modelos: ${available.join(', ')}. Se usará: ${fallback}`)
      if (fallback) {
        activeModel = fallback
        response = await requestCompletion(activeModel, messages, tools)
      } else {
        throw new Error(
          modelWasConfigured
            ? `El modelo "${activeModel}" no está disponible y no se encontró otro. Revisa el secreto AI_MODEL.`
            : 'No se encontró ningún modelo de chat disponible para tu clave. Revisa AI_API_KEY y AI_BASE_URL.',
        )
      }
    }
  }

  if (!response.ok) {
    const status = response.status
    const body = await response.text()
    const detail = providerErrorMessage(body)
    console.error('AI provider error', status, activeModel, body)
    // El detalle del proveedor se muestra para poder diagnosticar (solo lo ve el administrador).
    if (status === 401 || status === 403) throw new Error(`La clave de IA no es válida o no tiene permiso. Revisa el secreto AI_API_KEY. (${detail})`)
    if (status === 404) throw new Error(`No se encontró el modelo "${activeModel}". Revisa AI_MODEL y AI_BASE_URL. (${detail})`)
    if (status === 429) throw new Error('Se alcanzó el límite gratuito del proveedor de IA. Espera un minuto e inténtalo de nuevo.')
    if (status >= 500) throw new Error(`El servicio de IA está saturado o falló temporalmente (código ${status}, modelo ${activeModel}). Inténtalo de nuevo en unos segundos.`)
    throw new Error(`El proveedor de IA rechazó la solicitud (código ${status}, modelo ${activeModel}): ${detail}`)
  }

  const data = await response.json()
  return data.choices?.[0]?.message as { content: string | null; tool_calls?: OpenAIToolCall[] }
}

// ---------------------------------------------------------------------
// Servidor
// ---------------------------------------------------------------------

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Método no permitido.' }, 405)

  if (!AI_API_KEY) return json({ error: 'VIDALID AI no está configurado: falta el secreto AI_API_KEY en Supabase (puedes usar una clave gratuita de Google Gemini).' }, 500)

  // Cliente con el token del usuario: la base de datos aplica sus permisos.
  const authorization = req.headers.get('Authorization') ?? ''
  if (!authorization.startsWith('Bearer ')) return json({ error: 'Debes iniciar sesión.' }, 401)
  const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data: userData, error: userError } = await db.auth.getUser(authorization.slice(7))
  if (userError || !userData.user) return json({ error: 'Sesión no válida. Vuelve a iniciar sesión.' }, 401)

  const { data: isAdmin, error: roleError } = await db.rpc('is_admin')
  if (roleError || isAdmin !== true) return json({ error: 'Solo el administrador puede usar VIDALID AI.' }, 403)

  // Validación de la solicitud
  let body: { agent?: unknown; messages?: unknown }
  try {
    body = await req.json()
  } catch {
    return json({ error: 'Solicitud no válida.' }, 400)
  }
  const agent: Agent = body.agent === 'products' ? 'products' : 'admin'
  const history = Array.isArray(body.messages) ? body.messages : []
  const messages: ChatMessage[] = history
    .filter((m): m is ChatMessage => !!m && (m as ChatMessage).role !== undefined && ['user', 'assistant'].includes((m as ChatMessage).role) && typeof (m as ChatMessage).content === 'string')
    .slice(-MAX_MESSAGES)
    .map((m) => ({ role: m.role, content: m.content.slice(0, MAX_MESSAGE_LENGTH) }))

  if (messages.length === 0 || messages[messages.length - 1].role !== 'user') {
    return json({ error: 'Escribe una pregunta.' }, 400)
  }

  const conversation: OpenAIMessage[] = [{ role: 'system', content: systemPrompt(agent) }, ...messages]
  const toolsUsed: string[] = []
  // Presupuesto total de tiempo: responder siempre antes del límite de Supabase.
  const deadline = Date.now() + 100_000

  try {
    for (let round = 0; round <= MAX_TOOL_ROUNDS; round++) {
      if (Date.now() > deadline) {
        return json({ reply: 'La consulta tardó demasiado. Intenta una pregunta más específica.', tools: toolsUsed })
      }
      const message = await callOpenAI(conversation, agent)
      if (!message) throw new Error('El servicio de IA no devolvió respuesta.')

      if (!message.tool_calls?.length) {
        return json({ reply: message.content?.trim() || 'No tengo una respuesta para eso.', tools: toolsUsed })
      }

      // Algunos proveedores (Gemini) prefieren texto vacío en lugar de null.
      conversation.push({ role: 'assistant', content: message.content ?? '', tool_calls: message.tool_calls })

      for (const call of message.tool_calls) {
        const name = call.function.name
        let result: unknown
        if (!toolDefinitions[name]?.agents.includes(agent)) {
          result = { error: 'Herramienta no disponible para este asistente.' }
        } else {
          try {
            const args = JSON.parse(call.function.arguments || '{}') as ToolArgs
            result = await runTool(db, name, args)
            toolsUsed.push(name)
          } catch (error) {
            result = { error: error instanceof Error ? error.message : 'Error al consultar los datos.' }
          }
        }
        // Se limita el tamaño para controlar el costo de tokens.
        conversation.push({ role: 'tool', tool_call_id: call.id, content: JSON.stringify(result).slice(0, 12_000) })
      }
    }
    return json({ reply: 'La consulta requirió demasiados pasos. Intenta una pregunta más específica.', tools: toolsUsed })
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Error inesperado en VIDALID AI.' }, 502)
  }
})
