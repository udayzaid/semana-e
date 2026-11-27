import { Package } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { getProductImageUrl } from '../services/products.service'

interface ProductThumbProps {
  imagePath: string | null
  name: string
  className?: string
}

export function ProductThumb({ imagePath, name, className }: ProductThumbProps) {
  const [failed, setFailed] = useState(false)
  const url = getProductImageUrl(imagePath)

  return (
    <div className={cn('grid size-10 shrink-0 place-items-center overflow-hidden rounded-lg bg-secondary text-primary/70', className)}>
      {url && !failed ? (
        <img src={url} alt={name} loading="lazy" className="size-full object-cover" onError={() => setFailed(true)} />
      ) : (
        <Package className="size-4" />
      )}
    </div>
  )
}
