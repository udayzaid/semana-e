import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'

/**
 * Copia para imprimir, montada directamente en <body> (fuera de diálogos con
 * scroll o posición fija, que recortarían el contenido al imprimir).
 * Es invisible en pantalla y es lo único que se imprime (ver index.css).
 */
export function PrintPortal({ children }: { children: ReactNode }) {
  return createPortal(<div className="print-only">{children}</div>, document.body)
}
