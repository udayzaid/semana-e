import { ArrowRight, ClipboardList, MessageCircle, PackageCheck, ShoppingBag, Store, Truck } from 'lucide-react'
import { Link } from 'react-router-dom'
import { BrandLogo } from '@/components/shared/BrandLogo'
import { LeafBackground } from '@/components/shared/LeafBackground'
import { NatureBackground } from '@/components/shared/NatureBackground'
import { buttonVariants } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { ProductCard } from '../components/ProductCard'
import { vidalidWhatsAppUrl } from '../config'
import { useCatalogCategories, useFeaturedProducts } from '../hooks/useCatalog'

const steps = [
  { icon: ShoppingBag, title: 'Elige tus productos', text: 'Explora el catálogo y agrégalos a tu pedido.' },
  { icon: ClipboardList, title: 'Envía tu solicitud', text: 'Sin crear cuenta: solo tu nombre y WhatsApp.' },
  { icon: PackageCheck, title: 'Te confirmamos', text: 'Te escribimos para coordinar el pago y la entrega.' },
]

/** RF-73 · Página de inicio del portal del cliente. */
export function PortalHomePage() {
  const categories = useCatalogCategories()
  const featured = useFeaturedProducts()
  const whatsapp = vidalidWhatsAppUrl('Hola Vidalid, tengo una tienda y quisiera información para comprar por mayor.')

  return (
    <>
      {/* Portada con video de naturaleza */}
      <section className="relative isolate overflow-hidden bg-brand-dark text-white">
        <NatureBackground screen="large" />
        <NatureBackground screen="small" />
        <LeafBackground />
        <div className="relative mx-auto flex max-w-6xl flex-col items-center px-4 py-20 text-center sm:py-28">
          <BrandLogo tone="white" className="h-16 drop-shadow-[0_10px_30px_rgba(0,0,0,0.35)] sm:h-24" />
          <p className="mt-3 text-[11px] font-semibold tracking-[0.45em] text-brand-light">PRODUCTOS NATURALES</p>
          <h1 className="mt-6 max-w-2xl font-heading text-3xl leading-tight font-bold sm:text-5xl">Salud natural para ti y tu negocio</h1>
          <p className="mt-4 max-w-xl text-base text-white/85 sm:text-lg">
            Tinturas, polvos, cápsulas y jarabes elaborados a base de plantas y superalimentos.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              to="/catalogo"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-white px-6 text-base font-semibold text-brand-dark shadow-sm transition hover:bg-white/90 focus-visible:ring-3 focus-visible:ring-white/50 focus-visible:outline-none [&_svg]:size-4"
            >
              Ver catálogo <ArrowRight />
            </Link>
            {whatsapp && (
              <a href={whatsapp} target="_blank" rel="noopener noreferrer" className={buttonVariants({ size: 'lg', variant: 'outline', className: 'h-12 border-white/40 bg-white/10 px-6 text-base text-white hover:bg-white/20 hover:text-white' })}>
                <MessageCircle /> Escríbenos
              </a>
            )}
          </div>
        </div>
      </section>

      {/* Categorías */}
      <section className="mx-auto max-w-6xl px-4 pt-14">
        <h2 className="font-heading text-2xl font-bold">Nuestras líneas</h2>
        <p className="mt-1 text-sm text-muted-foreground">Encuentra lo que buscas por categoría.</p>
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {categories.isLoading && Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-24 rounded-2xl" />)}
          {categories.data?.map((category) => (
            <Link
              key={category.id}
              to={`/catalogo?categoria=${category.id}`}
              className="group rounded-2xl border bg-card p-4 transition hover:border-primary/40 hover:shadow-sm"
            >
              <p className="font-heading font-bold group-hover:text-primary">{category.name}</p>
              {category.description && <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{category.description}</p>}
              <p className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-brand">
                Ver productos <ArrowRight className="size-3.5" />
              </p>
            </Link>
          ))}
        </div>
      </section>

      {/* Destacados */}
      <section className="mx-auto max-w-6xl px-4 pt-14">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="font-heading text-2xl font-bold">Productos disponibles</h2>
            <p className="mt-1 text-sm text-muted-foreground">Listos para tu pedido.</p>
          </div>
          <Link to="/catalogo" className="shrink-0 text-sm font-semibold text-primary hover:underline">
            Ver todo →
          </Link>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {featured.isLoading && Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="aspect-[3/4] rounded-2xl" />)}
          {featured.data?.map((product) => <ProductCard key={product.id} product={product} />)}
        </div>
        {featured.data?.length === 0 && <p className="mt-6 text-center text-sm text-muted-foreground">Pronto tendremos productos disponibles aquí.</p>}
      </section>

      {/* Cómo pedir */}
      <section className="mx-auto max-w-6xl px-4 pt-16">
        <h2 className="text-center font-heading text-2xl font-bold">Pedir es muy fácil</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {steps.map(({ icon: Icon, title, text }, index) => (
            <div key={title} className="rounded-2xl border bg-card p-5 text-center">
              <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-secondary text-brand">
                <Icon className="size-6" />
              </span>
              <p className="mt-3 text-xs font-bold text-brand">PASO {index + 1}</p>
              <p className="font-heading font-bold">{title}</p>
              <p className="mt-1 text-sm text-muted-foreground">{text}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap justify-center gap-3 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1.5"><Truck className="size-4 text-brand" /> Envío a domicilio</span>
          <span className="inline-flex items-center gap-1.5"><Store className="size-4 text-brand" /> Recogida en almacén</span>
        </div>
      </section>

      {/* Comerciantes */}
      <section className="mx-auto max-w-6xl px-4 pt-16">
        <div className={cn('flex flex-col items-start gap-4 rounded-3xl bg-secondary p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8')}>
          <div>
            <p className="text-xs font-bold tracking-[0.15em] text-brand">PARA COMERCIANTES</p>
            <h2 className="mt-1 font-heading text-xl font-bold text-secondary-foreground sm:text-2xl">¿Tienes una tienda o farmacia natural?</h2>
            <p className="mt-1 text-sm text-secondary-foreground/80">Atendemos a comerciantes minoristas con pedidos por mayor y entregas coordinadas.</p>
          </div>
          {whatsapp ? (
            <a href={whatsapp} target="_blank" rel="noopener noreferrer" className={buttonVariants({ className: 'h-11 shrink-0 px-5' })}>
              <MessageCircle /> Contactar por WhatsApp
            </a>
          ) : (
            <Link to="/catalogo" className={buttonVariants({ className: 'h-11 shrink-0 px-5' })}>
              Ver catálogo
            </Link>
          )}
        </div>
      </section>
    </>
  )
}
