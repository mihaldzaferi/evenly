import { useState, type FormEvent } from 'react'
import { normalizePaypal, normalizePhone } from '../lib/payments'
import type { Group, Member } from '../lib/types'
import { toast } from '../store/toast'
import { useStore } from '../store/useStore'

/** Where a member wants to be paid: Vipps number, PayPal.me name, bank account. */
export function PaymentDetailsForm({ group, member, onSaved }: { group: Group; member: Member; onSaved?: () => void }) {
  const updateMember = useStore((s) => s.updateMember)
  const [phone, setPhone] = useState(member.phone ?? '')
  const [paypal, setPaypal] = useState(member.paypal ?? '')
  const [account, setAccount] = useState(member.account ?? '')
  const id = (field: string) => `${member.id}-${field}`

  function submit(e: FormEvent) {
    e.preventDefault()
    updateMember(group.id, member.id, {
      phone: normalizePhone(phone) || undefined,
      paypal: normalizePaypal(paypal) || undefined,
      account: account.trim() || undefined,
    })
    toast(`Saved ${member.name}’s payment details`)
    onSaved?.()
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div>
        <label htmlFor={id('phone')} className="label">
          Mobile number <span className="font-normal text-muted">(for Vipps)</span>
        </label>
        <input
          id={id('phone')}
          className="field num"
          type="tel"
          inputMode="tel"
          autoComplete="off"
          placeholder="123 45 678"
          value={phone}
          maxLength={20}
          onChange={(e) => setPhone(e.target.value)}
        />
      </div>
      <div>
        <label htmlFor={id('paypal')} className="label">
          PayPal.me name
        </label>
        <div className="flex items-center rounded-xl border border-line bg-surface focus-within:border-accent">
          <span className="pl-3 text-sm text-muted">paypal.me/</span>
          <input
            id={id('paypal')}
            className="h-10 w-full min-w-0 bg-transparent pr-3 text-[15px] focus:outline-none sm:text-sm"
            autoComplete="off"
            placeholder="name"
            value={paypal}
            maxLength={60}
            onChange={(e) => setPaypal(e.target.value)}
          />
        </div>
      </div>
      <div>
        <label htmlFor={id('account')} className="label">
          Bank account or IBAN
        </label>
        <input
          id={id('account')}
          className="field num"
          autoComplete="off"
          placeholder="1234 56 78901"
          value={account}
          maxLength={40}
          onChange={(e) => setAccount(e.target.value)}
        />
      </div>
      <button type="submit" className="btn btn-secondary">
        Save details
      </button>
    </form>
  )
}
