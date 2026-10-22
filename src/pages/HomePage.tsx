import { Archive, ArrowRightLeft, CircleCheck, Download, Globe2, Link2, Plus, Scale, Sparkles, Upload } from 'lucide-react'
import { useRef } from 'react'
import { Link, useNavigate } from 'react-router'
import { AvatarStack } from '../components/MemberChip'
import { Money } from '../components/Money'
import { settleUp, summarize } from '../lib/balances'
import { timeAgo } from '../lib/dates'
import { downloadFile } from '../lib/download'
import { memberLookup } from '../lib/members'
import { groupStats } from '../lib/stats'
import type { Group } from '../lib/types'
import { InvalidDataError, parseGroup } from '../lib/validate'
import { toast } from '../store/toast'
import { useStore } from '../store/useStore'

export function HomePage() {
  const groups = useStore((s) => s.groups)
  const active = groups.filter((g) => !g.archived)
  const archived = groups.filter((g) => g.archived)

  if (groups.length === 0) return <Welcome />

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Your groups</h1>
          <p className="mt-1 text-sm text-muted">
            {active.length} active {active.length === 1 ? 'group' : 'groups'}
          </p>
        </div>
        <Link to="/new" className="btn btn-primary">
          <Plus className="size-4" /> New group
        </Link>
      </div>

      {active.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {active.map((g) => (
            <GroupCard key={g.id} group={g} />
          ))}
        </div>
      ) : (
        <p className="card p-6 text-sm text-muted">All your groups are archived.</p>
      )}

      {archived.length > 0 && (
        <details className="group">
          <summary className="flex w-fit items-center gap-2 rounded-lg text-sm font-medium text-ink-2 hover:text-ink">
            <Archive className="size-4" /> Archived ({archived.length})
          </summary>
          <div className="mt-4 grid gap-4 opacity-80 sm:grid-cols-2 lg:grid-cols-3">
            {archived.map((g) => (
              <GroupCard key={g.id} group={g} />
            ))}
          </div>
        </details>
      )}

      <DataTools />
    </div>
  )
}

function GroupCard({ group }: { group: Group }) {
  const stats = groupStats(group)
  const summary = summarize(group)
  const transfers = settleUp(summary.map((s) => [s.id, s.net]))
  const me = summary.find((s) => s.id === group.meId)
  const who = memberLookup(group)
  const names = (ids: string[]) => ids.map((id) => who(id).member.name).join(' and ')

  return (
    <Link
      to={`/g/${group.id}`}
      className="card group/card flex flex-col gap-4 p-5 transition-[border-color,transform] hover:-translate-y-0.5 hover:border-line-strong"
    >
      <div className="flex items-start gap-3">
        <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-surface-2 text-2xl">{group.emoji}</span>
        <div className="min-w-0 flex-1">
          <h2 className="truncate font-semibold">{group.name}</h2>
          <p className="text-[13px] text-muted">
            {group.members.length} people · updated {timeAgo(group.updatedAt)}
          </p>
        </div>
      </div>
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-[13px] text-muted">Total spent</p>
          <Money amount={stats.total} currency={group.currency} className="text-lg font-semibold" />
        </div>
        <AvatarStack group={group} size={26} max={4} />
      </div>
      <p className="-mx-5 -mb-5 flex items-center gap-1.5 rounded-b-2xl border-t border-line bg-surface-2/60 px-5 py-2.5 text-[13px]">
        {me && me.net < 0 ? (
          <span>
            You owe <Money amount={-me.net} currency={group.currency} className="font-semibold text-neg-text" />
            <span className="text-muted"> · pay {names(transfers.filter((t) => t.from === me.id).map((t) => t.to))}</span>
          </span>
        ) : me && me.net > 0 ? (
          <span>
            You’re owed <Money amount={me.net} currency={group.currency} className="font-semibold text-pos-text" />
            <span className="text-muted"> · from {names(transfers.filter((t) => t.to === me.id).map((t) => t.from))}</span>
          </span>
        ) : transfers.length === 0 ? (
          <span className="flex items-center gap-1.5 text-ink-2">
            <CircleCheck className="size-3.5" /> Everyone’s settled up
          </span>
        ) : (
          <span className="text-ink-2">
            {me ? 'You’re settled up · ' : ''}
            {transfers.length} {transfers.length === 1 ? 'payment' : 'payments'} needed
          </span>
        )}
      </p>
    </Link>
  )
}

