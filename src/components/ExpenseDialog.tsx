import { Minus, Plus, RefreshCw, Trash2 } from 'lucide-react'
import { useRef, useState, type FormEvent } from 'react'
import { CATEGORIES, guessCategory } from '../lib/categories'
import { formatDay, today } from '../lib/dates'
import { newId } from '../lib/ids'
import { allocate, amountInputValue, convert, formatMoney, parseAmount } from '../lib/money'
import { fetchRate } from '../lib/rates'
import { checkSplit, participants, SPLIT_MODES } from '../lib/split'
import type { CategoryId, Expense, Group, ID, Split, SplitMode } from '../lib/types'
import { toast } from '../store/toast'
import { useStore } from '../store/useStore'
import { Avatar } from './Avatar'
import { CurrencySelect } from './CurrencySelect'
import { displayName } from '../lib/members'
import { MemberRadio } from './MemberChip'
import { Modal } from './Modal'
import { Segmented } from './Segmented'

type Inputs = Record<ID, string>

/** Pre-fills the per-mode inputs from an existing split, so editing shows what was saved. */
function initialInputs(group: Group, expense?: Expense) {
  const all = group.members.map((m) => m.id)
  const split = expense?.split
  const from = (mode: SplitMode, fmt: (w: number) => string): Inputs =>
    split?.mode === mode ? Object.fromEntries(participants(split).map((id) => [id, fmt(split.weights[id])])) : {}
  return {
    included: new Set(split?.mode === 'equal' ? participants(split) : all),
    exact: from('exact', (w) => amountInputValue(w, expense!.currency)),
    percent: from('percent', (w) => String(w / 100)),
    shares: split?.mode === 'shares' ? from('shares', String) : Object.fromEntries(all.map((id) => [id, '1'])),
  }
}

const parsePercent = (text: string) => Math.round(Number(text.replace(',', '.')) * 100)
const parseRate = (text: string) => {
  const n = Number(text.replace(',', '.'))
  return Number.isFinite(n) && n > 0 ? n : null
}

