import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { BrandLogo } from '@/components/shared/BrandLogo'
import { cn, formatBolivianos } from '@/lib/utils'
import { paymentLabels, type SaleDetail } from '../types'

/**
 * RF-44 · Comprobante interno de venta (no válido como factura).
 * Diseñado para hoja A4/carta con los colores de marca; en pantalla se adapta al ancho.
 */
export function SaleReceipt({ sale, className }: { sale: SaleDetail; className?: string }) {
  const voided = sale.status === 'voided'
  const date = parseISO(sale.createdAt)

  return (
    <article className={cn('relative w-full bg-white text-[13px] leading-relaxed text-[#26351a] [print-color-adjust:exact]', className)}>
      {voided && (
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <span className="-rotate-12 rounded-lg border-4 border-[#b9412f]/60 px-6 py-2 text-4xl font-extrabold tracking-widest text-[#b9412f]/60">ANULADA</span>
        </div>
      )}

      {/* Encabezado */}
      <header className="flex flex-wrap items-start justify-between gap-4 border-b-4 border-[#678c30] pb-4">
        <div>
          <BrandLogo className="h-12" />
          <p className="mt-1 pl-0.5 text-[10px] font-semibold tracking-[0.25em] text-[#678c30]">PRODUCTOS NATURALES</p>
        </div>
        <div className="rounded-lg bg-[#eef3e3] px-4 py-2 text-right">
          <p className="text-[10px] font-bold tracking-[0.15em] text-[#3f5a1d]">COMPROBANTE INTERNO</p>
          <p className="font-heading text-xl font-extrabold text-[#3f5a1d]">{sale.code}</p>
          <p className="text-xs text-[#66705c]">{format(date, "d 'de' MMMM 'de' yyyy · HH:mm", { locale: es })}</p>
        </div>
      </header>

      {/* Cliente y atención */}
      <section className="grid gap-4 py-4 sm:grid-cols-2">
        <div>
          <p className="text-[10px] font-bold tracking-[0.15em] text-[#678c30]">CLIENTE</p>
          <p className="font-semibold">{sale.customer?.name ?? 'Cliente ocasional'}</p>
          {sale.customer?.businessName && <p>{sale.customer.businessName}</p>}
          {sale.customer?.phone && <p className="text-[#66705c]">Tel.: {sale.customer.phone}</p>}
          {sale.customer?.address && <p className="text-[#66705c]">{sale.customer.address}</p>}
        </div>
        <div className="sm:text-right">
          <p className="text-[10px] font-bold tracking-[0.15em] text-[#678c30]">ATENDIDO POR</p>
          <p className="font-semibold">{sale.sellerName ?? '—'}</p>
          {voided && sale.voidedAt && (
            <p className="mt-1 font-semibold text-[#b9412f]">Anulada el {format(parseISO(sale.voidedAt), 'dd/MM/yyyy HH:mm')}</p>
          )}
        </div>
      </section>

      {/* Detalle */}
      <table className="w-full border-collapse text-left">
        <thead>
          <tr className="bg-[#3f5a1d] text-[11px] tracking-wide text-white">
            <th className="rounded-l-md px-3 py-2 font-semibold">PRODUCTO</th>
            <th className="px-3 py-2 text-right font-semibold">CANT.</th>
            <th className="px-3 py-2 text-right font-semibold">P. UNIT.</th>
            <th className="rounded-r-md px-3 py-2 text-right font-semibold">IMPORTE</th>
          </tr>
        </thead>
        <tbody>
          {sale.lines.map((line, index) => (
            <tr key={line.productId} className={index % 2 ? 'bg-[#f7f8f1]' : undefined}>
              <td className="px-3 py-2">
                <p className="font-medium">{line.name}</p>
                <p className="text-[11px] text-[#66705c]">
                  {line.sku}
                  {line.lots.length > 0 && ` · Lote ${line.lots.join(', ')}`}
                </p>
              </td>
              <td className="px-3 py-2 text-right tabular-nums">
                {line.quantity} <span className="text-[11px] text-[#66705c]">{line.unit}</span>
              </td>
              <td className="px-3 py-2 text-right whitespace-nowrap tabular-nums">{formatBolivianos(line.unitPrice)}</td>
              <td className="px-3 py-2 text-right font-semibold whitespace-nowrap tabular-nums">{formatBolivianos(line.total)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totales y pagos */}
      <section className="mt-4 flex flex-wrap items-start justify-between gap-6 border-t border-[#e2e6dc] pt-4">
        <div className="min-w-48">
          <p className="text-[10px] font-bold tracking-[0.15em] text-[#678c30]">FORMA DE PAGO</p>
          {sale.payments.length === 0 ? (
            <p>Sin cobro</p>
          ) : (
            sale.payments.map((payment, index) => (
              <p key={index}>
                {paymentLabels[payment.method]}: <span className="font-semibold tabular-nums">{formatBolivianos(payment.amount)}</span>
                {payment.reference && <span className="text-[#66705c]"> · Ref. {payment.reference}</span>}
              </p>
            ))
          )}
          {sale.notes && <p className="mt-2 text-[#66705c]">Obs.: {sale.notes}</p>}
        </div>
        <dl className="ml-auto w-full max-w-64 space-y-1">
          <div className="flex justify-between">
            <dt className="text-[#66705c]">Subtotal</dt>
            <dd className="tabular-nums">{formatBolivianos(sale.subtotal)}</dd>
          </div>
          {sale.discount > 0 && (
            <div className="flex justify-between">
              <dt className="text-[#66705c]">Descuento</dt>
              <dd className="tabular-nums">- {formatBolivianos(sale.discount)}</dd>
            </div>
          )}
          <div className="flex items-baseline justify-between rounded-md bg-[#678c30] px-3 py-2 text-white">
            <dt className="font-semibold">TOTAL</dt>
            <dd className="font-heading text-lg font-extrabold tabular-nums">{formatBolivianos(sale.total)}</dd>
          </div>
        </dl>
      </section>

      <footer className="mt-8 border-t border-dashed border-[#b5cc8e] pt-3 text-center text-[11px] text-[#66705c]">
        <p className="font-semibold text-[#3f5a1d]">¡Gracias por elegir productos naturales Vidalid!</p>
        <p>Documento interno de control · No válido como factura</p>
      </footer>
    </article>
  )
}
