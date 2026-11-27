/** Código de país por defecto (Bolivia). */
const DEFAULT_COUNTRY_CODE = '591'

/**
 * Enlace para abrir un chat de WhatsApp con el número indicado.
 * Acepta formatos como "70012345", "+591 700 12345" o "591-70012345".
 */
export function whatsAppUrl(phone: string | null | undefined, message?: string): string | null {
  if (!phone) return null
  let digits = phone.replace(/\D/g, '')
  if (digits.length < 7) return null
  // Número local de 8 dígitos (celular boliviano): se antepone el código de país.
  if (digits.length === 8) digits = DEFAULT_COUNTRY_CODE + digits
  const text = message ? `?text=${encodeURIComponent(message)}` : ''
  return `https://wa.me/${digits}${text}`
}
