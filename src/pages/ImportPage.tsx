import { CircleAlert, Download, LoaderCircle } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { EmptyState } from '../components/EmptyState'
import { MemberRadio } from '../components/MemberChip'
import { Money } from '../components/Money'
import { formatDay, timeAgo } from '../lib/dates'
import { decodeGroup } from '../lib/share'
import { groupStats } from '../lib/stats'
import type { Group, ID } from '../lib/types'
import { toast } from '../store/toast'
import { useStore } from '../store/useStore'

type State = { status: 'loading' } | { status: 'error'; message: string } | { status: 'ready'; group: Group }

/** Opened from a share link: previews the group in the link and adds it to this device. */
export function ImportPage() {
  const [params] = useSearchParams()
  const code = params.get('g') ?? ''
  const [state, setState] = useState<State>({ status: 'loading' })
  const [me, setMe] = useState<ID | undefined>()
  const groups = useStore((s) => s.groups)
  const importGroup = useStore((s) => s.importGroup)
  const updateGroup = useStore((s) => s.updateGroup)
  const navigate = useNavigate()

  useEffect(() => {
    let cancelled = false
    decodeGroup(code).then(
      (group) => !cancelled && setState({ status: 'ready', group }),
      (err: Error) => !cancelled && setState({ status: 'error', message: err.message }),
    )
    return () => {
      cancelled = true
    }
  }, [code])

  if (state.status === 'loading') {
    return (
      <div className="grid place-items-center py-24 text-muted">
        <LoaderCircle className="size-6 animate-spin" aria-label="Opening link" />
      </div>
    )
  }

  if (state.status === 'error') {
    return (
      <div className="card mx-auto max-w-md">
        <EmptyState icon={CircleAlert} title="Can’t open this link">
          <p>{state.message}</p>
          <Link to="/" className="btn btn-secondary mt-5">
            Go to your groups
          </Link>
        </EmptyState>
      </div>
    )
  }

  const { group } = state
  const existing = groups.find((g) => g.id === group.id)
  const stats = groupStats(group)
  const first = group.expenses.reduce((a, e) => (!a || e.date < a ? e.date : a), '')
  const last = group.expenses.reduce((a, e) => (e.date > a ? e.date : a), '')

  function save(mode: 'copy' | 'replace') {
    const id = importGroup(group, mode)
    if (me) updateGroup(id, { meId: me })
    toast(mode === 'replace' ? `Updated “${group.name}”` : `Added “${group.name}”`)
    navigate(`/g/${id}`, { replace: true })
  }

  return (
    <div className="mx-auto max-w-lg">
      <p className="mb-3 text-sm text-muted">Someone shared a group with you</p>
      <div className="card overflow-hidden">
        <div className="flex flex-wrap items-center gap-4 p-5">
          <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-surface-2 text-3xl">{group.emoji}</span>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-xl font-semibold">{group.name}</h1>
            <p className="text-sm text-muted">
              {group.expenses.length} expenses
              {first && ` · ${formatDay(first)}${last !== first ? ` – ${formatDay(last)}` : ''}`}
            </p>
          </div>
          <div className="flex w-full items-baseline justify-between sm:block sm:w-auto sm:text-right">
            <p className="text-[13px] text-muted">Total</p>
            <Money amount={stats.total} currency={group.currency} className="font-semibold" />
          </div>
        </div>

        <div className="border-t border-line p-5">
          <span className="label">Which one are you?</span>
          <MemberRadio group={group} value={me} onChange={setMe} label="Which one are you?" />
          <p className="mt-2 text-[13px] text-muted">So Evenly can show what you owe and are owed. You can change it later.</p>
        </div>

        <div className="border-t border-line bg-surface-2/50 p-5">
          {existing ? (
            <>
              <p className="mb-4 text-sm text-ink-2">
                You already have this group, last changed {timeAgo(existing.updatedAt)}. Update it with the version in
                this link, or keep both?
              </p>
              <div className="flex flex-wrap gap-2">
                <button className="btn btn-primary" onClick={() => save('replace')}>
                  Update my copy
                </button>
                <button className="btn btn-secondary" onClick={() => save('copy')}>
                  Keep both
                </button>
              </div>
            </>
          ) : (
            <button className="btn btn-primary w-full" onClick={() => save('copy')}>
              <Download className="size-4" /> Add to my groups
            </button>
          )}
        </div>
      </div>
      <p className="mt-4 text-center text-[13px] text-muted">
        The link contains the whole group. Nothing was uploaded anywhere.
      </p>
    </div>
  )
}
