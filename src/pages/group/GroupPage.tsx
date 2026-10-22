import { Archive, ChevronLeft, HandCoins, Plus } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useParams } from 'react-router'
import { ExpenseDialog } from '../../components/ExpenseDialog'
import { AvatarStack } from '../../components/MemberChip'
import { Money } from '../../components/Money'
import { SettlementDialog } from '../../components/SettlementDialog'
import { groupStats } from '../../lib/stats'
import type { Expense, Settlement, Transfer } from '../../lib/types'
import { useGroup, useStore } from '../../store/useStore'
import { NotFound } from '../NotFound'
import type { GroupContext } from './context'

type Dialog =
  | { kind: 'expense'; expense?: Expense }
  | { kind: 'payment'; settlement?: Settlement; prefill?: Transfer }

const TABS = [
  { to: '.', label: 'Expenses', end: true },
  { to: 'balances', label: 'Balances' },
  { to: 'stats', label: 'Stats' },
  { to: 'settings', label: 'Settings' },
]

export function GroupPage() {
  const { groupId } = useParams()
  const group = useGroup(groupId)
  const updateGroup = useStore((s) => s.updateGroup)
  const [dialog, setDialog] = useState<Dialog | null>(null)

  // Keyboard shortcuts: N adds an expense, P records a payment.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      if (e.metaKey || e.ctrlKey || e.altKey || dialog) return
      if (target.closest('input, textarea, select, [contenteditable="true"]')) return
      if (e.key === 'n') setDialog({ kind: 'expense' })
      if (e.key === 'p') setDialog({ kind: 'payment' })
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [dialog])

  if (!group) return <NotFound message="This group isn’t on this device. It may have been deleted." />

  const stats = groupStats(group)
  const context: GroupContext = {
    group,
    openExpense: (expense) => setDialog({ kind: 'expense', expense }),
    openPayment: (opts) => setDialog({ kind: 'payment', ...opts }),
  }

  return (
    <div>
      <Link to="/" className="mb-4 inline-flex items-center gap-1 rounded-lg text-sm text-muted hover:text-ink">
        <ChevronLeft className="size-4" /> All groups
      </Link>

      {group.archived && (
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-line bg-surface-2 px-4 py-3 text-sm">
          <Archive className="size-4 text-muted" />
          <span className="flex-1">This group is archived.</span>
          <button className="btn btn-secondary btn-sm" onClick={() => updateGroup(group.id, { archived: undefined })}>
            Unarchive
          </button>
        </div>
      )}

      <header className="flex flex-wrap items-center gap-4">
        <span className="grid size-14 shrink-0 place-items-center rounded-2xl border border-line bg-surface text-3xl">
          {group.emoji}
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-2xl font-semibold tracking-tight">{group.name}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
            <AvatarStack group={group} size={22} />
            <span>
              <Money amount={stats.total} currency={group.currency} className="font-medium text-ink-2" /> spent
            </span>
          </div>
        </div>
        <div className="hidden gap-2 sm:flex">
          <button className="btn btn-secondary" onClick={() => context.openPayment()} title="Record a payment (P)">
            <HandCoins className="size-4" /> Record payment
          </button>
          <button className="btn btn-primary" onClick={() => context.openExpense()} title="Add an expense (N)">
            <Plus className="size-4" /> Add expense
          </button>
        </div>
      </header>

      <nav className="-mx-4 mt-6 mb-6 overflow-x-auto border-b border-line px-4 sm:mx-0 sm:px-0" aria-label="Group sections">
        <div className="flex gap-1">
          {TABS.map((t) => (
            <NavLink
              key={t.label}
              to={t.to}
              end={t.end}
              className={({ isActive }) =>
                `relative -mb-px rounded-t-lg border-b-2 px-3 py-2.5 text-sm font-medium whitespace-nowrap transition-colors ${
                  isActive ? 'border-accent text-ink' : 'border-transparent text-muted hover:text-ink'
                }`
              }
            >
              {t.label}
            </NavLink>
          ))}
        </div>
      </nav>

      <Outlet context={context} />

      {/* On phones the main actions live in a floating bar at the bottom. */}
      <div className="fixed inset-x-0 bottom-0 z-10 flex gap-2 border-t border-line bg-bg/90 px-4 pt-3 pb-[max(12px,env(safe-area-inset-bottom))] backdrop-blur-md sm:hidden">
        <button className="btn btn-secondary flex-1" onClick={() => context.openPayment()}>
          <HandCoins className="size-4" /> Payment
        </button>
        <button className="btn btn-primary flex-[2]" onClick={() => context.openExpense()}>
          <Plus className="size-4" /> Add expense
        </button>
      </div>

      {dialog?.kind === 'expense' && (
        <ExpenseDialog group={group} expense={dialog.expense} onClose={() => setDialog(null)} />
      )}
      {dialog?.kind === 'payment' && (
        <SettlementDialog
          group={group}
          settlement={dialog.settlement}
          prefill={dialog.prefill}
          onClose={() => setDialog(null)}
        />
      )}
    </div>
  )
}
