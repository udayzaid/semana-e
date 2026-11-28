/**
 * Datos de contacto públicos del portal (no son secretos).
 * Se configuran en .env:
 *   VITE_WHATSAPP_NUMBER=59170000000   (con código de país, solo números)
 *   VITE_FACEBOOK_URL / VITE_INSTAGRAM_URL / VITE_TIKTOK_URL (opcionales)
 */
export const portalConfig = {
  whatsappNumber: (import.meta.env.VITE_WHATSAPP_NUMBER as string | undefined)?.replace(/\D/g, '') || null,
  facebookUrl: (import.meta.env.VITE_FACEBOOK_URL as string | undefined) || null,
  instagramUrl: (import.meta.env.VITE_INSTAGRAM_URL as string | undefined) || null,
  tiktokUrl: (import.meta.env.VITE_TIKTOK_URL as string | undefined) || null,
}

/** Enlace a WhatsApp de VIDALID con un mensaje ya escrito (null si no hay número configurado). */
export function vidalidWhatsAppUrl(message: string): string | null {
  if (!portalConfig.whatsappNumber) return null
  return `https://wa.me/${portalConfig.whatsappNumber}?text=${encodeURIComponent(message)}`
}