function Welcome() {
  const loadDemo = useStore((s) => s.loadDemo)
  const navigate = useNavigate()

  const features = [
    { icon: Globe2, title: 'Any currency', text: 'Log costs in the local currency. Rates come from the European Central Bank.' },
    { icon: Scale, title: 'Fair splits', text: 'Split equally, by exact amounts, by percentage or by shares.' },
    { icon: ArrowRightLeft, title: 'Fewest payments', text: 'Settle the whole group with as few transfers as possible.' },
    { icon: Link2, title: 'Share by link', text: 'Send the group as a link. No accounts, no server.' },
  ]

  return (
    <div className="mx-auto max-w-3xl">
      <section className="py-8 text-center sm:py-14">
        <p className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-3 py-1 text-[13px] font-medium text-accent-text">
          <Sparkles className="size-3.5" /> Free, private, works offline
        </p>
        <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl">Shared costs, settled simply.</h1>
        <p className="mx-auto mt-4 max-w-xl text-base text-pretty text-ink-2 sm:text-lg">
          Keep track of who paid for what on trips and in shared flats, then settle up in the fewest payments.
          No sign-up, and nothing leaves your device.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link to="/new" className="btn btn-primary h-11 px-5">
            <Plus className="size-4" /> Create a group
          </Link>
          <button
            className="btn btn-secondary h-11 px-5"
            onClick={() => {
              const [first] = loadDemo()
              navigate(`/g/${first}`)
            }}
          >
            Try it with example data
          </button>
        </div>
      </section>
      <section className="grid gap-3 sm:grid-cols-2">
        {features.map(({ icon: Icon, title, text }) => (
          <div key={title} className="card flex gap-3.5 p-4">
            <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent-text">
              <Icon className="size-4.5" />
            </div>
            <div>
              <h2 className="text-sm font-semibold">{title}</h2>
              <p className="mt-0.5 text-[13px] text-muted">{text}</p>
            </div>
          </div>
        ))}
      </section>
      <div className="mt-10">
        <DataTools />
      </div>
    </div>
  )
}

/** Back up every group to a file, or restore/import from one. */
function DataTools() {
  const groups = useStore((s) => s.groups)
  const importGroup = useStore((s) => s.importGroup)
  const navigate = useNavigate()
  const fileInput = useRef<HTMLInputElement>(null)

  function backup() {
    const data = { app: 'evenly', version: 1, exportedAt: new Date().toISOString(), groups }
    downloadFile(`evenly-backup-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(data, null, 2), 'application/json')
  }

  async function restore(file: File) {
    try {
      const data: unknown = JSON.parse(await file.text())
      // Accepts a full backup ({ groups: [...] }) or a single exported group.
      const list = typeof data === 'object' && data !== null && 'groups' in data && Array.isArray(data.groups) ? data.groups : [data]
      const parsed = list.map(parseGroup)
      const existing = parsed.filter((g) => groups.some((x) => x.id === g.id)).length
      if (existing && !confirm(`${existing} of these groups already exist here. Replace them with the versions in the file?`)) return
      parsed.forEach((g) => importGroup(g, 'replace'))
      toast(`Imported ${parsed.length} ${parsed.length === 1 ? 'group' : 'groups'}`)
      if (parsed.length === 1) navigate(`/g/${parsed[0].id}`)
    } catch (err) {
      toast(err instanceof InvalidDataError ? `Can’t import: ${err.message}` : 'That file isn’t an Evenly backup.')
    }
  }

  return (
    <div className="flex flex-col gap-3 border-t border-line pt-6 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
      <p>Your data is stored only in this browser. Back it up now and then.</p>
      <div className="flex gap-2">
        <input
          ref={fileInput}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) void restore(file)
            e.target.value = ''
          }}
        />
        <button className="btn btn-secondary btn-sm" onClick={() => fileInput.current?.click()}>
          <Upload className="size-3.5" /> Import
        </button>
        {groups.length > 0 && (
          <button className="btn btn-secondary btn-sm" onClick={backup}>
            <Download className="size-3.5" /> Back up all
          </button>
        )}
      </div>
    </div>
  )
}
