import { Leaf, Search, SlidersHorizontal, Truck, X } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { BrandLogo } from '@/components/shared/BrandLogo'
import { LeafBackground } from '@/components/shared/LeafBackground'
import { NatureBackground } from '@/components/shared/NatureBackground'
import { Pagination } from '@/components/shared/Pagination'
import { SimpleSelect } from '@/components/shared/SimpleSelect'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { toUserMessage } from '@/lib/errors'
import { cn } from '@/lib/utils'
import { ProductCard } from '../components/ProductCard'
import { useCatalog, useCatalogCategories, useCatalogOverview } from '../hooks/useCatalog'
import type { CatalogFilters } from '../services/catalog.service'

const PAGE_SIZE = 12

const sortOptions = [
  { value: 'name', label: 'Ordenar: nombre' },
  { value: 'price_asc', label: 'Precio: menor a mayor' },
  { value: 'price_desc', label: 'Precio: mayor a menor' },
]

/**
 * Tienda (página principal del portal): RF-73 a RF-77.
 * Banner corto de marca + catálogo con filtros por categoría, búsqueda, disponibilidad y orden.
 * Los filtros viven en la URL, así se pueden compartir enlaces a una categoría o búsqueda.
 */
export function StorePage() {
  const [params, setParams] = useSearchParams()
  const search = params.get('q') ?? ''
  const categoryId = params.get('categoria')
  const onlyInStock = params.get('stock') === '1'
  const sort = (params.get('orden') as CatalogFilters['sort']) || 'name'
  const page = Math.max(1, Number(params.get('pagina')) || 1)

  const update = (changes: Record<string, string | null>, resetPage = true) => {
    const next = new URLSearchParams(params)
    for (const [key, value] of Object.entries(changes)) {
      if (value === null || value === '') next.delete(key)
      else next.set(key, value)
    }
    if (resetPage) next.delete('pagina')
    setParams(next, { replace: true })
  }

  const debouncedSearch = useDebouncedValue(search)
  const categories = useCatalogCategories()
  const overview = useCatalogOverview()
  const catalog = useCatalog({ search: debouncedSearch, categoryId, onlyInStock, sort, page, pageSize: PAGE_SIZE })
  const rows = catalog.data?.rows ?? []
  const total = catalog.data?.total ?? 0
  const currentCategory = categories.data?.find((category) => category.id === categoryId)
  const hasFilters = !!(search || categoryId || onlyInStock || sort !== 'name')

  const categoryList = [
    { id: null as string | null, name: 'Todos los productos', count: overview.data?.totalProducts },
    ...(categories.data ?? []).map((category) => ({ id: category.id, name: category.name, count: overview.data?.byCategory[category.id]?.count ?? 0 })),
  ]

  return (
    <>
      {/* Banner corto de marca */}
      <section className="relative isolate overflow-hidden bg-brand-dark text-white">
        <NatureBackground screen="large" />
        <NatureBackground screen="small" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-brand-dark/85 via-brand-dark/55 to-brand-dark/20" aria-hidden="true" />
        <LeafBackground />
        <div className="relative mx-auto flex max-w-7xl flex-col gap-5 px-4 py-10 sm:py-14 md:flex-row md:items-center md:justify-between">
          <div className="max-w-xl">
            <BrandLogo tone="white" className="h-10 sm:h-12" />
            <h1 className="mt-4 font-heading text-3xl leading-tight font-bold sm:text-4xl">
              Tienda de productos <span className="font-serif font-medium text-brand-light italic">naturales</span>
            </h1>
            <p className="mt-2 text-sm text-white/85 sm:text-base">Tinturas, polvos, cápsulas y jarabes a base de plantas y superalimentos.</p>
          </div>
          <ul className="flex flex-wrap gap-2 text-xs text-white/90 sm:text-sm">
            <li className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 ring-1 ring-white/20 backdrop-blur-sm">
              <Leaf className="size-3.5 text-brand-light" /> 100% natural
            </li>
            <li className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 ring-1 ring-white/20 backdrop-blur-sm">
              <Truck className="size-3.5 text-brand-light" /> Envío o recojo en almacén
            </li>
          </ul>
        </div>
      </section>

      {/* Catálogo */}
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-8 lg:grid-cols-[240px_minmax(0,1fr)]">
        {/* Filtros laterales (escritorio) */}
        <aside className="hidden lg:block">
          <div className="sticky top-24 space-y-6">
            <div>
              <p className="text-xs font-bold tracking-[0.15em] text-brand">CATEGORÍAS</p>
              <nav className="mt-3 space-y-1" aria-label="Categorías">
                {categoryList.map((category) => (
                  <button
                    key={category.id ?? 'all'}
                    type="button"
                    onClick={() => update({ categoria: category.id })}
                    aria-current={categoryId === category.id ? 'true' : undefined}
                    className={cn(
                      'flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm capitalize transition',
                      categoryId === category.id ? 'bg-primary font-semibold text-primary-foreground' : 'text-foreground hover:bg-muted',
                    )}
                  >
                    <span className="truncate">{category.name}</span>
                    {category.count !== undefined && (
                      <span className={cn('ml-2 text-xs tabular-nums', categoryId === category.id ? 'text-primary-foreground/80' : 'text-muted-foreground')}>{category.count}</span>
                    )}
                  </button>
                ))}
              </nav>
            </div>
            <div className="space-y-3 border-t pt-5">
              <p className="text-xs font-bold tracking-[0.15em] text-brand">FILTRAR</p>
              <label className="flex items-center justify-between gap-2 text-sm">
                Solo disponibles
                <Switch checked={onlyInStock} onCheckedChange={(checked) => update({ stock: checked ? '1' : null })} />
              </label>
              {hasFilters && (
                <button type="button" onClick={() => setParams(new URLSearchParams(), { replace: true })} className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
                  <X className="size-3.5" /> Quitar filtros
                </button>
              )}
            </div>
          </div>
        </aside>

        <section className="min-w-0">
          {/* Barra superior: búsqueda y orden */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={search} onChange={(event) => update({ q: event.target.value })} placeholder="Buscar productos…" className="h-11 rounded-xl bg-card pl-9" aria-label="Buscar productos" />
            </div>
            <SimpleSelect aria-label="Ordenar" value={sort} onChange={(value) => update({ orden: value === 'name' ? null : value })} options={sortOptions} className="h-11 rounded-xl sm:w-56" />
          </div>

          {/* Categorías y filtro (celular y tablet) */}
          <div className="mt-3 flex items-center gap-2 overflow-x-auto pb-1 lg:hidden" role="tablist" aria-label="Categorías">
            {categoryList.map((category) => (
              <button
                key={category.id ?? 'all'}
                type="button"
                role="tab"
                aria-selected={categoryId === category.id}
                onClick={() => update({ categoria: category.id })}
                className={cn(
                  'shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-medium capitalize transition',
                  categoryId === category.id ? 'border-primary bg-primary text-primary-foreground' : 'bg-card hover:border-primary/40',
                )}
              >
                {category.id === null ? 'Todos' : category.name}
              </button>
            ))}
            <label className="ml-auto flex shrink-0 items-center gap-2 pl-2 text-sm whitespace-nowrap">
              <Switch checked={onlyInStock} onCheckedChange={(checked) => update({ stock: checked ? '1' : null })} />
              Disponibles
            </label>
          </div>

          {/* Encabezado de resultados */}
          <div className="mt-5 flex items-end justify-between gap-3">
            <div>
              <h2 className="font-heading text-xl font-bold capitalize">{currentCategory?.name ?? (search ? `Resultados para “${search}”` : 'Todos los productos')}</h2>
              {currentCategory?.description && <p className="text-sm text-muted-foreground">{currentCategory.description}</p>}
            </div>
            {!catalog.isLoading && <p className="shrink-0 text-sm text-muted-foreground">{total} producto{total === 1 ? '' : 's'}</p>}
          </div>

          {/* Productos */}
          <div className="mt-4">
            {catalog.isError && <p className="py-10 text-center text-sm text-destructive">{toUserMessage(catalog.error, 'No se pudo cargar el catálogo.')}</p>}
            <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4">
              {catalog.isLoading && Array.from({ length: 8 }).map((_, index) => <Skeleton key={index} className="aspect-[3/4] rounded-2xl" />)}
              {rows.map((product) => <ProductCard key={product.id} product={product} />)}
            </div>
            {!catalog.isLoading && !catalog.isError && rows.length === 0 && (
              <div className="rounded-2xl border border-dashed py-16 text-center">
                <SlidersHorizontal className="mx-auto size-8 text-muted-foreground" />
                <p className="mt-3 font-medium">No encontramos productos con esos filtros.</p>
                <button type="button" className="mt-2 text-sm font-semibold text-primary hover:underline" onClick={() => setParams(new URLSearchParams(), { replace: true })}>
                  Ver todos los productos
                </button>
              </div>
            )}
            {total > PAGE_SIZE && (
              <div className="mt-6 overflow-hidden rounded-2xl border bg-card">
                <Pagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={(next) => update({ pagina: String(next) }, false)} />
              </div>
            )}
          </div>
        </section>
      </div>
    </>
  )
}
