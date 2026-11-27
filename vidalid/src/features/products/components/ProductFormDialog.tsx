import { zodResolver } from '@hookform/resolvers/zod'
import { ImagePlus, Loader2, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { toast } from 'sonner'
import { SimpleSelect } from '@/components/shared/SimpleSelect'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { toUserMessage } from '@/lib/errors'
import { useSaveProduct } from '../hooks/useProducts'
import { productSchema, type ProductFormInput, type ProductFormValues } from '../schemas/product.schema'
import { getProductImageUrl, validateImage } from '../services/products.service'
import type { Category, Product } from '../types'

const UNIT_SUGGESTIONS = ['unidad', 'frasco', 'caja', 'sobre', 'paquete', 'botella', 'cápsulas', 'kg', 'g', 'litro', 'ml']

const emptyValues: ProductFormInput = {
  name: '',
  sku: '',
  categoryId: '',
  unit: 'unidad',
  description: '',
  cost: 0,
  salePrice: 0,
  minStock: 0,
  isActive: true,
}

interface ProductFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** null = crear producto nuevo */
  product: Product | null
  categories: Category[]
}

export function ProductFormDialog({ open, onOpenChange, product, categories }: ProductFormDialogProps) {
  const save = useSaveProduct()
  const fileInput = useRef<HTMLInputElement>(null)
  const [newImage, setNewImage] = useState<File | null>(null)
  const [removeImage, setRemoveImage] = useState(false)
  const [imageError, setImageError] = useState<string | null>(null)

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ProductFormInput, unknown, ProductFormValues>({
    resolver: zodResolver(productSchema),
    // El padre vuelve a montar este componente (key) cada vez que se abre.
    defaultValues: product
      ? {
          name: product.name,
          sku: product.sku,
          categoryId: product.categoryId,
          unit: product.unit,
          description: product.description ?? '',
          cost: product.cost,
          salePrice: product.salePrice,
          minStock: product.minStock,
          isActive: product.isActive,
        }
      : emptyValues,
  })

  // Vista previa de la imagen elegida.
  const previewUrl = useMemo(() => (newImage ? URL.createObjectURL(newImage) : null), [newImage])
  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
  }, [previewUrl])

  const currentImageUrl = removeImage ? null : getProductImageUrl(product?.imagePath ?? null)
  const shownImage = previewUrl ?? currentImageUrl

  // Solo categorías activas, más la actual del producto aunque esté inactiva.
  const categoryOptions = categories
    .filter((category) => category.isActive || category.id === product?.categoryId)
    .map((category) => ({ value: category.id, label: category.isActive ? category.name : `${category.name} (inactiva)` }))

  const cost = Number(useWatch({ control, name: 'cost' }))
  const salePrice = Number(useWatch({ control, name: 'salePrice' }))
  const priceBelowCost = salePrice > 0 && cost > 0 && salePrice < cost

  const onPickImage = (file: File | undefined) => {
    if (!file) return
    const problem = validateImage(file)
    if (problem) {
      setImageError(problem)
      return
    }
    setImageError(null)
    setNewImage(file)
    setRemoveImage(false)
  }

  const onSubmit = (values: ProductFormValues) => {
    save.mutate(
      {
        id: product?.id,
        input: values,
        currentImagePath: product?.imagePath ?? null,
        newImage,
        removeImage,
      },
      {
        onSuccess: () => {
          toast.success(product ? 'Producto actualizado.' : 'Producto registrado.')
          onOpenChange(false)
        },
        onError: (error) => toast.error(toUserMessage(error, 'No se pudo guardar el producto.')),
      },
    )
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !save.isPending && onOpenChange(next)}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{product ? 'Editar producto' : 'Nuevo producto'}</DialogTitle>
          <DialogDescription>
            {product
              ? `Stock actual: ${product.stock} ${product.unit}. Las existencias se modifican desde Inventario.`
              : 'El producto empieza con stock 0. Registra el ingreso de mercadería desde Inventario.'}
          </DialogDescription>
        </DialogHeader>

        <form id="product-form" onSubmit={handleSubmit(onSubmit)} noValidate className="grid gap-5 sm:grid-cols-[160px_1fr]">
          {/* Imagen */}
          <div className="space-y-2">
            <Label>Imagen</Label>
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              className="group relative grid aspect-square w-full place-items-center overflow-hidden rounded-xl border border-dashed bg-muted/40 text-muted-foreground transition hover:border-primary hover:text-primary"
            >
              {shownImage ? (
                <img src={shownImage} alt="Imagen del producto" className="size-full object-cover" />
              ) : (
                <span className="flex flex-col items-center gap-1 text-xs">
                  <ImagePlus className="size-6" />
                  Subir imagen
                </span>
              )}
            </button>
            <input
              ref={fileInput}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(event) => {
                onPickImage(event.target.files?.[0])
                event.target.value = ''
              }}
            />
            {shownImage && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="w-full text-destructive"
                onClick={() => {
                  setNewImage(null)
                  setRemoveImage(true)
                }}
              >
                <Trash2 /> Quitar imagen
              </Button>
            )}
            <p className="text-xs text-muted-foreground">JPG, PNG o WEBP · máx. 2 MB</p>
            {imageError && <p className="text-xs text-destructive">{imageError}</p>}
          </div>

          {/* Datos */}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nombre" htmlFor="name" error={errors.name?.message} className="sm:col-span-2">
              <Input id="name" placeholder="Omega 3 Premium" aria-invalid={!!errors.name} {...register('name')} />
            </Field>

            <Field label="SKU (código)" htmlFor="sku" error={errors.sku?.message}>
              <Input id="sku" placeholder="VID-001" className="uppercase" aria-invalid={!!errors.sku} {...register('sku')} />
            </Field>

            <Field label="Categoría" htmlFor="categoryId" error={errors.categoryId?.message}>
              <Controller
                control={control}
                name="categoryId"
                render={({ field }) => (
                  <SimpleSelect
                    id="categoryId"
                    value={field.value || null}
                    onChange={(value) => field.onChange(value ?? '')}
                    options={categoryOptions}
                    placeholder="Selecciona una categoría"
                    invalid={!!errors.categoryId}
                    className="h-8"
                  />
                )}
              />
            </Field>

            <Field label="Costo (Bs)" htmlFor="cost" error={errors.cost?.message}>
              <Input id="cost" type="number" inputMode="decimal" step="0.01" min="0" aria-invalid={!!errors.cost} {...register('cost')} />
            </Field>

            <Field
              label="Precio de venta (Bs)"
              htmlFor="salePrice"
              error={errors.salePrice?.message}
              hint={priceBelowCost ? 'El precio es menor que el costo.' : undefined}
            >
              <Input id="salePrice" type="number" inputMode="decimal" step="0.01" min="0" aria-invalid={!!errors.salePrice} {...register('salePrice')} />
            </Field>

            <Field label="Unidad de medida" htmlFor="unit" error={errors.unit?.message}>
              <Input id="unit" list="unit-suggestions" aria-invalid={!!errors.unit} {...register('unit')} />
              <datalist id="unit-suggestions">
                {UNIT_SUGGESTIONS.map((unit) => (
                  <option key={unit} value={unit} />
                ))}
              </datalist>
            </Field>

            <Field label="Stock mínimo" htmlFor="minStock" error={errors.minStock?.message} hint="Se avisará cuando el disponible llegue a este número.">
              <Input id="minStock" type="number" inputMode="numeric" step="1" min="0" aria-invalid={!!errors.minStock} {...register('minStock')} />
            </Field>

            <Field label="Descripción" htmlFor="description" error={errors.description?.message} className="sm:col-span-2">
              <Textarea
                id="description"
                rows={3}
                placeholder="Presentación, beneficios, modo de uso…"
                aria-invalid={!!errors.description}
                {...register('description')}
              />
            </Field>

            <div className="flex items-center justify-between rounded-lg border p-3 sm:col-span-2">
              <div>
                <Label htmlFor="isActive">Producto activo</Label>
                <p className="mt-1 text-xs text-muted-foreground">Los inactivos no aparecen en ventas ni en el catálogo.</p>
              </div>
              <Controller
                control={control}
                name="isActive"
                render={({ field }) => <Switch id="isActive" checked={field.value} onCheckedChange={(checked) => field.onChange(checked)} />}
              />
            </div>
          </div>
        </form>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={save.isPending}>
            Cancelar
          </Button>
          <Button type="submit" form="product-form" disabled={save.isPending}>
            {save.isPending && <Loader2 className="animate-spin" />}
            {product ? 'Guardar cambios' : 'Registrar producto'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

interface FieldProps {
  label: string
  htmlFor: string
  error?: string
  hint?: string
  className?: string
  children: React.ReactNode
}

function Field({ label, htmlFor, error, hint, className, children }: FieldProps) {
  return (
    <div className={['space-y-1.5', className].filter(Boolean).join(' ')}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {error ? (
        <p className="text-xs text-destructive">{error}</p>
      ) : hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  )
}
