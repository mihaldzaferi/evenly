import { ArrowRight, Check, ChevronDown, CircleCheck, HandCoins, PartyPopper, Plus, Receipt, Send } from 'lucide-react'
import { Link } from 'react-router'
import { Avatar } from '../../components/Avatar'
import { BalanceReceipt } from '../../components/BalanceReceipt'
import { EmptyState } from '../../components/EmptyState'
import { MemberRadio } from '../../components/MemberChip'
import { Money } from '../../components/Money'
import { settleUp, summarize, type MemberSummary } from '../../lib/balances'
import { formatDay, today } from '../../lib/dates'
import { newId } from '../../lib/ids'
import { memberLookup } from '../../lib/members'
import { formatMoney } from '../../lib/money'
import { formatPhone, reminderText } from '../../lib/payments'
import type { Group, Transfer } from '../../lib/types'
import { toast } from '../../store/toast'
import { useStore } from '../../store/useStore'
import { useGroupContext } from './context'

/**
 * The group at a glance, top to bottom:
 * 1. where you stand, with a Pay button per person you owe,
 * 2. payments the rest of the group still needs to make,
 * 3. everyone's balance, 4. payments already made.
 */
export function OverviewTab() {
  const { group, openExpense } = useGroupContext()
  const summary = summarize(group)
  const transfers = settleUp(summary.map((s) => [s.id, s.net]))
  const me = summary.find((s) => s.id === group.meId)

  if (group.expenses.length === 0 && group.settlements.length === 0) {
    return (
      <div className="space-y-6">
        {!me && <WhoAreYou group={group} />}
        <div className="card">
          <EmptyState icon={Receipt} title="Nothing to settle yet">
            <p>Add the first thing someone paid for. Evenly keeps track of who owes whom as you go.</p>
            <button className="btn btn-primary mt-5" onClick={() => openExpense()}>
              <Plus className="size-4" /> Add expense
            </button>
          </EmptyState>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {me ? <YourBalance group={group} me={me} transfers={transfers} /> : <WhoAreYou group={group} />}
      <GroupPayments group={group} transfers={transfers} />
      <Everyone group={group} summary={summary} />
      <PaymentsMade group={group} />
    </div>
  )
}

function WhoAreYou({ group }: { group: Group }) {
  const updateGroup = useStore((s) => s.updateGroup)
  return (
    <section className="card p-5 sm:p-6">
      <h2 className="font-semibold">Which one are you?</h2>
      <p className="mt-0.5 mb-4 text-[13px] text-muted">Pick yourself to see exactly what you owe and what you’re owed.</p>
      <MemberRadio group={group} value={undefined} onChange={(meId) => updateGroup(group.id, { meId })} label="Which one are you?" />
    </section>
  )
}

function YourBalance({ group, me, transfers }: { group: Group; me: MemberSummary; transfers: Transfer[] }) {
  const { openPay } = useGroupContext()
  const updateGroup = useStore((s) => s.updateGroup)
  const who = memberLookup(group)
  const cur = group.currency
  const name = (id: string) => who(id).member.name
  const toPay = transfers.filter((t) => t.from === me.id)
  const toGet = transfers.filter((t) => t.to === me.id)

  return (
    <section className="card overflow-hidden">
      <div className="p-5 sm:p-6">
        <p className="flex items-center gap-2 text-[13px] text-muted">
          Your balance
          <span aria-hidden>·</span>
          <span className="flex items-center gap-1.5 text-ink-2">
            <Avatar name={name(me.id)} index={who(me.id).index} size={18} />
            {name(me.id)}
          </span>
          <button className="text-accent-text hover:underline" onClick={() => updateGroup(group.id, { meId: undefined })}>
            Not you?
          </button>
        </p>
        <h2 className="mt-2 text-3xl font-semibold tracking-tight">
          {me.net < 0 ? (
            <>
              You owe <Money amount={-me.net} currency={cur} className="text-neg-text" />
            </>
          ) : me.net > 0 ? (
            <>
              You’re owed <Money amount={me.net} currency={cur} className="text-pos-text" />
            </>
          ) : (
            <span className="flex items-center gap-2">
              <CircleCheck className="size-7 text-pos-text" /> You’re settled up
            </span>
          )}
        </h2>
        {toPay.length === 0 && toGet.length === 0 && <p className="mt-2 text-[15px] text-ink-2">Nothing left for you to pay or collect.</p>}
      </div>

      {toPay.length > 0 && (
        <div className="border-t border-line">
          <h3 className="px-5 pt-4 text-[13px] font-medium text-ink-2 sm:px-6">You need to pay</h3>
          <ul className="divide-y divide-line">
            {toPay.map((t) => {
              const { member, index } = who(t.to)
              return (
                <li key={t.to} className="flex items-center gap-3 px-5 py-3.5 sm:px-6">
                  <Avatar name={member.name} index={index} size={40} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{member.name}</p>
                    <p className="num truncate text-[13px] text-muted">
                      {member.phone ? `Vipps ${formatPhone(member.phone)}` : member.paypal ? 'PayPal' : member.account ? 'Bank transfer' : 'No details yet'}
                    </p>
                  </div>
                  <Money amount={t.amount} currency={cur} className="text-lg font-semibold" />
                  <button className="btn btn-primary min-w-20" onClick={() => openPay(t)} aria-label={`Pay ${member.name} ${formatMoney(t.amount, cur)}`}>
                    Pay
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      )}

      {toGet.length > 0 && (
        <div className="border-t border-line">
          <h3 className="px-5 pt-4 text-[13px] font-medium text-ink-2 sm:px-6">Waiting for</h3>
          <ul className="divide-y divide-line">
            {toGet.map((t) => (
              <IncomingRow key={t.from} group={group} transfer={t} />
            ))}
          </ul>
        </div>
      )}

      <details className="group/how border-t border-line">
        <summary className="flex list-none items-center justify-between px-5 py-3 text-[13px] font-medium text-accent-text hover:bg-surface-2/60 sm:px-6 [&::-webkit-details-marker]:hidden">
          How is this worked out?
          <ChevronDown className="size-4 transition-transform group-open/how:rotate-180" aria-hidden />
        </summary>
        <div className="px-5 pb-5 sm:px-6">
          <div className="max-w-sm rounded-xl bg-surface-2/70 p-4">
            <BalanceReceipt
              summary={me}
              currency={cur}
              you
              paidLink={(children) => (
                <Link to={`expenses?paidBy=${me.id}`} className="underline decoration-line-strong underline-offset-2 hover:decoration-ink">
                  {children}
                </Link>
              )}
            />
          </div>
        </div>
      </details>
    </section>
  )
}

/** Someone who owes you: nudge them, or tick it off when the money arrives. */
function IncomingRow({ group, transfer: t }: { group: Group; transfer: Transfer }) {
  const saveSettlement = useStore((s) => s.saveSettlement)
  const deleteSettlement = useStore((s) => s.deleteSettlement)
  const who = memberLookup(group)
  const { member, index } = who(t.from)
  const cur = group.currency

  async function remind() {
    const text = reminderText({
      to: member.name,
      groupName: group.name,
      amount: t.amount,
      currency: cur,
      myPhone: group.members.find((m) => m.id === group.meId)?.phone,
    })
    if (navigator.share) {
      // Cancelling the share sheet rejects; that's fine.
      await navigator.share({ text }).catch(() => {})
    } else {
      await navigator.clipboard.writeText(text)
      toast('Reminder copied. Paste it into a message.')
    }
  }

  function markReceived() {
    const id = newId()
    saveSettlement(group.id, { id, ...t, date: today(), note: 'Settled up' })
    toast(`${member.name} paid you ${formatMoney(t.amount, cur)}`, { label: 'Undo', run: () => deleteSettlement(group.id, id) })
  }

  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-2 px-5 py-3.5 sm:px-6">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <Avatar name={member.name} index={index} size={40} />
        <div className="min-w-0">
          <p className="truncate font-medium">{member.name}</p>
          <p className="text-[13px] text-muted">owes you</p>
        </div>
      </div>
      <Money amount={t.amount} currency={cur} className="text-lg font-semibold" />
      <div className="flex w-full justify-end gap-1.5 sm:w-auto">
        <button className="btn btn-ghost btn-sm" onClick={remind}>
          <Send className="size-3.5" /> Remind
        </button>
        <button className="btn btn-secondary btn-sm" onClick={markReceived}>
          <Check className="size-3.5" /> Mark received
        </button>
      </div>
    </li>
  )
}

/** Payments the rest of the group still has to make, plus overall progress. */
function GroupPayments({ group, transfers }: { group: Group; transfers: Transfer[] }) {
  const cur = group.currency
  const knowsMe = group.members.some((m) => m.id === group.meId)
  const listed = knowsMe ? transfers.filter((t) => !isMine(group, t)) : transfers
  const left = transfers.reduce((sum, t) => sum + t.amount, 0)
  const paidBack = group.settlements.reduce((sum, s) => sum + s.amount, 0)
  const progress = paidBack + left > 0 ? paidBack / (paidBack + left) : 1

  return (
    <section className="card overflow-hidden">
      <div className="px-5 pt-5 pb-4 sm:px-6">
        <div className="flex flex-col gap-x-3 gap-y-0.5 sm:flex-row sm:items-baseline sm:justify-between">
          <h2 className="font-semibold">{knowsMe ? 'Payments between others' : 'Payments needed'}</h2>
          {transfers.length > 0 && (
            <p className="text-[13px] text-muted">
              {transfers.length} left in the group · <Money amount={left} currency={cur} />
            </p>
          )}
        </div>
        {paidBack > 0 && (
          <div className="mt-3">
            <div className="h-2 overflow-hidden rounded-full bg-accent-soft" role="meter" aria-valuenow={Math.round(progress * 100)} aria-valuemin={0} aria-valuemax={100} aria-label="Paid back so far">
              <div className="h-full rounded-full bg-accent" style={{ width: `${progress * 100}%` }} />
            </div>
            <p className="mt-1.5 text-[13px] text-muted">
              {formatMoney(paidBack, cur)} paid back so far
              {left > 0 ? `, ${formatMoney(left, cur)} to go` : '. All done!'}
            </p>
          </div>
        )}
      </div>

      {transfers.length === 0 ? (
        <div className="border-t border-line">
          <EmptyState icon={PartyPopper} title="Everyone’s settled up">
            Nobody owes anything right now. New expenses will show up here as payments to make.
          </EmptyState>
        </div>
      ) : listed.length === 0 ? (
        <p className="border-t border-line px-5 py-4 text-sm text-muted sm:px-6">Everyone else is settled up. Only your payments are left.</p>
      ) : (
        <>
          <ul className="divide-y divide-line border-t border-line">
            {listed.map((t) => (
              <TransferRow key={`${t.from}-${t.to}`} group={group} transfer={t} />
            ))}
          </ul>
          <p className="border-t border-line px-5 py-3 text-[13px] text-muted sm:px-6">
            Debts are combined so the group needs as few payments as possible.
          </p>
        </>
      )}
    </section>
  )
}

const isMine = (group: Group, t: Transfer) => t.from === group.meId || t.to === group.meId

function TransferRow({ group, transfer: t }: { group: Group; transfer: Transfer }) {
  const { openPayment } = useGroupContext()
  const saveSettlement = useStore((s) => s.saveSettlement)
  const deleteSettlement = useStore((s) => s.deleteSettlement)
  const who = memberLookup(group)
  const from = who(t.from)
  const to = who(t.to)
  const youPay = t.from === group.meId
  const youGet = t.to === group.meId

  function markPaid() {
    const id = newId()
    saveSettlement(group.id, { id, ...t, date: today(), note: 'Settled up' })
    toast(`Recorded: ${from.member.name} paid ${to.member.name} ${formatMoney(t.amount, group.currency)}`, {
      label: 'Undo',
      run: () => deleteSettlement(group.id, id),
    })
  }

  return (
    <li className={`flex flex-wrap items-center gap-x-3 gap-y-3 px-5 py-3.5 sm:px-6 ${youPay || youGet ? 'bg-accent-soft/50' : ''}`}>
      <div className="flex min-w-52 flex-1 items-center gap-2">
        <Avatar name={from.member.name} index={from.index} size={30} />
        <ArrowRight className="size-4 shrink-0 text-muted" aria-hidden />
        <Avatar name={to.member.name} index={to.index} size={30} />
        <div className="ml-1.5 min-w-0">
          <p className="truncate text-sm">
            <span className="font-medium">{youPay ? 'You' : from.member.name}</span>
            <span className="text-muted"> {youPay ? 'pay' : 'pays'} </span>
            <span className="font-medium">{youGet ? 'you' : to.member.name}</span>
          </p>
          <Money amount={t.amount} currency={group.currency} className="text-base font-semibold" />
        </div>
      </div>
      <div className="ml-auto flex items-center gap-1.5">
        <button className="btn btn-ghost btn-sm" onClick={() => openPayment({ prefill: t })}>
          Other amount
        </button>
        <button className={`btn btn-sm ${youPay || youGet ? 'btn-primary' : 'btn-secondary'}`} onClick={markPaid}>
          <Check className="size-3.5" /> {youGet ? 'Mark received' : 'Mark as paid'}
        </button>
      </div>
    </li>
  )
}

function Everyone({ group, summary }: { group: Group; summary: MemberSummary[] }) {
  const who = memberLookup(group)
  return (
    <section className="card overflow-hidden">
      <div className="px-5 pt-5 pb-4 sm:px-6">
        <h2 className="font-semibold">Everyone’s balance</h2>
        <p className="mt-0.5 text-[13px] text-muted">What each person paid, minus their share. Tap someone to see how it adds up.</p>
      </div>
      <ul className="divide-y divide-line border-t border-line">
        {summary.map((s) => {
          const { member, index } = who(s.id)
          const you = s.id === group.meId
          return (
            <li key={s.id}>
              <details className="group/person">
                <summary className="flex list-none items-center gap-3 px-5 py-3 hover:bg-surface-2/60 sm:px-6 [&::-webkit-details-marker]:hidden">
                  <Avatar name={member.name} index={index} size={32} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">
                      {member.name}
                      {you && <span className="font-normal text-muted"> (you)</span>}
                    </span>
                    <span className="block truncate text-[13px] text-muted">
                      paid {formatMoney(s.paid, group.currency)} · share {formatMoney(s.share, group.currency)}
                    </span>
                  </span>
                  <StatusPill net={s.net} currency={group.currency} />
                  <ChevronDown className="size-4 shrink-0 text-muted transition-transform group-open/person:rotate-180" aria-hidden />
                </summary>
                <div className="bg-surface-2/50 px-5 py-3 sm:px-6 sm:pl-[68px]">
                  <div className="max-w-sm">
                    <BalanceReceipt summary={s} currency={group.currency} you={you} />
                  </div>
                </div>
              </details>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

function StatusPill({ net, currency }: { net: number; currency: string }) {
  if (net === 0) {
    return (
      <span className="flex shrink-0 items-center gap-1 text-[13px] text-muted">
        <Check className="size-3.5" /> settled
      </span>
    )
  }
  return (
    <span className="shrink-0 text-right">
      <span className="block text-[11px] tracking-wide text-muted uppercase">{net > 0 ? 'is owed' : 'owes'}</span>
      <Money amount={Math.abs(net)} currency={currency} className={`text-sm font-semibold ${net > 0 ? 'text-pos-text' : 'text-neg-text'}`} />
    </span>
  )
}

function PaymentsMade({ group }: { group: Group }) {
  const { openPayment } = useGroupContext()
  const who = memberLookup(group)
  const payments = [...group.settlements].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt)

  return (
    <section className="card overflow-hidden">
      <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-4 sm:px-6">
        <div>
          <h2 className="font-semibold">Payments made</h2>
          <p className="mt-0.5 text-[13px] text-muted">Money people have already paid back to each other.</p>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={() => openPayment()}>
          <HandCoins className="size-3.5" /> Record
        </button>
      </div>
      {payments.length === 0 ? (
        <p className="border-t border-line px-5 py-6 text-center text-sm text-muted sm:px-6">
          None yet. When someone pays, press <span className="font-medium text-ink-2">Mark as paid</span> above.
        </p>
      ) : (
        <ul className="divide-y divide-line border-t border-line">
          {payments.map((p) => {
            const from = who(p.from).member.name
            const to = who(p.to).member.name
            return (
              <li key={p.id}>
                <button
                  onClick={() => openPayment({ settlement: p })}
                  className="flex w-full items-center gap-3 px-5 py-3 text-left hover:bg-surface-2/60 sm:px-6"
                >
                  <span className="grid size-8 shrink-0 place-items-center rounded-full bg-accent-soft text-accent-text">
                    <Check className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm">
                      <span className="font-medium">{p.from === group.meId ? 'You' : from}</span>
                      <span className="text-muted"> paid </span>
                      <span className="font-medium">{p.to === group.meId ? 'you' : to}</span>
                    </span>
                    <span className="block truncate text-[13px] text-muted">
                      {formatDay(p.date)}
                      {p.note && ` · ${p.note}`}
                    </span>
                  </span>
                  <Money amount={p.amount} currency={group.currency} className="shrink-0 text-sm font-medium" />
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
