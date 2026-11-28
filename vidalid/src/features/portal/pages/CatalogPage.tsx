import { Search, SlidersHorizontal } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { Pagination } from '@/components/shared/Pagination'
import { SimpleSelect } from '@/components/shared/SimpleSelect'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { toUserMessage } from '@/lib/errors'
import { cn } from '@/lib/utils'
import { ProductCard } from '../components/ProductCard'
import { useCatalog, useCatalogCategories } from '../hooks/useCatalog'
import type { CatalogFilters } from '../services/catalog.service'

const PAGE_SIZE = 12

const sortOptions = [
  { value: 'name', label: 'Ordenar: nombre' },
  { value: 'price_asc', label: 'Precio: menor a mayor' },
  { value: 'price_desc', label: 'Precio: mayor a menor' },
]

/** RF-74 a RF-76 · Catálogo con categorías, búsqueda y filtros. Los filtros viven en la URL (se pueden compartir). */
export function CatalogPage() {
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
  const catalog = useCatalog({ search: debouncedSearch, categoryId, onlyInStock, sort, page, pageSize: PAGE_SIZE })
  const rows = catalog.data?.rows ?? []
  const currentCategory = categories.data?.find((category) => category.id === categoryId)

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="font-heading text-3xl font-bold">{currentCategory?.name ?? 'Catálogo de productos'}</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {currentCategory?.description ?? 'Productos naturales elaborados a base de plantas y superalimentos.'}
      </p>

      {/* Categorías */}
      <div className="mt-6 flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Categorías">
        {[{ id: null as string | null, name: 'Todos' }, ...(categories.data ?? [])].map((category) => (
          <button
            key={category.id ?? 'all'}
            type="button"
            role="tab"
            aria-selected={categoryId === category.id}
            onClick={() => update({ categoria: category.id })}
            className={cn(
              'shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition',
              categoryId === category.id ? 'border-primary bg-primary text-primary-foreground' : 'bg-card hover:border-primary/40',
            )}
          >
            {category.name}
          </button>
        ))}
      </div>

      {/* Búsqueda y filtros */}
      <div className="mt-4 grid gap-3 rounded-2xl border bg-card p-3 sm:grid-cols-[1fr_auto_220px] sm:items-center">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(event) => update({ q: event.target.value })} placeholder="Buscar producto…" className="h-10 bg-card pl-9" aria-label="Buscar producto" />
        </div>
        <label className="flex items-center gap-2 px-1 text-sm whitespace-nowrap">
          <Switch checked={onlyInStock} onCheckedChange={(checked) => update({ stock: checked ? '1' : null })} />
          Solo disponibles
        </label>
        <SimpleSelect aria-label="Ordenar" value={sort} onChange={(value) => update({ orden: value === 'name' ? null : value })} options={sortOptions} className="h-10" />
      </div>

      {/* Resultados */}
      <div className="mt-6">
        {catalog.isError && <p className="py-10 text-center text-sm text-destructive">{toUserMessage(catalog.error, 'No se pudo cargar el catálogo.')}</p>}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
          {catalog.isLoading && Array.from({ length: 8 }).map((_, index) => <Skeleton key={index} className="aspect-[3/4] rounded-2xl" />)}
          {rows.map((product) => <ProductCard key={product.id} product={product} />)}
        </div>
        {!catalog.isLoading && !catalog.isError && rows.length === 0 && (
          <div className="py-16 text-center">
            <SlidersHorizontal className="mx-auto size-8 text-muted-foreground" />
            <p className="mt-3 font-medium">No encontramos productos con esos filtros.</p>
            <button type="button" className="mt-2 text-sm font-semibold text-primary hover:underline" onClick={() => setParams(new URLSearchParams(), { replace: true })}>
              Ver todo el catálogo
            </button>
          </div>
        )}
        {(catalog.data?.total ?? 0) > PAGE_SIZE && (
          <div className="mt-6 overflow-hidden rounded-2xl border bg-card">
            <Pagination page={page} pageSize={PAGE_SIZE} total={catalog.data?.total ?? 0} onPageChange={(next) => update({ pagina: String(next) }, false)} />
          </div>
        )}
      </div>
    </div>
  )
}
