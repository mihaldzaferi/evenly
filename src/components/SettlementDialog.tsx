import { ArrowDown, Trash2 } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { today } from '../lib/dates'
import { newId } from '../lib/ids'
import { amountInputValue, parseAmount } from '../lib/money'
import type { Group, Settlement, Transfer } from '../lib/types'
import { toast } from '../store/toast'
import { useStore } from '../store/useStore'
import { MemberRadio } from './MemberChip'
import { Modal } from './Modal'

/** Record (or edit) a repayment between two members. `prefill` comes from a settle-up suggestion. */
export function SettlementDialog({
  group,
  settlement,
  prefill,
  onClose,
}: {
  group: Group
  settlement?: Settlement
  prefill?: Transfer
  onClose: () => void
}) {
  const saveSettlement = useStore((s) => s.saveSettlement)
  const deleteSettlement = useStore((s) => s.deleteSettlement)
  const start = settlement ?? prefill
  const [from, setFrom] = useState(start?.from ?? group.meId ?? group.members[0]?.id)
  const [to, setTo] = useState(start?.to ?? group.members.find((m) => m.id !== (group.meId ?? group.members[0]?.id))?.id)
  const [amountText, setAmountText] = useState(start ? amountInputValue(start.amount, group.currency) : '')
  const [date, setDate] = useState(settlement?.date ?? today())
  const [note, setNote] = useState(settlement?.note ?? '')
  const [submitted, setSubmitted] = useState(false)

  const amount = parseAmount(amountText, group.currency)
  const error =
    !from || !to ? 'Pick who paid and who received it.'
    : from === to ? 'Pick two different people.'
    : !amount ? 'Enter an amount.'
    : null

  function submit(e: FormEvent) {
    e.preventDefault()
    setSubmitted(true)
    if (error || !from || !to || !amount) return
    saveSettlement(group.id, {
      id: settlement?.id ?? newId(),
      from,
      to,
      amount,
      date,
      note: note.trim() || undefined,
      createdAt: settlement?.createdAt,
    })
    toast(settlement ? 'Payment updated' : 'Payment recorded')
    onClose()
  }

  function remove() {
    if (!settlement) return
    deleteSettlement(group.id, settlement.id)
    toast('Payment deleted', { label: 'Undo', run: () => saveSettlement(group.id, settlement) })
    onClose()
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={settlement ? 'Edit payment' : 'Record a payment'}
      footer={
        <>
          {settlement && (
            <button type="button" className="btn btn-danger mr-auto" onClick={remove}>
              <Trash2 className="size-4" /> Delete
            </button>
          )}
          <button type="button" className="btn btn-ghost ml-auto" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" form="settlement-form" className="btn btn-primary">
            {settlement ? 'Save changes' : 'Record payment'}
          </button>
        </>
      }
    >
      <form id="settlement-form" onSubmit={submit} className="space-y-4" noValidate>
        <div>
          <span className="label">Who paid</span>
          <MemberRadio group={group} value={from} onChange={setFrom} label="Who paid" />
        </div>
        <ArrowDown className="mx-auto size-4 text-muted" aria-hidden />
        <div>
          <span className="label">Who received it</span>
          <MemberRadio group={group} value={to} onChange={setTo} label="Who received it" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="pay-amount" className="label">
              Amount ({group.currency})
            </label>
            <input
              id="pay-amount"
              className="field num"
              inputMode="decimal"
              value={amountText}
              onChange={(e) => setAmountText(e.target.value)}
              placeholder="0.00"
              autoComplete="off"
              autoFocus={!start}
            />
          </div>
          <div>
            <label htmlFor="pay-date" className="label">
              Date
            </label>
            <input id="pay-date" type="date" className="field" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
        </div>
        <div>
          <label htmlFor="pay-note" className="label">
            Note <span className="font-normal text-muted">(optional)</span>
          </label>
          <input
            id="pay-note"
            className="field"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Vipps, bank transfer, cash…"
            maxLength={120}
          />
        </div>
        {submitted && error && <p className="text-[13px] text-neg-text">{error}</p>}
      </form>
    </Modal>
  )
}
