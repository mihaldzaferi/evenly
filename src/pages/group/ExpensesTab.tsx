import { HandCoins, Plus, Receipt, Search } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Avatar } from '../../components/Avatar'
import { EmptyState } from '../../components/EmptyState'
import { Money } from '../../components/Money'
import { CATEGORIES, category } from '../../lib/categories'
import { formatDay, formatMonth } from '../../lib/dates'
import { memberLookup } from '../../lib/members'
import { formatMoney } from '../../lib/money'
import { amountInGroupCurrency, participants, shares } from '../../lib/split'
import type { CategoryId, Expense, Group, ID, Settlement } from '../../lib/types'
import { useGroupContext } from './context'

type Item = { kind: 'expense'; date: string; createdAt: number; expense: Expense } | { kind: 'payment'; date: string; createdAt: number; payment: Settlement }

export function ExpensesTab() {
  const { group, openExpense, openPayment } = useGroupContext()
  const [query, setQuery] = useState('')
  const [cat, setCat] = useState<CategoryId | 'all'>('all')
  const [person, setPerson] = useState<ID | 'all'>('all')
  const search = useRef<HTMLInputElement>(null)
  const who = memberLookup(group)

  // "/" jumps to the search box, like on GitHub.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== '/' || (e.target as HTMLElement).closest('input, textarea, select, dialog')) return
      e.preventDefault()
      search.current?.focus()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  if (group.expenses.length === 0 && group.settlements.length === 0) {
    return (
      <div className="card">
        <EmptyState icon={Receipt} title="No expenses yet">
          <p>Add the first thing someone paid for. Evenly works out who owes whom as you go.</p>
          <button className="btn btn-primary mt-5" onClick={() => openExpense()}>
            <Plus className="size-4" /> Add expense
          </button>
        </EmptyState>
      </div>
    )
  }

  const q = query.trim().toLowerCase()
  const items: Item[] = [
    ...group.expenses
      .filter((e) => cat === 'all' || e.category === cat)
      .filter((e) => person === 'all' || e.paidBy === person || participants(e.split).includes(person))
      .filter((e) => !q || [e.title, e.note ?? '', who(e.paidBy).member.name].some((s) => s.toLowerCase().includes(q)))
      .map((expense) => ({ kind: 'expense' as const, date: expense.date, createdAt: expense.createdAt, expense })),
    ...(cat === 'all' ? group.settlements : [])
      .filter((s) => person === 'all' || s.from === person || s.to === person)
      .filter((s) => !q || [s.note ?? '', who(s.from).member.name, who(s.to).member.name, 'payment'].some((x) => x.toLowerCase().includes(q)))
      .map((payment) => ({ kind: 'payment' as const, date: payment.date, createdAt: payment.createdAt, payment })),
  ].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt)

  const months: { month: string; items: Item[]; total: number }[] = []
  for (const item of items) {
    const month = item.date.slice(0, 7)
    let bucket = months.at(-1)
    if (bucket?.month !== month) months.push((bucket = { month, items: [], total: 0 }))
    bucket.items.push(item)
    if (item.kind === 'expense') bucket.total += amountInGroupCurrency(item.expense, group.currency)
  }

  const filtered = q || cat !== 'all' || person !== 'all'
  const usedCategories = CATEGORIES.filter((c) => group.expenses.some((e) => e.category === c.id))

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" />
          <input
            ref={search}
            type="search"
            className="field pl-9"
            placeholder="Search expenses"
            aria-label="Search expenses"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex">
          <select className="field sm:w-44" aria-label="Category" value={cat} onChange={(e) => setCat(e.target.value as CategoryId | 'all')}>
            <option value="all">All categories</option>
            {usedCategories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
          <select className="field sm:w-40" aria-label="Person" value={person} onChange={(e) => setPerson(e.target.value)}>
            <option value="all">Everyone</option>
            {group.members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {filtered && (
        <div className="-mt-3 flex items-center justify-between text-[13px] text-muted">
          <span>
            {items.length} {items.length === 1 ? 'match' : 'matches'}
          </span>
          <button
            className="font-medium text-accent-text hover:underline"
            onClick={() => {
              setQuery('')
              setCat('all')
              setPerson('all')
            }}
          >
            Clear filters
          </button>
        </div>
      )}

      {months.length === 0 && <p className="card p-8 text-center text-sm text-muted">Nothing matches those filters.</p>}

      {months.map(({ month, items, total }) => (
        <section key={month}>
          <div className="mb-2 flex items-baseline justify-between px-1">
            <h2 className="text-sm font-semibold">{formatMonth(month)}</h2>
            {total > 0 && <Money amount={total} currency={group.currency} className="text-[13px] text-muted" />}
          </div>
          <ul className="card divide-y divide-line overflow-hidden">
            {items.map((item) =>
              item.kind === 'expense' ? (
                <ExpenseRow key={item.expense.id} group={group} expense={item.expense} onOpen={() => openExpense(item.expense)} />
              ) : (
                <PaymentRow key={item.payment.id} group={group} payment={item.payment} onOpen={() => openPayment({ settlement: item.payment })} />
              ),
            )}
          </ul>
        </section>
      ))}
    </div>
  )
}

