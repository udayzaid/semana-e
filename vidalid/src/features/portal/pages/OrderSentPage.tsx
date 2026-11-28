import { CheckCircle2, MessageCircle } from 'lucide-react'
import { Link, Navigate, useLocation } from 'react-router-dom'
import { buttonVariants } from '@/components/ui/button'
import { formatBolivianos } from '@/lib/utils'
import { vidalidWhatsAppUrl } from '../config'

interface OrderSummary {
  code: string
  name: string
  total: number
  mode: 'pickup' | 'delivery'
  items: string[]
}

/** Confirmación de la solicitud con el código y acceso directo a WhatsApp. */
export function OrderSentPage() {
  const summary = useLocation().state as OrderSummary | null
  if (!summary?.code) return <Navigate to="/" replace />

  const message = [
    `Hola Vidalid, soy ${summary.name}. Acabo de enviar el pedido ${summary.code}:`,
    ...summary.items.map((item) => `• ${item}`),
    `Total estimado: ${formatBolivianos(summary.total)}`,
    summary.mode === 'pickup' ? 'Lo recogeré en el almacén.' : 'Lo necesito con envío a domicilio.',
  ].join('\n')
  const whatsapp = vidalidWhatsAppUrl(message)

  return (
    <div className="mx-auto max-w-xl px-4 py-16 text-center">
      <span className="mx-auto grid size-16 place-items-center rounded-full bg-success/10 text-success">
        <CheckCircle2 className="size-9" />
      </span>
      <h1 className="mt-4 font-heading text-3xl font-bold">¡Pedido enviado!</h1>
      <p className="mt-2 text-muted-foreground">Gracias, {summary.name.split(' ')[0]}. Te contactaremos pronto para confirmar disponibilidad, pago y entrega.</p>

      <div className="mt-6 rounded-2xl border bg-card p-5 text-left">
        <p className="text-xs font-semibold tracking-[0.15em] text-brand">CÓDIGO DE TU PEDIDO</p>
        <p className="font-heading text-2xl font-extrabold text-brand-dark">{summary.code}</p>
        <ul className="mt-3 space-y-1 text-sm">
          {summary.items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <p className="mt-3 border-t pt-3 text-sm">
          Total estimado: <span className="font-semibold tabular-nums">{formatBolivianos(summary.total)}</span> · {summary.mode === 'pickup' ? 'Recojo en almacén' : 'Envío a domicilio'}
        </p>
      </div>

      <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
        {whatsapp && (
          <a href={whatsapp} target="_blank" rel="noopener noreferrer" className={buttonVariants({ size: 'lg', className: 'h-12 bg-[#1f9d55] px-6 text-base hover:bg-[#1f9d55]/90' })}>
            <MessageCircle /> Avisar por WhatsApp
          </a>
        )}
        <Link to="/" className={buttonVariants({ size: 'lg', variant: 'outline', className: 'h-12 px-6 text-base' })}>
          Seguir viendo productos
        </Link>
      </div>
    </div>
  )
}
