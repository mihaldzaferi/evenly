import { ArrowRight, Check, PartyPopper, Pencil } from 'lucide-react'
import { Avatar } from '../../components/Avatar'
import { EmptyState } from '../../components/EmptyState'
import { Money } from '../../components/Money'
import { settleUp, summarize, type MemberSummary } from '../../lib/balances'
import { today } from '../../lib/dates'
import { newId } from '../../lib/ids'
import { memberLookup } from '../../lib/members'
import { formatMoney } from '../../lib/money'
import type { Group, Transfer } from '../../lib/types'
import { toast } from '../../store/toast'
import { useStore } from '../../store/useStore'
import { useGroupContext } from './context'

export function BalancesTab() {
  const { group, openPayment } = useGroupContext()
  const saveSettlement = useStore((s) => s.saveSettlement)
  const deleteSettlement = useStore((s) => s.deleteSettlement)
  const summary = summarize(group)
  const who = memberLookup(group)

  // Payments that involve "you" come first.
  const mine = (t: Transfer) => (t.from === group.meId || t.to === group.meId ? 0 : 1)
  const transfers = settleUp(summary.map((s) => [s.id, s.net])).sort((a, b) => mine(a) - mine(b))

  function markPaid(t: Transfer) {
    const id = newId()
    saveSettlement(group.id, { id, ...t, date: today(), note: 'Settled up' })
    toast(`${who(t.from).member.name} paid ${who(t.to).member.name} ${formatMoney(t.amount, group.currency)}`, {
      label: 'Undo',
      run: () => deleteSettlement(group.id, id),
    })
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
      <section className="card self-start">
        <div className="border-b border-line px-5 py-4">
          <h2 className="font-semibold">Settle up</h2>
          <p className="mt-0.5 text-[13px] text-muted">
            {transfers.length === 0
              ? 'Nobody owes anything.'
              : `${transfers.length} ${transfers.length === 1 ? 'payment settles' : 'payments settle'} everything. That’s the fewest possible.`}
          </p>
        </div>
        {transfers.length === 0 ? (
          <EmptyState icon={PartyPopper} title="Everyone’s square">
            New expenses will show up here as payments to make.
          </EmptyState>
        ) : (
          <ul className="divide-y divide-line">
            {transfers.map((t) => {
              const from = who(t.from)
              const to = who(t.to)
              const involvesMe = t.from === group.meId || t.to === group.meId
              return (
                <li key={`${t.from}-${t.to}`} className={`flex flex-wrap items-center gap-x-3 gap-y-3 px-5 py-3.5 ${involvesMe ? 'bg-accent-soft/50' : ''}`}>
                  <div className="flex min-w-52 flex-1 items-center gap-2">
                    <Avatar name={from.member.name} index={from.index} size={30} />
                    <ArrowRight className="size-4 shrink-0 text-muted" aria-hidden />
                    <Avatar name={to.member.name} index={to.index} size={30} />
                    <div className="ml-1.5 min-w-0">
                      <p className="truncate text-sm">
                        <span className="font-medium">{t.from === group.meId ? 'You' : from.member.name}</span>
                        <span className="text-muted"> {t.from === group.meId ? 'pay' : 'pays'} </span>
                        <span className="font-medium">{t.to === group.meId ? 'you' : to.member.name}</span>
                      </p>
                      <Money amount={t.amount} currency={group.currency} className="text-base font-semibold" />
                    </div>
                  </div>
                  <div className="ml-auto flex items-center gap-1.5">
                    <button
                      className="btn btn-ghost btn-icon size-8"
                      aria-label="Pay a different amount"
                      title="Pay a different amount"
                      onClick={() => openPayment({ prefill: t })}
                    >
                      <Pencil className="size-3.5" />
                    </button>
                    <button className="btn btn-secondary btn-sm" onClick={() => markPaid(t)}>
                      <Check className="size-3.5" /> Mark paid
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <section className="card self-start p-5">
        <h2 className="font-semibold">Balances</h2>
        <p className="mt-0.5 mb-5 text-[13px] text-muted">What each person has paid minus their share.</p>
        <BalanceChart group={group} summary={summary} />
      </section>

      <section className="card overflow-hidden lg:col-span-2">
        <h2 className="border-b border-line px-5 py-4 font-semibold">Breakdown</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="text-left text-[13px] text-muted">
                <th className="px-5 py-2.5 font-medium">Person</th>
                <th className="px-3 py-2.5 text-right font-medium">Paid for</th>
                <th className="px-3 py-2.5 text-right font-medium">Their share</th>
                <th className="px-3 py-2.5 text-right font-medium">Sent</th>
                <th className="px-3 py-2.5 text-right font-medium">Received</th>
                <th className="px-5 py-2.5 text-right font-medium">Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line border-t border-line">
              {summary.map((s) => {
                const { member, index } = who(s.id)
                return (
                  <tr key={s.id}>
                    <td className="px-5 py-3">
                      <span className="flex items-center gap-2.5">
                        <Avatar name={member.name} index={index} size={24} />
                        {member.name}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right"><Money amount={s.paid} currency={group.currency} /></td>
                    <td className="px-3 py-3 text-right"><Money amount={s.share} currency={group.currency} /></td>
                    <td className="px-3 py-3 text-right text-ink-2"><Money amount={s.sent} currency={group.currency} /></td>
                    <td className="px-3 py-3 text-right text-ink-2"><Money amount={s.received} currency={group.currency} /></td>
                    <td className="px-5 py-3 text-right font-semibold">
                      <Money amount={s.net} currency={group.currency} signed tone />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

/**
 * Diverging bars from a centre line: blue to the right for people who get
 * money back, red to the left for people who owe. Every bar is labelled with
 * words as well as colour, so the chart never relies on hue alone.
 */
function BalanceChart({ group, summary }: { group: Group; summary: MemberSummary[] }) {
  const who = memberLookup(group)
  const max = Math.max(1, ...summary.map((s) => Math.abs(s.net)))
  return (
    <ul className="space-y-4">
      {summary.map((s) => {
        const { member, index } = who(s.id)
        const width = `${(Math.abs(s.net) / max) * 100}%`
        const label = s.net === 0 ? 'settled' : `${s.net > 0 ? 'gets back' : 'owes'} ${formatMoney(Math.abs(s.net), group.currency)}`
        return (
          <li key={s.id} className="grid grid-cols-[minmax(0,9.5rem)_1fr] items-center gap-3" title={`${member.name} ${label}`}>
            <span className="flex min-w-0 items-center gap-2.5">
              <Avatar name={member.name} index={index} size={26} />
              <span className="min-w-0">
                <span className="block truncate text-sm">{member.name}</span>
                <span className="num block text-xs whitespace-nowrap text-ink-2">{label}</span>
              </span>
            </span>
            <div className="grid h-5 grid-cols-2">
              <div className="flex justify-end border-r border-line-strong">
                {s.net < 0 && <div className="h-full rounded-l-[4px] bg-neg" style={{ width }} />}
              </div>
              <div className="flex">
                {s.net > 0 && <div className="h-full rounded-r-[4px] bg-pos" style={{ width }} />}
              </div>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
