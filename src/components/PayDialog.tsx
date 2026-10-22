import { Check, Copy, ExternalLink, Landmark, Pencil, Smartphone, type LucideIcon } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { today } from '../lib/dates'
import { newId } from '../lib/ids'
import { memberLookup } from '../lib/members'
import { amountInputValue, formatMoney, parseAmount } from '../lib/money'
import { formatPhone, paypalLink, plainAmount } from '../lib/payments'
import type { Group, Transfer } from '../lib/types'
import { toast } from '../store/toast'
import { useStore } from '../store/useStore'
import { Avatar } from './Avatar'
import { Modal } from './Modal'
import { PaymentDetailsForm } from './PaymentDetailsForm'

/** Phones and tablets can hand off to the Vipps app; on a computer you pay from your phone. */
const canOpenApps = () => typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches

/**
 * "Pay Ben NOK 54.77": the amount is worked out already. Evenly can't move
 * money itself, so it gets everything ready for Vipps, PayPal or a bank
 * transfer, then records the payment once you've sent it.
 */
export function PayDialog({ group, transfer, onClose }: { group: Group; transfer: Transfer; onClose: () => void }) {
  const saveSettlement = useStore((s) => s.saveSettlement)
  const deleteSettlement = useStore((s) => s.deleteSettlement)
  const who = memberLookup(group)
  const to = who(transfer.to)
  const cur = group.currency
  const [amountText, setAmountText] = useState(amountInputValue(transfer.amount, cur))
  const [editingAmount, setEditingAmount] = useState(false)
  const [method, setMethod] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)
  const [editingDetails, setEditingDetails] = useState(false)
  const [mobile] = useState(canOpenApps)

  const amount = parseAmount(amountText, cur) ?? 0
  const { phone, paypal, account } = to.member
  const name = to.member.name
  const hasDetails = Boolean(phone || paypal || account)

  async function copy(text: string, what: string) {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(what)
      setTimeout(() => setCopied((c) => (c === what ? null : c)), 2000)
    } catch {
      toast('Couldn’t copy. Select the text and copy it by hand.')
    }
  }

  async function payWithVipps() {
    setMethod('Vipps')
    await copy(plainAmount(amount, cur), 'amount')
    // Vipps has no public link that fills in a person and an amount, so open the app and paste.
    if (mobile) window.location.href = 'vipps://'
  }

  function markPaid() {
    const id = newId()
    saveSettlement(group.id, { id, from: transfer.from, to: transfer.to, amount, date: today(), note: method ?? 'Settled up' })
    toast(`Paid ${name} ${formatMoney(amount, cur)}`, { label: 'Undo', run: () => deleteSettlement(group.id, id) })
    onClose()
  }

  const copyButton = (text: string, what: string, label: string, via?: string) => (
    <button
      type="button"
      className="btn btn-ghost btn-sm"
      onClick={() => {
        if (via) setMethod(via)
        void copy(text, what)
      }}
      aria-label={`Copy ${label}`}
    >
      {copied === what ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
      {copied === what ? 'Copied' : `Copy ${label}`}
    </button>
  )

  return (
    <Modal
      open
      onClose={onClose}
      title={`Pay ${name}`}
      footer={
        <>
          <button type="button" className="btn btn-ghost ml-auto" onClick={onClose}>
            Not yet
          </button>
          <button type="button" className="btn btn-primary" onClick={markPaid} disabled={amount <= 0}>
            <Check className="size-4" /> I’ve paid
          </button>
        </>
      }
    >
      <div className="flex flex-col items-center pt-1 pb-5 text-center">
        <Avatar name={name} index={to.index} size={52} />
        <p className="mt-3 text-sm text-ink-2">You owe {name}</p>
        {editingAmount ? (
          <div className="mt-1 flex items-center gap-2">
            <span className="text-muted">{cur}</span>
            <input
              aria-label="Amount to pay"
              className="field num h-11 w-36 text-center text-xl font-semibold"
              inputMode="decimal"
              value={amountText}
              onChange={(e) => setAmountText(e.target.value)}
              autoFocus
            />
          </div>
        ) : (
          <button className="group/amount mt-0.5 flex items-center gap-2" onClick={() => setEditingAmount(true)} aria-label="Change amount">
            <span className="num text-4xl font-semibold tracking-tight">{formatMoney(amount, cur)}</span>
            <Pencil className="size-4 text-muted group-hover/amount:text-ink" />
          </button>
        )}
        <p className="mt-1 text-[13px] text-muted">
          {editingAmount ? 'Paying part of it? Change the amount.' : `Worked out from everything in “${group.name}”`}
        </p>
      </div>

      <ol className="space-y-4">
        <li>
          <Step n={1} title="Send the money" />
          <div className="space-y-2">
            <Method icon={Smartphone} title="Vipps" subtitle={phone ? formatPhone(phone) : `No number for ${name} yet`}>
              {phone ? (
                <>
                  <div className="flex flex-wrap items-center gap-2">
                    <button type="button" className="btn btn-primary" onClick={payWithVipps} disabled={amount <= 0}>
                      {copied === 'amount' ? <Check className="size-4" /> : <Copy className="size-4" />}
                      {mobile ? 'Copy amount & open Vipps' : 'Copy amount'}
                    </button>
                    {copyButton(phone, 'phone', 'number')}
                  </div>
                  <p className="mt-2 text-[13px] text-muted">
                    {mobile ? 'In Vipps' : 'In Vipps on your phone'}, tap <b className="font-medium text-ink-2">Send</b>, pick{' '}
                    {formatPhone(phone)} and paste the amount ({plainAmount(amount, cur)}).
                  </p>
                </>
              ) : (
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setEditingDetails(true)}>
                  Add {name}’s number
                </button>
              )}
            </Method>

            {paypal && (
              <Method icon={ExternalLink} title="PayPal" subtitle={`paypal.me/${paypal}`}>
                <a
                  className="btn btn-secondary"
                  href={paypalLink(paypal, amount, cur)}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setMethod('PayPal')}
                >
                  Pay {formatMoney(amount, cur)} with PayPal
                </a>
                <p className="mt-2 text-[13px] text-muted">Opens PayPal with the amount filled in.</p>
              </Method>
            )}

            {account && (
              <Method icon={Landmark} title="Bank transfer" subtitle={account}>
                <div className="flex flex-wrap gap-2">
                  {copyButton(account.replace(/\s/g, ''), 'account', 'account number', 'Bank transfer')}
                  {copyButton(plainAmount(amount, cur), 'bank-amount', 'amount', 'Bank transfer')}
                </div>
              </Method>
            )}

            {editingDetails ? (
              <div className="rounded-xl border border-line p-4">
                <p className="mb-3 text-sm font-medium">How does {name} want to be paid?</p>
                <PaymentDetailsForm group={group} member={to.member} onSaved={() => setEditingDetails(false)} />
              </div>
            ) : (
              <button type="button" className="text-[13px] font-medium text-accent-text hover:underline" onClick={() => setEditingDetails(true)}>
                {hasDetails ? `Edit ${name}’s payment details` : `Add PayPal or a bank account for ${name}`}
              </button>
            )}
          </div>
        </li>
        <li>
          <Step n={2} title="Mark it as paid" />
          <p className="text-[13px] text-muted">
            Once the money has gone, press <b className="font-medium text-ink-2">I’ve paid</b> so everyone’s balance updates.
          </p>
        </li>
      </ol>
    </Modal>
  )
}

function Step({ n, title }: { n: number; title: string }) {
  return (
    <p className="mb-2 flex items-center gap-2 text-sm font-semibold">
      <span className="grid size-5 place-items-center rounded-full bg-accent-soft text-[11px] text-accent-text">{n}</span>
      {title}
    </p>
  )
}

function Method({
  icon: Icon,
  title,
  subtitle,
  children,
}: {
  icon: LucideIcon
  title: string
  subtitle: string
  children: ReactNode
}) {
  return (
    <div className="rounded-xl border border-line p-4">
      <div className="mb-3 flex items-center gap-2.5">
        <span className="grid size-8 place-items-center rounded-lg bg-surface-2 text-ink-2">
          <Icon className="size-4" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-medium">{title}</p>
          <p className="num truncate text-[13px] text-muted">{subtitle}</p>
        </div>
      </div>
      {children}
    </div>
  )
}
