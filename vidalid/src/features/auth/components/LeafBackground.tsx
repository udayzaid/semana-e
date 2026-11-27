import type { CSSProperties } from 'react'

/**
 * Fondo animado de hojas verdes (inspirado en las hojas del isotipo Vidalid).
 * Solo CSS + SVG: sin archivos de video, carga instantánea.
 * Con "reducir movimiento" activado en el sistema, las hojas quedan quietas (ver index.css).
 */

// Posiciones fijas (no aleatorias en cada render) para que el dibujo sea estable.
const leaves = [
  { left: 4, size: 34, delay: 0, duration: 17, drift: 60, spin: 220, tone: 'light' },
  { left: 14, size: 22, delay: 6, duration: 21, drift: -40, spin: -180, tone: 'white' },
  { left: 23, size: 46, delay: 11, duration: 24, drift: 80, spin: 260, tone: 'brand' },
  { left: 33, size: 26, delay: 3, duration: 19, drift: -70, spin: -240, tone: 'light' },
  { left: 42, size: 38, delay: 14, duration: 23, drift: 50, spin: 200, tone: 'white' },
  { left: 51, size: 20, delay: 8, duration: 18, drift: -30, spin: -160, tone: 'light' },
  { left: 60, size: 42, delay: 1, duration: 26, drift: 90, spin: 300, tone: 'brand' },
  { left: 69, size: 28, delay: 12, duration: 20, drift: -60, spin: -220, tone: 'white' },
  { left: 77, size: 36, delay: 5, duration: 22, drift: 40, spin: 180, tone: 'light' },
  { left: 85, size: 24, delay: 16, duration: 19, drift: -50, spin: -200, tone: 'brand' },
  { left: 92, size: 40, delay: 9, duration: 25, drift: 70, spin: 260, tone: 'light' },
  { left: 9, size: 30, delay: 19, duration: 23, drift: 30, spin: 240, tone: 'white' },
  { left: 47, size: 32, delay: 21, duration: 21, drift: -80, spin: -260, tone: 'light' },
  { left: 72, size: 18, delay: 23, duration: 17, drift: 20, spin: 160, tone: 'white' },
] as const

const toneColor = {
  light: 'rgba(181, 204, 142, 0.55)', // Verde Brote
  brand: 'rgba(103, 140, 48, 0.75)', // Verde Vidalid
  white: 'rgba(255, 255, 255, 0.28)',
}

function Leaf({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 24 24" className="size-full" aria-hidden="true">
      <path d="M3 21C3 10.5 10.5 3 21 3c0 10.5-7.5 18-18 18z" fill={color} />
      <path d="M3 21 15.5 8.5" stroke="rgba(255,255,255,0.35)" strokeWidth="0.8" strokeLinecap="round" fill="none" />
    </svg>
  )
}

export function LeafBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {/* Profundidad: hojas grandes y difusas, como un bosque desenfocado */}
      <div className="leaf-breathe absolute -top-24 -left-24 size-[28rem] opacity-25 blur-2xl">
        <Leaf color="#678c30" />
      </div>
      <div className="leaf-breathe absolute -right-32 -bottom-28 size-[34rem] rotate-180 opacity-20 blur-3xl [animation-delay:-6s]">
        <Leaf color="#b5cc8e" />
      </div>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_20%,rgba(181,204,142,0.18),transparent_55%),radial-gradient(ellipse_at_80%_90%,rgba(103,140,48,0.35),transparent_60%)]" />

      {/* Hojas que caen y se mecen */}
      {leaves.map((leaf, index) => (
        <span
          key={index}
          className="leaf-fall absolute top-0"
          style={
            {
              left: `${leaf.left}%`,
              width: leaf.size,
              height: leaf.size,
              animationDuration: `${leaf.duration}s`,
              animationDelay: `-${leaf.delay}s`,
              '--leaf-drift': `${leaf.drift}px`,
              '--leaf-spin': `${leaf.spin}deg`,
            } as CSSProperties
          }
        >
          <span className="leaf-sway block size-full" style={{ animationDuration: `${3 + (index % 4)}s` }}>
            <Leaf color={toneColor[leaf.tone]} />
          </span>
        </span>
      ))}
    </div>
  )
}
