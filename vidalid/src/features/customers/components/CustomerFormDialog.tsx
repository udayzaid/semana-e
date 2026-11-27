import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { FormField } from '@/components/shared/FormField'
import { SimpleSelect } from '@/components/shared/SimpleSelect'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { toUserMessage } from '@/lib/errors'
import { useSaveCustomer } from '../hooks/useCustomers'
import { customerSchema, type CustomerFormInput, type CustomerFormValues } from '../schemas/customer.schema'
import { customerTypeLabels, type CustomerSummary } from '../types'

const typeOptions = Object.entries(customerTypeLabels).map(([value, label]) => ({ value, label }))

interface CustomerFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  customer: CustomerSummary | null
  onSaved?: (id: string) => void
}

export function CustomerFormDialog({ open, onOpenChange, customer, onSaved }: CustomerFormDialogProps) {
  const save = useSaveCustomer()
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<CustomerFormInput, unknown, CustomerFormValues>({
    resolver: zodResolver(customerSchema),
    // El padre vuelve a montar el diálogo (key) en cada apertura.
    defaultValues: {
      name: customer?.name ?? '',
      businessName: customer?.businessName ?? '',
      customerType: customer?.customerType ?? 'retailer',
      phone: customer?.phone ?? '',
      address: customer?.address ?? '',
      notes: customer?.notes ?? '',
      isActive: customer?.isActive ?? true,
    },
  })

  const onSubmit = (values: CustomerFormValues) => {
    save.mutate(
      { id: customer?.id, input: values },
      {
        onSuccess: (id) => {
          toast.success(customer ? 'Cliente actualizado.' : 'Cliente registrado.')
          onOpenChange(false)
          onSaved?.(id)
        },
        onError: (error) => toast.error(toUserMessage(error, 'No se pudo guardar el cliente.')),
      },
    )
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !save.isPending && onOpenChange(next)}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{customer ? 'Editar cliente' : 'Nuevo cliente'}</DialogTitle>
          <DialogDescription>Los comerciantes minoristas son la mayoría de los clientes de VIDALID.</DialogDescription>
        </DialogHeader>

        <form id="customer-form" onSubmit={handleSubmit(onSubmit)} noValidate className="grid gap-4 sm:grid-cols-2">
          <FormField label="Nombre del contacto" htmlFor="customer-name" error={errors.name?.message} className="sm:col-span-2">
            <Input id="customer-name" placeholder="María Fernanda Rojas" aria-invalid={!!errors.name} {...register('name')} />
          </FormField>

          <FormField label="Negocio / tienda (opcional)" htmlFor="customer-business" error={errors.businessName?.message}>
            <Input id="customer-business" placeholder="Tienda Natural Vida" aria-invalid={!!errors.businessName} {...register('businessName')} />
          </FormField>

          <FormField label="Tipo de cliente" htmlFor="customer-type" error={errors.customerType?.message}>
            <Controller
              control={control}
              name="customerType"
              render={({ field }) => (
                <SimpleSelect id="customer-type" value={field.value} onChange={(value) => field.onChange(value ?? 'retailer')} options={typeOptions} className="h-8" />
              )}
            />
          </FormField>

          <FormField label="Teléfono / WhatsApp" htmlFor="customer-phone" error={errors.phone?.message} hint="Ej. 70012345 o +591 70012345">
            <Input id="customer-phone" type="tel" inputMode="tel" placeholder="70012345" aria-invalid={!!errors.phone} {...register('phone')} />
          </FormField>

          <FormField label="Dirección (opcional)" htmlFor="customer-address" error={errors.address?.message}>
            <Input id="customer-address" placeholder="Av. Siempre Viva 123, zona central" aria-invalid={!!errors.address} {...register('address')} />
          </FormField>

          <FormField label="Observaciones (opcional)" htmlFor="customer-notes" error={errors.notes?.message} className="sm:col-span-2">
            <Textarea id="customer-notes" rows={3} placeholder="Preferencias, días de compra, productos que suele pedir…" aria-invalid={!!errors.notes} {...register('notes')} />
          </FormField>

          <div className="flex items-center justify-between rounded-lg border p-3 sm:col-span-2">
            <Label htmlFor="customer-active">Cliente activo</Label>
            <Controller
              control={control}
              name="isActive"
              render={({ field }) => <Switch id="customer-active" checked={field.value} onCheckedChange={(checked) => field.onChange(checked)} />}
            />
          </div>
        </form>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={save.isPending}>
            Cancelar
          </Button>
          <Button type="submit" form="customer-form" disabled={save.isPending}>
            {save.isPending && <Loader2 className="animate-spin" />}
            {customer ? 'Guardar cambios' : 'Registrar cliente'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
