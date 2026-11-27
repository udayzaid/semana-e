import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'

export interface SelectOption {
  value: string
  label: string
}

interface SimpleSelectProps {
  value: string | null
  onChange: (value: string | null) => void
  options: SelectOption[]
  placeholder?: string
  id?: string
  className?: string
  disabled?: boolean
  invalid?: boolean
  'aria-label'?: string
}

/** Select de una opción con etiquetas (envoltorio del Select de shadcn/Base UI). */
export function SimpleSelect({
  value,
  onChange,
  options,
  placeholder = 'Selecciona…',
  id,
  className,
  disabled,
  invalid,
  'aria-label': ariaLabel,
}: SimpleSelectProps) {
  return (
    <Select
      value={value}
      onValueChange={(next) => onChange((next as string | null) ?? null)}
      items={options}
      disabled={disabled}
    >
      <SelectTrigger id={id} aria-label={ariaLabel} aria-invalid={invalid || undefined} className={cn('h-9 w-full bg-card', className)}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