function ExpenseRow({ group, expense, onOpen }: { group: Group; expense: Expense; onOpen: () => void }) {
  const who = memberLookup(group)
  const { icon: Icon, label } = category(expense.category)
  const total = amountInGroupCurrency(expense, group.currency)
  const people = participants(expense.split).length
  const payer = who(expense.paidBy).member
  const foreign = expense.currency !== group.currency

  let mine: { text: string; amount: number; tone: 'pos' | 'neg' | 'none' } | null = null
  if (group.meId) {
    const myShare = shares(expense, group.currency).get(group.meId) ?? 0
    if (expense.paidBy === group.meId) mine = { text: 'you lent', amount: total - myShare, tone: total - myShare > 0 ? 'pos' : 'none' }
    else if (myShare > 0) mine = { text: 'you owe', amount: myShare, tone: 'neg' }
    else mine = { text: 'not involved', amount: 0, tone: 'none' }
  }

  return (
    <li>
      <button onClick={onOpen} className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-2/70">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-surface-2 text-ink-2" title={label}>
          <Icon className="size-4.5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[15px] font-medium">{expense.title}</span>
          <span className="block truncate text-[13px] text-muted">
            {formatDay(expense.date)} · {payer.id === group.meId ? 'You' : payer.name} paid
            {foreign && ` ${formatMoney(expense.amount, expense.currency)}`}
            <span className="hidden sm:inline">{people === 1 ? ' · 1 person' : ` · ${people} people`}</span>
          </span>
        </span>
        <span className="shrink-0 text-right">
          <Money amount={total} currency={group.currency} className="block text-[15px] font-semibold" />
          {mine && (
            <span
              className={`num block text-xs ${mine.tone === 'pos' ? 'text-pos-text' : mine.tone === 'neg' ? 'text-neg-text' : 'text-muted'}`}
            >
              {mine.text}
              {mine.amount > 0 && ` ${formatMoney(mine.amount, group.currency)}`}
            </span>
          )}
        </span>
      </button>
    </li>
  )
}

function PaymentRow({ group, payment, onOpen }: { group: Group; payment: Settlement; onOpen: () => void }) {
  const who = memberLookup(group)
  const from = who(payment.from)
  const to = who(payment.to)
  return (
    <li>
      <button onClick={onOpen} className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-2/70">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent-text">
          <HandCoins className="size-4.5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5 text-[15px] font-medium">
            <Avatar name={from.member.name} index={from.index} size={18} />
            <span className="truncate">
              {from.member.name} paid {to.member.name}
            </span>
          </span>
          <span className="block truncate text-[13px] text-muted">
            {formatDay(payment.date)} · {payment.note || 'Payment'}
          </span>
        </span>
        <Money amount={payment.amount} currency={group.currency} className="shrink-0 text-[15px] font-medium text-ink-2" />
      </button>
    </li>
  )
}