export function ExpenseDialog({ group, expense, onClose }: { group: Group; expense?: Expense; onClose: () => void }) {
  const saveExpense = useStore((s) => s.saveExpense)
  const deleteExpense = useStore((s) => s.deleteExpense)

  // New expenses default to the currency used last: on a trip abroad that's usually right.
  const last = expense ? undefined : group.expenses.reduce<Expense | undefined>((a, e) => (!a || e.createdAt > a.createdAt ? e : a), undefined)
  const initialCurrency = expense?.currency ?? last?.currency ?? group.currency
  const initialRate = expense ?? (last?.currency === initialCurrency ? last : undefined)

  const [title, setTitle] = useState(expense?.title ?? '')
  const [amountText, setAmountText] = useState(expense ? amountInputValue(expense.amount, expense.currency) : '')
  const [currency, setCurrency] = useState(initialCurrency)
  const [rateText, setRateText] = useState(initialRate && initialCurrency !== group.currency ? String(initialRate.rate) : '')
  const [rateStatus, setRateStatus] = useState<{ loading?: boolean; note?: string }>({})
  const [paidBy, setPaidBy] = useState<ID | undefined>(expense?.paidBy ?? group.meId ?? group.members[0]?.id)
  const [date, setDate] = useState(expense?.date ?? today())
  const [category, setCategory] = useState<CategoryId>(expense?.category ?? 'other')
  const [categoryPicked, setCategoryPicked] = useState(Boolean(expense))
  const [note, setNote] = useState(expense?.note ?? '')
  const [showNote, setShowNote] = useState(Boolean(expense?.note))
  const [mode, setMode] = useState<SplitMode>(expense?.split.mode ?? 'equal')
  const [inputs] = useState(() => initialInputs(group, expense))
  const [included, setIncluded] = useState(inputs.included)
  const [exact, setExact] = useState(inputs.exact)
  const [percent, setPercent] = useState(inputs.percent)
  const [shareCounts, setShareCounts] = useState(inputs.shares)
  const [submitted, setSubmitted] = useState(false)
  const rateRequest = useRef<AbortController | null>(null)

  const foreign = currency !== group.currency
  const amount = parseAmount(amountText, currency)
  const rate = foreign ? parseRate(rateText) : 1

  const split: Split = { mode, weights: {} }
  for (const { id } of group.members) {
    if (mode === 'equal' && included.has(id)) split.weights[id] = 1
    if (mode === 'exact' && exact[id]?.trim()) split.weights[id] = parseAmount(exact[id], currency) ?? NaN
    if (mode === 'percent' && percent[id]?.trim()) split.weights[id] = parsePercent(percent[id])
    if (mode === 'shares' && shareCounts[id]?.trim()) split.weights[id] = Number(shareCounts[id])
  }
  const check = checkSplit(split, amount ?? 0)

  const ids = participants(split)
  const preview = new Map<ID, number>()
  if (amount && check.ok) {
    const parts = allocate(amount, ids.map((id) => (mode === 'equal' ? 1 : split.weights[id])))
    ids.forEach((id, i) => preview.set(id, parts[i]))
  }

  const errors = {
    title: !title.trim() ? 'Give it a name.' : null,
    amount: amount === null || amount === 0 ? 'Enter an amount, like 12.50.' : null,
    rate: foreign && rate === null ? 'Enter the exchange rate.' : null,
    paidBy: !paidBy ? 'Who paid?' : null,
    split: amount ? (check.ok ? null : check.error) : null,
  }
  const valid = Object.values(errors).every((e) => !e)

  function getRate(cur: string, day: string) {
    rateRequest.current?.abort()
    if (cur === group.currency) return
    const controller = new AbortController()
    rateRequest.current = controller
    setRateStatus({ loading: true })
    fetchRate(cur, group.currency, day, controller.signal)
      .then((r) => {
        setRateText(String(r.rate))
        const source = r.source === 'ecb' ? 'European Central Bank rate' : 'Market rate'
        // Before March 2024 only today's market rate is available.
        const fellBack = r.date > day && day < today()
        setRateStatus({
          note: fellBack ? `${source} from today. There’s no rate saved for ${formatDay(day)}.` : `${source} for ${formatDay(r.date)}`,
        })
      })
      .catch((err: Error) => {
        if (err.name !== 'AbortError') setRateStatus({ note: 'Couldn’t fetch a rate. Type it in.' })
      })
  }

  function onTitle(value: string) {
    setTitle(value)
    if (!categoryPicked) setCategory(guessCategory(value) ?? 'other')
  }

  function onCurrency(cur: string) {
    setCurrency(cur)
    setRateText('')
    setRateStatus({})
    getRate(cur, date)
  }

  function onDate(day: string) {
    setDate(day)
    if (foreign && day) getRate(currency, day)
  }

  /** Spreads whatever is unassigned across the people with an empty field. */
  function fillRest() {
    const empty = group.members.map((m) => m.id).filter((id) => !(mode === 'exact' ? exact : percent)[id]?.trim())
    if (!empty.length || !check.remaining || check.remaining < 0) return
    const parts = allocate(check.remaining, empty.map(() => 1))
    const filled = Object.fromEntries(
      empty.map((id, i) => [id, mode === 'exact' ? amountInputValue(parts[i], currency) : String(parts[i] / 100)]),
    )
    if (mode === 'exact') setExact((x) => ({ ...x, ...filled }))
    else setPercent((x) => ({ ...x, ...filled }))
  }

  function submit(e: FormEvent) {
    e.preventDefault()
    setSubmitted(true)
    if (!valid || amount === null || rate === null || !paidBy) return
    saveExpense(group.id, {
      id: expense?.id ?? newId(),
      title: title.trim(),
      amount,
      currency,
      rate,
      paidBy,
      split,
      category,
      date,
      note: note.trim() || undefined,
      createdAt: expense?.createdAt,
    })
    toast(expense ? 'Expense updated' : `Added “${title.trim()}”`)
    onClose()
  }

  function remove() {
    if (!expense) return
    deleteExpense(group.id, expense.id)
    toast('Expense deleted', { label: 'Undo', run: () => saveExpense(group.id, expense) })
    onClose()
  }

  const showError = (msg: string | null) => submitted && msg && <p className="mt-1.5 text-[13px] text-neg-text">{msg}</p>
  const remainingLabel =
    check.remaining === undefined || check.remaining === 0
      ? null
      : mode === 'exact'
        ? `${formatMoney(Math.abs(check.remaining), currency)} ${check.remaining > 0 ? 'left to assign' : 'too much'}`
        : `${Math.abs(check.remaining) / 100}% ${check.remaining > 0 ? 'left to assign' : 'too much'}`

  return (
    <Modal
      open
      wide
      onClose={onClose}
      title={expense ? 'Edit expense' : 'Add an expense'}
      footer={
        <>
          {expense && (
            <button type="button" className="btn btn-danger mr-auto" onClick={remove}>
              <Trash2 className="size-4" /> Delete
            </button>
          )}
          <button type="button" className="btn btn-ghost ml-auto" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" form="expense-form" className="btn btn-primary">
            {expense ? 'Save changes' : 'Add expense'}
          </button>
        </>
      }
    >
      <form id="expense-form" onSubmit={submit} className="space-y-5" noValidate>
        <div>
          <label htmlFor="title" className="label">
            What was it?
          </label>
          <input
            id="title"
            className="field"
            value={title}
            onChange={(e) => onTitle(e.target.value)}
            placeholder="Dinner, taxi, groceries…"
            autoFocus
            maxLength={120}
            autoComplete="off"
          />
          {showError(errors.title)}
        </div>

        <div className="grid grid-cols-[1fr_auto] gap-3 sm:grid-cols-[1fr_160px]">
          <div>
            <label htmlFor="amount" className="label">
              Amount
            </label>
            <div className="flex gap-2">
              <CurrencySelect value={currency} onChange={onCurrency} compact className="w-[88px] shrink-0 px-2" />
              <input
                id="amount"
                className="field num"
                inputMode="decimal"
                value={amountText}
                onChange={(e) => setAmountText(e.target.value)}
                placeholder="0.00"
                autoComplete="off"
              />
            </div>
            {showError(errors.amount)}
          </div>
          <div>
            <label htmlFor="date" className="label">
              Date
            </label>
            <input id="date" type="date" className="field" value={date} onChange={(e) => onDate(e.target.value)} />
          </div>
        </div>

        {foreign && (
          <div className="rounded-xl bg-surface-2 p-3">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <label htmlFor="rate" className="text-ink-2">
                1 {currency} =
              </label>
              <input
                id="rate"
                className="field num h-9 w-40"
                inputMode="decimal"
                value={rateText}
                onChange={(e) => {
                  setRateText(e.target.value)
                  setRateStatus({})
                }}
                placeholder={rateStatus.loading ? 'Loading…' : 'Rate'}
              />
              <span className="text-ink-2">{group.currency}</span>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => getRate(currency, date)}
                disabled={rateStatus.loading}
              >
                <RefreshCw className={`size-3.5 ${rateStatus.loading ? 'animate-spin' : ''}`} /> Get rate
              </button>
              {amount !== null && rate !== null && (
                <span className="ml-auto font-medium">
                  = {formatMoney(convert(amount, currency, rate, group.currency), group.currency)}
                </span>
              )}
            </div>
            {rate !== null && rate < 0.1 && (
              // Tiny rates (1 VND = 0.0004 NOK) are easier to check the other way round.
              <p className="num mt-2 text-xs text-ink-2">
                1 {group.currency} ≈ {(1 / rate).toLocaleString(undefined, { maximumFractionDigits: 2 })} {currency}
              </p>
            )}
            {rateStatus.note && <p className="mt-2 text-xs text-muted">{rateStatus.note}</p>}
            {showError(errors.rate)}
          </div>
        )}

        <div>
          <span className="label">Paid by</span>
          <MemberRadio group={group} value={paidBy} onChange={setPaidBy} label="Paid by" />
          {showError(errors.paidBy)}
        </div>

        <fieldset>
          <legend className="label">Split</legend>
          <Segmented value={mode} options={SPLIT_MODES} onChange={setMode} label="How to split" />
          <p className="mt-2 text-[13px] text-muted">{SPLIT_MODES.find((m) => m.id === mode)?.hint}</p>

          <ul className="mt-2 divide-y divide-line rounded-xl border border-line">
            {group.members.map((m, i) => {
              const owes = preview.get(m.id)
              return (
                <li key={m.id} className="flex min-h-12 items-center gap-3 px-3 py-1.5">
                  {mode === 'equal' ? (
                    <label className="flex flex-1 cursor-pointer items-center gap-3">
                      <input
                        type="checkbox"
                        className="size-4 accent-[var(--accent)]"
                        checked={included.has(m.id)}
                        onChange={(e) => {
                          const next = new Set(included)
                          if (e.target.checked) next.add(m.id)
                          else next.delete(m.id)
                          setIncluded(next)
                        }}
                      />
                      <Avatar name={m.name} index={i} size={26} />
                      <span className="text-sm">{displayName(group, m.id, m.name)}</span>
                    </label>
                  ) : (
                    <>
                      <Avatar name={m.name} index={i} size={26} />
                      <span className="flex-1 truncate text-sm">{displayName(group, m.id, m.name)}</span>
                    </>
                  )}

                  {mode === 'exact' && (
                    <input
                      aria-label={`${m.name}’s amount`}
                      className="field num h-9 w-28 text-right"
                      inputMode="decimal"
                      placeholder="0.00"
                      value={exact[m.id] ?? ''}
                      onChange={(e) => setExact({ ...exact, [m.id]: e.target.value })}
                    />
                  )}
                  {mode === 'percent' && (
                    <div className="relative">
                      <input
                        aria-label={`${m.name}’s percentage`}
                        className="field num h-9 w-24 pr-7 text-right"
                        inputMode="decimal"
                        placeholder="0"
                        value={percent[m.id] ?? ''}
                        onChange={(e) => setPercent({ ...percent, [m.id]: e.target.value })}
                      />
                      <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm text-muted">%</span>
                    </div>
                  )}
                  {mode === 'shares' && (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        className="btn btn-secondary btn-icon size-8 rounded-lg"
                        aria-label={`Fewer shares for ${m.name}`}
                        onClick={() => setShareCounts({ ...shareCounts, [m.id]: String(Math.max(0, (Number(shareCounts[m.id]) || 0) - 1)) })}
                      >
                        <Minus className="size-3.5" />
                      </button>
                      <input
                        aria-label={`${m.name}’s shares`}
                        className="field num h-8 w-12 px-1 text-center"
                        inputMode="numeric"
                        value={shareCounts[m.id] ?? ''}
                        onChange={(e) => setShareCounts({ ...shareCounts, [m.id]: e.target.value.replace(/\D/g, '') })}
                      />
                      <button
                        type="button"
                        className="btn btn-secondary btn-icon size-8 rounded-lg"
                        aria-label={`More shares for ${m.name}`}
                        onClick={() => setShareCounts({ ...shareCounts, [m.id]: String((Number(shareCounts[m.id]) || 0) + 1) })}
                      >
                        <Plus className="size-3.5" />
                      </button>
                    </div>
                  )}

                  <span className={`num w-24 text-right text-sm ${owes ? 'text-ink' : 'text-muted'}`}>
                    {owes !== undefined ? formatMoney(owes, currency) : '—'}
                  </span>
                </li>
              )
            })}
          </ul>

          {(mode === 'exact' || mode === 'percent') && remainingLabel && (
            <div className="mt-2 flex items-center justify-between gap-3 text-[13px]">
              <span className={check.remaining! < 0 ? 'text-neg-text' : 'text-ink-2'}>{remainingLabel}</span>
              {check.remaining! > 0 && (
                <button type="button" className="font-medium text-accent-text hover:underline" onClick={fillRest}>
                  Split the rest equally
                </button>
              )}
            </div>
          )}
          {submitted && errors.split && !remainingLabel && <p className="mt-1.5 text-[13px] text-neg-text">{errors.split}</p>}
        </fieldset>

        <div>
          <span className="label">Category</span>
          <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Category">
            {CATEGORIES.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={category === id}
                onClick={() => {
                  setCategory(id)
                  setCategoryPicked(true)
                }}
                className={`flex h-8 items-center gap-1.5 rounded-full border px-3 text-[13px] transition-colors ${
                  category === id ? 'border-accent bg-accent-soft font-medium text-ink' : 'border-line text-ink-2 hover:bg-surface-2'
                }`}
              >
                <Icon className="size-3.5" />
                {label}
              </button>
            ))}
          </div>
        </div>

        {showNote ? (
          <div>
            <label htmlFor="note" className="label">
              Note
            </label>
            <textarea
              id="note"
              className="field h-20 resize-none py-2"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={500}
            />
          </div>
        ) : (
          <button type="button" className="text-[13px] font-medium text-accent-text hover:underline" onClick={() => setShowNote(true)}>
            + Add a note
          </button>
        )}
      </form>
    </Modal>
  )
}
