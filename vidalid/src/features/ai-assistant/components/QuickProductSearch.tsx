import { Search, Zap } from 'lucide-react'
import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { StockBadge } from '@/features/products/components/StockBadge'
import { useProductOptions } from '@/features/products/hooks/useProducts'
import { formatBolivianos } from '@/lib/utils'

/**
 * Consulta rápida de productos directamente en PostgreSQL, SIN usar OpenAI
 * (costo cero y respuesta instantánea) para preguntas simples:
 * ¿existe?, ¿cuánto hay?, ¿cuánto cuesta?
 */
export function QuickProductSearch() {
  const [query, setQuery] = useState('')
  const { data: products = [], isLoading } = useProductOptions()

  const q = query.trim().toLowerCase()
  const results = q ? products.filter((product) => product.name.toLowerCase().includes(q) || product.sku.toLowerCase().includes(q)).slice(0, 8) : []

  return (
    <section className="rounded-xl border bg-card p-4 shadow-xs">
      <div className="flex items-center gap-2">
        <Zap className="size-4 text-brand" />
        <h2 className="font-heading text-sm font-bold">Consulta rápida</h2>
        <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold text-secondary-foreground">Sin IA · instantánea</span>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">Busca un producto para ver si existe, su stock disponible y su precio.</p>

      <div className="relative mt-3">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Ej. omega, maca, VID-001…" className="h-10 bg-card pl-9" aria-label="Buscar producto" />
      </div>

      <div className="mt-3">
        {isLoading && <Skeleton className="h-16 w-full" />}
        {!isLoading && q && results.length === 0 && (
          <p className="rounded-lg border border-dashed p-3 text-center text-sm text-muted-foreground">No encontramos “{query}” entre los productos activos.</p>
        )}
        {results.length > 0 && (
          <ul className="divide-y rounded-lg border">
            {results.map((product) => (
              <li key={product.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{product.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {product.sku} · {product.availableStock > 0 ? `${product.availableStock} ${product.unit} disponibles` : 'sin stock'}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <span className="text-sm font-semibold tabular-nums">{formatBolivianos(product.salePrice)}</span>
                  <StockBadge status={product.stockStatus} isActive />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}
