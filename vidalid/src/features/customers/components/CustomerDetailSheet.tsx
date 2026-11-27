import { zodResolver } from '@hookform/resolvers/zod'
import { format, formatDistanceToNow, isBefore, parseISO, startOfToday } from 'date-fns'
import { es } from 'date-fns/locale'
import { CalendarClock, Check, Loader2, MapPin, Pencil, Phone, Trash2, Undo2 } from 'lucide-react'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { FormField } from '@/components/shared/FormField'
import { SimpleSelect } from '@/components/shared/SimpleSelect'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { toUserMessage } from '@/lib/errors'
import { cn, formatBolivianos } from '@/lib/utils'
import { useAddInteraction, useCustomer, useCustomerSales, useDeleteInteraction, useInteractions, useToggleInteraction } from '../hooks/useCustomers'
import { interactionSchema, type InteractionFormInput, type InteractionFormValues } from '../schemas/customer.schema'
import { customerTypeLabels, interactionLabels, type CustomerSummary, type Interaction } from '../types'
import { WhatsAppButton } from './WhatsAppButton'

const interactionOptions = Object.entries(interactionLabels).map(([value, label]) => ({ value, label }))

interface CustomerDetailSheetProps {
  customerId: string | null
  onOpenChange: (open: boolean) => void
  onEdit: (customer: CustomerSummary) => void
}

