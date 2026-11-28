import { ArrowLeft, Check, MessageCircle, Minus, Plus, ShoppingBag, Store, Truck } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { Button, buttonVariants } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { formatBolivianos } from '@/lib/utils'
import { ProductImage } from '../components/ProductImage'
import { vidalidWhatsAppUrl } from '../config'
import { useCatalogProduct } from '../hooks/useCatalog'
import { usePortalCart } from '../store/portalCart.store'

/** RF-77 · Detalle de producto. */
export function ProductDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const query = useCatalogProduct(id)
  const add = usePortalCart((state) => state.add)
  const inCart = usePortalCart((state) => state.items.find((item) => item.productId === id)?.quantity ?? 0)
  const [quantity, setQuantity] = useState(1)
  const product = query.data

  if (query.isLoading) {
    return (
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-8 md:grid-cols-2">
        <Skeleton className="aspect-square rounded-3xl" />
        <div className="space-y-3">
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-6 w-1/3" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    )
  }

  if (!product) {
    return (
      <div className="mx-auto max-w-xl px-4 py-20 text-center">
        <p className="font-heading text-xl font-bold">Producto no disponible</p>
        <p className="mt-2 text-sm text-muted-foreground">Es posible que ya no esté en el catálogo.</p>
        <Link to="/" className={buttonVariants({ className: 'mt-6' })}>
          Ver catálogo
        </Link>
      </div>
    )
  }

  const maxAddable = Math.max(product.availableStock - inCart, 0)
  const whatsapp = vidalidWhatsAppUrl(`Hola Vidalid, quisiera consultar por el producto ${product.name} (${product.sku}).`)

  const addToCart = (goToCart: boolean) => {
    add({ productId: product.id, name: product.name, unitPrice: product.salePrice, imagePath: product.imagePath, unit: product.unit }, quantity, product.availableStock)
    toast.success(`${quantity} × ${product.name} agregado al pedido.`)
    setQuantity(1)
    if (goToCart) navigate('/carrito')
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Volver al catálogo
      </Link>

      <div className="mt-4 grid gap-8 md:grid-cols-2">
        <ProductImage imagePath={product.imagePath} name={product.name} className="aspect-square w-full rounded-3xl border" />

        <div>
          <Link to={`/?categoria=${product.categoryId}`} className="text-xs font-semibold tracking-wide text-brand uppercase hover:underline">
            {product.categoryName}
          </Link>
          <h1 className="mt-1 font-heading text-3xl font-bold">{product.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Código {product.sku} · Presentación: {product.unit}
          </p>

          <p className="mt-5 font-heading text-3xl font-extrabold text-brand-dark tabular-nums">{formatBolivianos(product.salePrice)}</p>
          <p className={`mt-1 text-sm font-semibold ${product.inStock ? 'text-success' : 'text-destructive'}`}>
            {product.inStock ? `Disponible (${product.availableStock} ${product.unit})` : 'Agotado por ahora'}
          </p>

          {product.description && <p className="mt-5 leading-relaxed whitespace-pre-line text-foreground/90">{product.description}</p>}

          {product.inStock && (
            <div className="mt-6 space-y-3">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium">Cantidad</span>
                <div className="flex items-center rounded-full border bg-card">
                  <button type="button" className="grid size-10 place-items-center disabled:opacity-40" onClick={() => setQuantity((q) => Math.max(1, q - 1))} disabled={quantity <= 1} aria-label="Quitar uno">
                    <Minus className="size-4" />
                  </button>
                  <span className="w-10 text-center font-semibold tabular-nums" aria-live="polite">{quantity}</span>
                  <button type="button" className="grid size-10 place-items-center disabled:opacity-40" onClick={() => setQuantity((q) => Math.min(maxAddable, q + 1))} disabled={quantity >= maxAddable} aria-label="Agregar uno">
                    <Plus className="size-4" />
                  </button>
                </div>
                {inCart > 0 && <span className="text-xs text-muted-foreground">Ya tienes {inCart} en tu pedido</span>}
              </div>
              {maxAddable === 0 ? (
                <p className="text-sm text-muted-foreground">Ya agregaste todas las unidades disponibles.</p>
              ) : (
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button size="lg" className="h-12 flex-1 text-base" onClick={() => addToCart(true)}>
                    <ShoppingBag /> Agregar y ver pedido
                  </Button>
                  <Button size="lg" variant="outline" className="h-12 flex-1 text-base" onClick={() => addToCart(false)}>
                    <Check /> Seguir comprando
                  </Button>
                </div>
              )}
            </div>
          )}

          {whatsapp && (
            <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[#1f9d55] hover:underline">
              <MessageCircle className="size-4" /> Consultar este producto por WhatsApp
            </a>
          )}

          <div className="mt-6 grid grid-cols-2 gap-3 border-t pt-5 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-2"><Truck className="size-4 text-brand" /> Envío a domicilio</span>
            <span className="inline-flex items-center gap-2"><Store className="size-4 text-brand" /> Recogida en almacén</span>
          </div>
        </div>
      </div>
    </div>
  )
}
