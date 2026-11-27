import { zodResolver } from '@hookform/resolvers/zod'
import { FolderPlus, Loader2, Pencil, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import { toUserMessage } from '@/lib/errors'
import { useCategories, useDeleteCategory, useSaveCategory, useToggleCategory } from '../hooks/useCategories'
import { categorySchema, type CategoryFormInput, type CategoryFormValues } from '../schemas/product.schema'
import type { Category } from '../types'

export function CategoriesTab() {
  const categories = useCategories()
  const toggle = useToggleCategory()
  const remove = useDeleteCategory()
  const [editing, setEditing] = useState<Category | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [deleting, setDeleting] = useState<Category | null>(null)

  const confirmDelete = () => {
    if (!deleting) return
    remove.mutate(deleting.id, {
      onSuccess: () => {
        toast.success('Categoría eliminada.')
        setDeleting(null)
      },
      onError: (error) => {
        toast.error(
          toUserMessage(error, 'No se pudo eliminar la categoría.', {
            foreignKey: 'La categoría tiene productos. Muévelos a otra categoría o desactívala.',
          }),
        )
        setDeleting(null)
      },
    })
  }

  const onToggle = (category: Category, isActive: boolean) => {
    toggle.mutate(
      { id: category.id, isActive },
      {
        onSuccess: () => toast.success(isActive ? 'Categoría activada.' : 'Categoría desactivada.'),
        onError: (error) => toast.error(toUserMessage(error)),
      },
    )
  }

  const rows = categories.data ?? []

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button
          onClick={() => {
            setEditing(null)
            setFormOpen(true)
          }}
        >
          <FolderPlus /> Nueva categoría
        </Button>
      </div>

      <div className="overflow-hidden rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead className="pl-4">Categoría</TableHead>
              <TableHead className="text-right">Productos</TableHead>
              <TableHead>Activa</TableHead>
              <TableHead className="pr-4 text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {categories.isLoading &&
              Array.from({ length: 3 }).map((_, index) => (
                <TableRow key={index}>
                  <TableCell colSpan={4} className="px-4">
                    <Skeleton className="h-8 w-full" />
                  </TableCell>
                </TableRow>
              ))}

            {categories.isError && (
              <TableRow>
                <TableCell colSpan={4} className="py-10 text-center text-sm text-destructive">
                  {toUserMessage(categories.error, 'No se pudieron cargar las categorías.')}
                </TableCell>
              </TableRow>
            )}

            {!categories.isLoading && !categories.isError && rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="py-12 text-center text-sm text-muted-foreground">
                  Aún no hay categorías. Crea la primera, por ejemplo “Suplementos” o “Vitaminas”.
                </TableCell>
              </TableRow>
            )}

            {rows.map((category) => (
              <TableRow key={category.id} className={category.isActive ? undefined : 'opacity-60'}>
                <TableCell className="pl-4">
                  <p className="font-medium">{category.name}</p>
                  {category.description && <p className="max-w-md truncate text-xs text-muted-foreground">{category.description}</p>}
                </TableCell>
                <TableCell className="text-right tabular-nums">{category.productCount}</TableCell>
                <TableCell>
                  <Switch
                    checked={category.isActive}
                    onCheckedChange={(checked) => onToggle(category, checked)}
                    disabled={toggle.isPending}
                    aria-label={`${category.isActive ? 'Desactivar' : 'Activar'} ${category.name}`}
                  />
                </TableCell>
                <TableCell className="pr-4 text-right">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    title="Editar"
                    aria-label={`Editar ${category.name}`}
                    onClick={() => {
                      setEditing(category)
                      setFormOpen(true)
                    }}
                  >
                    <Pencil />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    title={category.productCount > 0 ? 'Tiene productos: no se puede eliminar' : 'Eliminar'}
                    aria-label={`Eliminar ${category.name}`}
                    disabled={category.productCount > 0}
                    onClick={() => setDeleting(category)}
                  >
                    <Trash2 className="text-destructive" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <CategoryFormDialog open={formOpen} onOpenChange={setFormOpen} category={editing} />

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="¿Eliminar categoría?"
        description={`“${deleting?.name}” se borrará definitivamente.`}
        confirmLabel="Eliminar"
        destructive
        loading={remove.isPending}
        onConfirm={confirmDelete}
      />
    </div>
  )
}

interface CategoryFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  category: Category | null
}

function CategoryFormDialog({ open, onOpenChange, category }: CategoryFormDialogProps) {
  const save = useSaveCategory()
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CategoryFormInput, unknown, CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: { name: '', description: '', isActive: true },
  })

  useEffect(() => {
    if (!open) return
    reset({
      name: category?.name ?? '',
      description: category?.description ?? '',
      isActive: category?.isActive ?? true,
    })
  }, [open, category, reset])

  const onSubmit = (values: CategoryFormValues) => {
    save.mutate(
      { id: category?.id, input: values },
      {
        onSuccess: () => {
          toast.success(category ? 'Categoría actualizada.' : 'Categoría creada.')
          onOpenChange(false)
        },
        onError: (error) => toast.error(toUserMessage(error, 'No se pudo guardar la categoría.')),
      },
    )
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !save.isPending && onOpenChange(next)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{category ? 'Editar categoría' : 'Nueva categoría'}</DialogTitle>
          <DialogDescription>Agrupa los productos para encontrarlos más fácil.</DialogDescription>
        </DialogHeader>

        <form id="category-form" onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="category-name">Nombre</Label>
            <Input id="category-name" placeholder="Suplementos" aria-invalid={!!errors.name} {...register('name')} />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="category-description">Descripción (opcional)</Label>
            <Textarea id="category-description" rows={3} aria-invalid={!!errors.description} {...register('description')} />
            {errors.description && <p className="text-xs text-destructive">{errors.description.message}</p>}
          </div>
          <div className="flex items-center justify-between rounded-lg border p-3">
            <Label htmlFor="category-active">Categoría activa</Label>
            <Controller
              control={control}
              name="isActive"
              render={({ field }) => <Switch id="category-active" checked={field.value} onCheckedChange={(checked) => field.onChange(checked)} />}
            />
          </div>
        </form>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={save.isPending}>
            Cancelar
          </Button>
          <Button type="submit" form="category-form" disabled={save.isPending}>
            {save.isPending && <Loader2 className="animate-spin" />}
            {category ? 'Guardar cambios' : 'Crear categoría'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
