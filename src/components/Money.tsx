import { formatMoney } from '../lib/money'

/** A formatted amount. `tone` colours it by sign: blue when owed, red when owing. */
export function Money({
  amount,
  currency,
  signed = false,
  tone = false,
  className = '',
}: {
  amount: number
  currency: string
  signed?: boolean
  tone?: boolean
  className?: string
}) {
  const color = !tone || amount === 0 ? '' : amount > 0 ? 'text-pos-text' : 'text-neg-text'
  return <span className={`num ${color} ${className}`}>{formatMoney(amount, currency, { signed })}</span>
}
