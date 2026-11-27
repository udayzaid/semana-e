import { AlertTriangle, PackagePlus, Pencil, Power, PowerOff, Search, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { Pagination } from '@/components/shared/Pagination'
import { SimpleSelect, type SelectOption } from '@/components/shared/SimpleSelect'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { toUserMessage } from '@/lib/errors'
import { formatBolivianos } from '@/lib/utils'
import { useCategories } from '../hooks/useCategories'
import { useDeleteProduct, useProducts, useToggleProduct } from '../hooks/useProducts'
import type { Product, ProductStatusFilter } from '../types'
import { ProductFormDialog } from './ProductFormDialog'
import { ProductThumb } from './ProductThumb'
import { StockBadge } from './StockBadge'

const PAGE_SIZE = 10

const statusOptions: SelectOption[] = [
  { value: 'all', label: 'Todos los estados' },
  { value: 'active', label: 'Activos' },
  { value: 'inactive', label: 'Inactivos' },
  { value: 'low', label: 'Stock bajo' },
  { value: 'out', label: 'Agotados' },
]

export function ProductsTab() {
  const [search, setSearch] = useState('')
  const [categoryId, setCategoryId] = useState<string | null>(null)
  // "Todos" por defecto: un producto desactivado sigue visible (atenuado) y se puede reactivar.
  const [status, setStatus] = useState<ProductStatusFilter>('all')
  const [page, setPage] = useState(1)
  const [editing, setEditing] = useState<Product | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  // Cambia en cada apertura para montar el formulario limpio.
  const [formKey, setFormKey] = useState(0)
  const [toggling, setToggling] = useState<Product | null>(null)
  const [deleting, setDeleting] = useState<Product | null>(null)

  const debouncedSearch = useDebouncedValue(search)
  const categories = useCategories()
  const products = useProducts({ search: debouncedSearch, categoryId, status, page, pageSize: PAGE_SIZE })
  const toggle = useToggleProduct()
  const remove = useDeleteProduct()

  const categoryOptions: SelectOption[] = [
    { value: 'all', label: 'Todas las categorías' },
    ...(categories.data ?? []).map((category) => ({ value: category.id, label: category.name })),
  ]

  const openCreate = () => {
    setEditing(null)
    setFormKey((key) => key + 1)
    setFormOpen(true)
  }

  const openEdit = (product: Product) => {
    setEditing(product)
    setFormKey((key) => key + 1)
    setFormOpen(true)
  }

  const confirmToggle = () => {
    if (!toggling) return
    const next = !toggling.isActive
    toggle.mutate(
      { id: toggling.id, isActive: next },
      {
        onSuccess: () => {
          toast.success(next ? 'Producto activado.' : 'Producto desactivado.')
          setToggling(null)
        },
        onError: (error) => toast.error(toUserMessage(error)),
      },
    )
  }

  const confirmDelete = () => {
    if (!deleting) return
    remove.mutate(
      { id: deleting.id, imagePath: deleting.imagePath },
      {
        onSuccess: () => {
          toast.success('Producto eliminado.')
          setDeleting(null)
        },
        onError: (error) => {
          toast.error(
            toUserMessage(error, 'No se pudo eliminar el producto.', {
              foreignKey: 'Este producto ya tiene movimientos o ventas, por eso no se puede eliminar. Desactívalo para ocultarlo.',
            }),
          )
          setDeleting(null)
        },
      },
    )
  }

  const hasCategories = (categories.data?.length ?? 0) > 0
  const rows = products.data?.rows ?? []

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="flex flex-col gap-3 rounded-xl border bg-card p-3 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value)
              setPage(1)
            }}
            placeholder="Buscar por nombre o SKU…"
            className="h-9 bg-card pl-9"
            aria-label="Buscar productos"
          />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:flex">
          <SimpleSelect
            aria-label="Filtrar por categoría"
            value={categoryId ?? 'all'}
            onChange={(value) => {
              setCategoryId(value === 'all' ? null : value)
              setPage(1)
            }}
            options={categoryOptions}
            className="lg:w-52"
          />
          <SimpleSelect
            aria-label="Filtrar por estado"
            value={status}
            onChange={(value) => {
              setStatus((value ?? 'all') as ProductStatusFilter)
              setPage(1)
            }}
            options={statusOptions}
            className="lg:w-44"
          />
        </div>
        <Button onClick={openCreate} className="h-9" disabled={!hasCategories}>
          <PackagePlus /> Nuevo producto
        </Button>
      </div>

      {!categories.isLoading && !hasCategories && (
        <div className="flex items-start gap-3 rounded-xl border border-warning/30 bg-warning/5 p-4 text-sm">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" />
          <p>
            Primero crea al menos una <strong>categoría</strong> en la pestaña “Categorías” para poder registrar productos.
          </p>
        </div>
      )}

      {/* Tabla */}
      <div className="overflow-hidden rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead className="pl-4">Producto</TableHead>
              <TableHead>Categoría</TableHead>
              <TableHead className="text-right">Costo</TableHead>
              <TableHead className="text-right">Precio</TableHead>
              <TableHead className="text-right">Disponible</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="pr-4 text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.isLoading &&
              Array.from({ length: 5 }).map((_, index) => (
                <TableRow key={index}>
                  <TableCell colSpan={7} className="px-4">
                    <Skeleton className="h-10 w-full" />
                  </TableCell>
                </TableRow>
              ))}

            {products.isError && (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-sm text-destructive">
                  {toUserMessage(products.error, 'No se pudieron cargar los productos.')}{' '}
                  <Button variant="link" size="sm" onClick={() => void products.refetch()}>
                    Reintentar
                  </Button>
                </TableCell>
              </TableRow>
            )}

            {!products.isLoading && !products.isError && rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="py-12 text-center text-sm text-muted-foreground">
                  {debouncedSearch || categoryId || status !== 'all'
                    ? 'No hay productos que coincidan con los filtros.'
                    : 'Aún no hay productos registrados.'}
                </TableCell>
              </TableRow>
            )}

            {rows.map((product) => (
              <TableRow key={product.id} className={product.isActive ? undefined : 'opacity-60'}>
                <TableCell className="pl-4">
                  <div className="flex min-w-52 items-center gap-3">
                    <ProductThumb imagePath={product.imagePath} name={product.name} />
                    <div className="min-w-0">
                      <p className="truncate font-medium text-foreground">{product.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {product.sku} · {product.unit}
                      </p>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground">{product.categoryName}</TableCell>
                <TableCell className="text-right text-muted-foreground tabular-nums">{formatBolivianos(product.cost)}</TableCell>
                <TableCell className="text-right font-medium tabular-nums">{formatBolivianos(product.salePrice)}</TableCell>
                <TableCell className="text-right tabular-nums">
                  <span className="font-semibold">{product.availableStock}</span>
                  <span className="text-xs text-muted-foreground"> / mín. {product.minStock}</span>
                </TableCell>
                <TableCell>
                  <StockBadge status={product.stockStatus} isActive={product.isActive} />
                </TableCell>
                <TableCell className="pr-4">
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="icon-sm" onClick={() => openEdit(product)} aria-label={`Editar ${product.name}`} title="Editar">
                      <Pencil />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => setToggling(product)}
                      aria-label={product.isActive ? `Desactivar ${product.name}` : `Activar ${product.name}`}
                      title={product.isActive ? 'Desactivar' : 'Activar'}
                    >
                      {product.isActive ? <PowerOff className="text-warning" /> : <Power className="text-success" />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => setDeleting(product)}
                      aria-label={`Eliminar ${product.name}`}
                      title="Eliminar"
                    >
                      <Trash2 className="text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <Pagination page={page} pageSize={PAGE_SIZE} total={products.data?.total ?? 0} onPageChange={setPage} />
      </div>

      <ProductFormDialog key={formKey} open={formOpen} onOpenChange={setFormOpen} product={editing} categories={categories.data ?? []} />

      <ConfirmDialog
        open={!!toggling}
        onOpenChange={(open) => !open && setToggling(null)}
        title={toggling?.isActive ? '¿Desactivar producto?' : '¿Activar producto?'}
        description={
          toggling?.isActive
            ? `“${toggling?.name}” dejará de aparecer en ventas y en el catálogo. Su historial se conserva.`
            : `“${toggling?.name}” volverá a estar disponible para ventas y en el catálogo.`
        }
        confirmLabel={toggling?.isActive ? 'Desactivar' : 'Activar'}
        destructive={toggling?.isActive}
        loading={toggle.isPending}
        onConfirm={confirmToggle}
      />

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="¿Eliminar producto?"
        description={`“${deleting?.name}” se borrará definitivamente. Solo es posible si nunca tuvo ingresos de stock ni ventas; si los tuvo, desactívalo.`}
        confirmLabel="Eliminar"
        destructive
        loading={remove.isPending}
        onConfirm={confirmDelete}
      />
    </div>
  )
}