/** Ficha del cliente: datos, estadísticas (RF-32), historial de compras (RF-31) y seguimientos (RF-35). */
export function CustomerDetailSheet({ customerId, onOpenChange, onEdit }: CustomerDetailSheetProps) {
  const customer = useCustomer(customerId)
  const sales = useCustomerSales(customerId)
  const c = customer.data

  return (
    <Sheet open={!!customerId} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-xl">
        <SheetHeader className="border-b">
          {customer.isLoading || !c ? (
            <Skeleton className="h-6 w-48" />
          ) : (
            <>
              <SheetTitle className="font-heading text-lg">{c.name}</SheetTitle>
              <SheetDescription>
                {c.businessName ? `${c.businessName} · ` : ''}
                {customerTypeLabels[c.customerType]}
                {!c.isActive && ' · Inactivo'}
              </SheetDescription>
            </>
          )}
        </SheetHeader>

        {c && (
          <div className="space-y-6 p-4">
            {/* Contacto */}
            <section className="space-y-2 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                {c.phone && (
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <Phone className="size-4" /> {c.phone}
                  </span>
                )}
                <WhatsAppButton phone={c.phone} label="WhatsApp" message={`Hola ${c.name.split(' ')[0]}, le saludamos de VIDALID.`} />
                <Button variant="outline" size="sm" className="ml-auto" onClick={() => onEdit(c)}>
                  <Pencil /> Editar
                </Button>
              </div>
              {c.address && (
                <p className="flex items-start gap-1.5 text-muted-foreground">
                  <MapPin className="mt-0.5 size-4 shrink-0" /> {c.address}
                </p>
              )}
              {c.notes && <p className="rounded-lg bg-muted/50 p-3 text-muted-foreground">{c.notes}</p>}
            </section>

            {/* Estadísticas */}
            <section className="grid grid-cols-2 gap-3">
              <Stat label="Compras" value={String(c.purchaseCount)} />
              <Stat label="Total comprado" value={formatBolivianos(c.totalSpent)} />
              <Stat label="Ticket promedio" value={c.purchaseCount ? formatBolivianos(c.totalSpent / c.purchaseCount) : '—'} />
              <Stat
                label="Frecuencia"
                value={c.avgDaysBetweenPurchases !== null ? `cada ${Math.round(c.avgDaysBetweenPurchases)} días` : '—'}
                hint={c.lastPurchaseAt ? `Última: ${formatDistanceToNow(parseISO(c.lastPurchaseAt), { locale: es, addSuffix: true })}` : 'Sin compras aún'}
              />
            </section>

            {/* Historial de compras */}
            <section>
              <h3 className="mb-2 text-sm font-semibold">Historial de compras</h3>
              {sales.isLoading ? (
                <Skeleton className="h-16 w-full" />
              ) : sales.data?.length ? (
                <ul className="divide-y rounded-lg border">
                  {sales.data.map((sale) => (
                    <li key={sale.id} className={cn('flex items-center justify-between gap-3 px-3 py-2 text-sm', sale.status === 'voided' && 'opacity-60')}>
                      <div>
                        <p className="font-medium">
                          {sale.code}
                          {sale.status === 'voided' && <span className="ml-2 text-xs font-semibold text-destructive">Anulada</span>}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(parseISO(sale.createdAt), 'dd/MM/yyyy HH:mm')} · {sale.itemCount} unidades
                        </p>
                      </div>
                      <span className={cn('font-semibold tabular-nums', sale.status === 'voided' && 'line-through')}>{formatBolivianos(sale.total)}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">Este cliente aún no tiene compras registradas.</p>
              )}
            </section>

            {/* Seguimientos */}
            <InteractionsSection customerId={c.id} />
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-lg border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-0.5 font-heading text-lg font-bold tabular-nums">{value}</p>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}

function InteractionsSection({ customerId }: { customerId: string }) {
  const interactions = useInteractions(customerId)
  const add = useAddInteraction()
  const toggle = useToggleInteraction()
  const remove = useDeleteInteraction()
  const [formKey, setFormKey] = useState(0)

  const onError = (error: unknown) => toast.error(toUserMessage(error))

  return (
    <section>
      <h3 className="mb-2 text-sm font-semibold">Consultas y seguimientos</h3>

      <InteractionForm
        key={formKey}
        loading={add.isPending}
        onSubmit={(values) =>
          add.mutate(
            { customerId, ...values },
            {
              onSuccess: () => {
                toast.success('Registro agregado.')
                setFormKey((key) => key + 1)
              },
              onError,
            },
          )
        }
      />

      <div className="mt-4 space-y-2">
        {interactions.isLoading && <Skeleton className="h-14 w-full" />}
        {interactions.data?.length === 0 && <p className="text-center text-sm text-muted-foreground">Sin registros todavía.</p>}
        {interactions.data?.map((item) => (
          <InteractionItem
            key={item.id}
            item={item}
            busy={toggle.isPending || remove.isPending}
            onToggle={() => toggle.mutate({ id: item.id, completed: !item.completed }, { onError })}
            onDelete={() => remove.mutate(item.id, { onSuccess: () => toast.success('Registro eliminado.'), onError })}
          />
        ))}
      </div>
    </section>
  )
}

function InteractionForm({ onSubmit, loading }: { onSubmit: (values: InteractionFormValues) => void; loading: boolean }) {
  const [today] = useState(() => format(new Date(), 'yyyy-MM-dd'))
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<InteractionFormInput, unknown, InteractionFormValues>({
    resolver: zodResolver(interactionSchema),
    defaultValues: { type: 'whatsapp', notes: '', followUpAt: '' },
  })

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-3 rounded-lg border bg-muted/30 p-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <FormField label="Tipo" htmlFor="interaction-type">
          <Controller
            control={control}
            name="type"
            render={({ field }) => (
              <SimpleSelect id="interaction-type" value={field.value} onChange={(value) => field.onChange(value ?? 'note')} options={interactionOptions} className="h-8" />
            )}
          />
        </FormField>
        <FormField label="Volver a contactar (opcional)" htmlFor="interaction-follow">
          <Input id="interaction-follow" type="date" min={today} className="bg-card" {...register('followUpAt')} />
        </FormField>
      </div>
      <FormField label="Detalle" htmlFor="interaction-notes" error={errors.notes?.message}>
        <Textarea id="interaction-notes" rows={2} className="bg-card" placeholder="Consultó precio de Omega 3 por mayor…" aria-invalid={!!errors.notes} {...register('notes')} />
      </FormField>
      <Button type="submit" size="sm" disabled={loading}>
        {loading && <Loader2 className="animate-spin" />}
        Agregar registro
      </Button>
    </form>
  )
}

function InteractionItem({ item, busy, onToggle, onDelete }: { item: Interaction; busy: boolean; onToggle: () => void; onDelete: () => void }) {
  const overdue = item.followUpAt && !item.completed && isBefore(parseISO(item.followUpAt), startOfToday())

  return (
    <div className={cn('rounded-lg border p-3 text-sm', item.completed && 'bg-muted/30')}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">{interactionLabels[item.type]}</span> · {format(parseISO(item.createdAt), 'dd/MM/yyyy HH:mm')}
            {item.authorName && ` · ${item.authorName}`}
          </p>
          <p className={cn('mt-1 whitespace-pre-line', item.completed && 'text-muted-foreground')}>{item.notes}</p>
          {item.followUpAt && (
            <p className={cn('mt-1.5 flex items-center gap-1 text-xs', item.completed ? 'text-muted-foreground line-through' : overdue ? 'font-semibold text-destructive' : 'font-semibold text-warning')}>
              <CalendarClock className="size-3.5" />
              Volver a contactar: {format(parseISO(item.followUpAt), 'dd/MM/yyyy')}
              {overdue && ' (atrasado)'}
            </p>
          )}
        </div>
        <div className="flex shrink-0 gap-1">
          {item.followUpAt && (
            <Button variant="ghost" size="icon-sm" disabled={busy} onClick={onToggle} title={item.completed ? 'Marcar como pendiente' : 'Marcar como hecho'} aria-label={item.completed ? 'Marcar como pendiente' : 'Marcar como hecho'}>
              {item.completed ? <Undo2 /> : <Check className="text-success" />}
            </Button>
          )}
          <Button variant="ghost" size="icon-sm" disabled={busy} onClick={onDelete} title="Eliminar" aria-label="Eliminar registro">
            <Trash2 className="text-destructive" />
          </Button>
        </div>
      </div>
    </div>
  )
}
