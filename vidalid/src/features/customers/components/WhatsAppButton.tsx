import { MessageCircle } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { whatsAppUrl } from '@/lib/whatsapp'

interface WhatsAppButtonProps {
  phone: string | null
  message?: string
  label?: string
  className?: string
}

/** Abre el chat de WhatsApp del cliente en una pestaña nueva. */
export function WhatsAppButton({ phone, message, label, className }: WhatsAppButtonProps) {
  const url = whatsAppUrl(phone, message)
  if (!url) return null
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      title="Abrir WhatsApp"
      aria-label={label ?? 'Abrir chat de WhatsApp'}
      className={cn(buttonVariants({ variant: 'ghost', size: label ? 'sm' : 'icon-sm' }), 'text-[#1f9d55] hover:text-[#1f9d55]', className)}
    >
      <MessageCircle />
      {label}
    </a>
  )
}
