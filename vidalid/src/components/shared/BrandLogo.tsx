import { cn } from '@/lib/utils'

interface BrandLogoProps {
  /** logo = "Vidalid" completo · isotipo = solo la "V" con hojas */
  kind?: 'logo' | 'isotipo'
  /** white = versión negativa para fondos oscuros */
  tone?: 'color' | 'white'
  className?: string
}

const sources = {
  logo: { color: '/brand/logo.svg', white: '/brand/logo-white.svg' },
  isotipo: { color: '/brand/isotipo.svg', white: '/brand/isotipo-white.svg' },
}

/** Logo oficial de VIDALID (archivos SVG del manual de marca en /public/brand). */
export function BrandLogo({ kind = 'logo', tone = 'color', className }: BrandLogoProps) {
  return (
    <img
      src={sources[kind][tone]}
      alt="Vidalid"
      draggable={false}
      className={cn('select-none', kind === 'logo' ? 'h-8 w-auto' : 'size-8', className)}
    />
  )
}
