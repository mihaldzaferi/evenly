import type { ReactNode } from 'react'
import type { MemberSummary } from '../lib/balances'
import { Money } from './Money'

/**
 * How a balance is worked out, written like a receipt:
 * paid − share + paid back − received = balance.
 */
export function BalanceReceipt({
  summary: s,
  currency,
  you = false,
  paidLink,
}: {
  summary: MemberSummary
  currency: string
  you?: boolean
  /** Optional wrapper that turns the "paid" amount into a link to those expenses. */
  paidLink?: (children: ReactNode) => ReactNode
}) {
  const paid = <Money amount={s.paid} currency={currency} />
  const rows: { sign: string; label: string; value: ReactNode }[] = [
    { sign: '', label: you ? 'You paid for the group' : 'Paid for the group', value: paidLink ? paidLink(paid) : paid },
    { sign: '−', label: you ? 'Your share of the costs' : 'Their share of the costs', value: <Money amount={s.share} currency={currency} /> },
  ]
  if (s.sent) rows.push({ sign: '+', label: you ? 'You paid back' : 'Paid back', value: <Money amount={s.sent} currency={currency} /> })
  if (s.received) rows.push({ sign: '−', label: you ? 'You were paid back' : 'Was paid back', value: <Money amount={s.received} currency={currency} /> })

  const total =
    s.net > 0 ? (you ? 'You’re owed' : 'Is owed') : s.net < 0 ? (you ? 'You owe' : 'Owes') : 'Settled up'

  return (
    <dl className="text-sm">
      {rows.map((r) => (
        <div key={r.label} className="flex items-baseline gap-2 py-1">
          <span className="w-3 text-muted" aria-hidden>
            {r.sign}
          </span>
          <dt className="flex-1 text-ink-2">{r.label}</dt>
          <dd className="whitespace-nowrap">{r.value}</dd>
        </div>
      ))}
      <div className="mt-1 flex items-baseline gap-2 border-t border-line pt-2 font-semibold">
        <span className="w-3 text-muted" aria-hidden>
          =
        </span>
        <dt className="flex-1">{total}</dt>
        <dd>
          <Money amount={Math.abs(s.net)} currency={currency} className={s.net > 0 ? 'text-pos-text' : s.net < 0 ? 'text-neg-text' : ''} />
        </dd>
      </div>
    </dl>
  )
}
