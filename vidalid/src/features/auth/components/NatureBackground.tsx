import { useMediaQuery } from '@/hooks/useMediaQuery'

/** Pantalla grande = el panel lateral del login (breakpoint lg de Tailwind). */
const LARGE_SCREEN = '(min-width: 1024px)'

interface NatureBackgroundProps {
  /** large: panel lateral (escritorio) · small: banda superior (celular/tablet) */
  screen: 'large' | 'small'
}

/**
 * Fondo natural del login: video de un árbol meciéndose con el viento
 * (Pexels, licencia gratuita, ID 5402451) con un velo verde translúcido para
 * que el logo blanco se lea bien.
 * - Escritorio: versión HD (1280×720, 6,7 MB). Celular: versión liviana (426×240, 0,8 MB).
 * - Solo se monta el video del panel visible, para no descargar el otro.
 * - Mientras carga se ve la imagen de portada; con "reducir movimiento", solo la imagen.
 */
export function NatureBackground({ screen }: NatureBackgroundProps) {
  const isLarge = useMediaQuery(LARGE_SCREEN)
  const visible = screen === 'large' ? isLarge : !isLarge

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden bg-brand-dark" aria-hidden="true">
      <img src="/brand/login-leaves.jpg" alt="" className="absolute inset-0 size-full scale-105 object-cover" />
      {visible && (
        <video
          key={screen}
          className="nature-video absolute inset-0 size-full scale-105 object-cover"
          src={screen === 'large' ? '/brand/login-leaves-hd.mp4' : '/brand/login-leaves.mp4'}
          poster="/brand/login-leaves.jpg"
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
        />
      )}
      {/* Velo verde de marca (degradado, no plano) + viñeta para legibilidad */}
      <div className="absolute inset-0 bg-gradient-to-br from-brand-dark/80 via-brand-dark/45 to-brand/35" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_30%,rgba(20,30,10,0.55)_100%)]" />
    </div>
  )
}
