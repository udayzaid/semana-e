import { Check, ShoppingBag } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { formatBolivianos } from '@/lib/utils'
import type { CatalogProduct } from '../services/catalog.service'
import { usePortalCart } from '../store/portalCart.store'
import { ProductImage } from './ProductImage'

export function ProductCard({ product }: { product: CatalogProduct }) {
  const add = usePortalCart((state) => state.add)
  const [added, setAdded] = useState(false)

  const addToCart = () => {
    add({ productId: product.id, name: product.name, unitPrice: product.salePrice, imagePath: product.imagePath, unit: product.unit }, 1, product.availableStock)
    toast.success(`${product.name} agregado al carrito.`)
    setAdded(true)
    setTimeout(() => setAdded(false), 1500)
  }

  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border bg-card shadow-xs transition hover:-translate-y-0.5 hover:shadow-md">
      <Link to={`/producto/${product.id}`} className="relative block" aria-label={`Ver ${product.name}`}>
        <ProductImage imagePath={product.imagePath} name={product.name} className="aspect-square w-full transition duration-300 group-hover:scale-[1.03]" />
        {!product.inStock && (
          <span className="absolute top-3 left-3 rounded-full bg-card/95 px-2.5 py-1 text-xs font-semibold text-destructive shadow-xs">Agotado</span>
        )}
      </Link>
      <div className="flex flex-1 flex-col p-4">
        <p className="text-[11px] font-semibold tracking-wide text-brand uppercase">{product.categoryName}</p>
        <Link to={`/producto/${product.id}`} className="mt-1 line-clamp-2 font-heading font-bold text-foreground hover:text-primary">
          {product.name}
        </Link>
        <p className="mt-0.5 text-xs text-muted-foreground">{product.unit}</p>
        <div className="mt-auto flex items-end justify-between gap-2 pt-3">
          <p className="font-heading text-lg font-extrabold text-brand-dark tabular-nums">{formatBolivianos(product.salePrice)}</p>
          <Button size="sm" onClick={addToCart} disabled={!product.inStock} aria-label={`Agregar ${product.name} al carrito`}>
            {added ? <Check /> : <ShoppingBag />}
            {product.inStock ? (added ? 'Agregado' : 'Agregar') : 'Sin stock'}
          </Button>
        </div>
      </div>
    </article>
  )
}
