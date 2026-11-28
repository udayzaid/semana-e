import { Leaf } from 'lucide-react'
import { useState } from 'react'
import { getProductImageUrl } from '@/features/products/services/products.service'
import { cn } from '@/lib/utils'

/** Imagen del producto (bucket público) con un respaldo de marca si no hay foto. */
export function ProductImage({ imagePath, name, className }: { imagePath: string | null; name: string; className?: string }) {
  const [failed, setFailed] = useState(false)
  const url = getProductImageUrl(imagePath)

  return (
    <div className={cn('relative grid place-items-center overflow-hidden bg-gradient-to-br from-secondary to-muted', className)}>
      {url && !failed ? (
        <img src={url} alt={name} loading="lazy" className="size-full object-cover" onError={() => setFailed(true)} />
      ) : (
        <Leaf className="size-1/4 text-brand/40" aria-hidden="true" />
      )}
    </div>
  )
}
