import { useMemo } from 'react'
import { currencyCodes, currencyName } from '../lib/money'

export function CurrencySelect({
  value,
  onChange,
  id,
  compact = false,
  className = '',
}: {
  value: string
  onChange: (code: string) => void
  id?: string
  compact?: boolean
  className?: string
}) {
  const codes = useMemo(() => currencyCodes(), [])
  return (
    <select id={id} value={value} onChange={(e) => onChange(e.target.value)} className={`field ${className}`}>
      {codes.map((c) => (
        <option key={c} value={c}>
          {compact ? c : `${c} · ${currencyName(c)}`}
        </option>
      ))}
    </select>
  )
}
