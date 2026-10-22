import { Archive, ArchiveRestore, Check, Copy, FileJson, FileSpreadsheet, Link2, Share2, Trash2, UserPlus, X } from 'lucide-react'
import { useState, type FormEvent, type ReactNode } from 'react'
import { useNavigate } from 'react-router'
import { Avatar } from '../../components/Avatar'
import { CurrencySelect } from '../../components/CurrencySelect'
import { EmojiField } from '../../components/EmojiField'
import { memberIsUnused } from '../../lib/balances'
import { groupToCsv } from '../../lib/csv'
import { downloadFile, slug } from '../../lib/download'
import { encodeGroup, shareUrl } from '../../lib/share'
import type { Group } from '../../lib/types'
import { toast } from '../../store/toast'
import { useStore } from '../../store/useStore'
import { useGroupContext } from './context'

export function SettingsTab() {
  const { group } = useGroupContext()
  return (
    <div key={group.id} className="mx-auto max-w-2xl space-y-6">
      <Details group={group} />
      <People group={group} />
      <Share group={group} />
      <Export group={group} />
      <Danger group={group} />
    </div>
  )
}

function Card({ title, description, children }: { title: string; description?: ReactNode; children: ReactNode }) {
  return (
    <section className="card p-5 sm:p-6">
      <h2 className="font-semibold">{title}</h2>
      {description && <p className="mt-0.5 text-[13px] text-muted">{description}</p>}
      <div className="mt-4">{children}</div>
    </section>
  )
}

function Details({ group }: { group: Group }) {
  const updateGroup = useStore((s) => s.updateGroup)
  const [name, setName] = useState(group.name)
  const locked = group.expenses.length > 0 || group.settlements.length > 0

  return (
    <Card title="Group">
      <div className="space-y-5">
        <div>
          <label htmlFor="settings-name" className="label">
            Name
          </label>
          <input
            id="settings-name"
            className="field"
            value={name}
            maxLength={80}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => (name.trim() ? updateGroup(group.id, { name: name.trim() }) : setName(group.name))}
          />
        </div>
        <div>
          <span className="label">Icon</span>
          <EmojiField value={group.emoji} onChange={(emoji) => updateGroup(group.id, { emoji })} />
        </div>
        <div>
          <label htmlFor="settings-currency" className="label">
            Main currency
          </label>
          {locked ? (
            <>
              <input id="settings-currency" className="field" value={group.currency} disabled />
              <p className="mt-1.5 text-[13px] text-muted">The main currency is fixed once a group has expenses.</p>
            </>
          ) : (
            <CurrencySelect id="settings-currency" value={group.currency} onChange={(currency) => updateGroup(group.id, { currency })} />
          )}
        </div>
        <div>
          <label htmlFor="settings-me" className="label">
            Which one are you?
          </label>
          <select
            id="settings-me"
            className="field"
            value={group.meId ?? ''}
            onChange={(e) => updateGroup(group.id, { meId: e.target.value || undefined })}
          >
            <option value="">Nobody, I’m just keeping track</option>
            {group.members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
          <p className="mt-1.5 text-[13px] text-muted">Only saved on this device. Used to show what you owe and get back.</p>
        </div>
      </div>
    </Card>
  )
}

function People({ group }: { group: Group }) {
  const addMember = useStore((s) => s.addMember)
  const renameMember = useStore((s) => s.renameMember)
  const removeMember = useStore((s) => s.removeMember)
  const [newName, setNewName] = useState('')
  const taken = (name: string, except?: string) =>
    group.members.some((m) => m.id !== except && m.name.toLowerCase() === name.trim().toLowerCase())

  function add(e: FormEvent) {
    e.preventDefault()
    const name = newName.trim()
    if (!name) return
    if (taken(name)) return toast(`There’s already a ${name} in this group.`)
    addMember(group.id, name)
    setNewName('')
  }

  return (
    <Card title="People" description="People with expenses or payments can’t be removed, so balances stay correct.">
      <ul className="space-y-2">
        {group.members.map((m, i) => {
          const removable = memberIsUnused(group, m.id) && group.members.length > 1
          return (
            <li key={m.id} className="flex items-center gap-2">
              <Avatar name={m.name} index={i} size={32} />
              <input
                aria-label={`Name of ${m.name}`}
                className="field"
                defaultValue={m.name}
                maxLength={60}
                onBlur={(e) => {
                  const name = e.target.value.trim()
                  if (!name || taken(name, m.id)) e.target.value = m.name
                  else if (name !== m.name) renameMember(group.id, m.id, name)
                }}
              />
              <button
                className="btn btn-ghost btn-icon"
                disabled={!removable}
                aria-label={`Remove ${m.name}`}
                title={removable ? `Remove ${m.name}` : `${m.name} has expenses or payments`}
                onClick={() => removeMember(group.id, m.id) && toast(`Removed ${m.name}`)}
              >
                <X className="size-4" />
              </button>
            </li>
          )
        })}
      </ul>
      <form onSubmit={add} className="mt-3 flex gap-2">
        <input className="field" placeholder="Name" aria-label="New person’s name" value={newName} onChange={(e) => setNewName(e.target.value)} maxLength={60} />
        <button className="btn btn-secondary" disabled={!newName.trim()}>
          <UserPlus className="size-4" /> Add
        </button>
      </form>
    </Card>
  )
}

function Share({ group }: { group: Group }) {
  const [link, setLink] = useState<{ url: string; version: number } | null>(null)
  const [copied, setCopied] = useState(false)
  // A link is a snapshot: once the group changes, offer a fresh one.
  const stale = link && link.version !== group.updatedAt

  async function create() {
    const url = shareUrl(await encodeGroup(group))
    setLink({ url, version: group.updatedAt })
    setCopied(false)
  }

  async function copy() {
    if (!link) return
    await navigator.clipboard.writeText(link.url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Card
      title="Share"
      description="Send the whole group as a link. Whoever opens it can add it to their own device. Nothing is uploaded: the data is inside the link itself."
    >
      {link && !stale ? (
        <div className="space-y-3">
          <div className="flex gap-2">
            <input className="field num text-[13px] text-ink-2" value={link.url} readOnly onFocus={(e) => e.target.select()} aria-label="Share link" />
            <button className="btn btn-primary" onClick={copy}>
              {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
          {'share' in navigator && (
            <button
              className="btn btn-secondary"
              onClick={() => navigator.share({ title: group.name, text: `${group.emoji} ${group.name} on Evenly`, url: link.url }).catch(() => {})}
            >
              <Share2 className="size-4" /> Send…
            </button>
          )}
          <p className="text-[13px] text-muted">
            The link is a snapshot of the group right now. Make a new one after you add expenses.
          </p>
        </div>
      ) : (
        <button className="btn btn-secondary" onClick={create}>
          <Link2 className="size-4" /> {stale ? 'Make a new link' : 'Make a share link'}
        </button>
      )}
    </Card>
  )
}

function Export({ group }: { group: Group }) {
  const name = slug(group.name)
  return (
    <Card title="Export" description="Open the CSV in Excel, Numbers or Google Sheets. The JSON file can be imported again later.">
      <div className="flex flex-wrap gap-2">
        <button className="btn btn-secondary" onClick={() => downloadFile(`${name}.csv`, groupToCsv(group), 'text/csv;charset=utf-8')}>
          <FileSpreadsheet className="size-4" /> Download CSV
        </button>
        <button className="btn btn-secondary" onClick={() => downloadFile(`${name}.json`, JSON.stringify(group, null, 2), 'application/json')}>
          <FileJson className="size-4" /> Download JSON
        </button>
      </div>
    </Card>
  )
}

function Danger({ group }: { group: Group }) {
  const updateGroup = useStore((s) => s.updateGroup)
  const deleteGroup = useStore((s) => s.deleteGroup)
  const restoreGroup = useStore((s) => s.restoreGroup)
  const navigate = useNavigate()

  function remove() {
    const index = useStore.getState().groups.findIndex((g) => g.id === group.id)
    deleteGroup(group.id)
    navigate('/')
    toast(`Deleted “${group.name}”`, { label: 'Undo', run: () => restoreGroup(group, index) })
  }

  return (
    <Card title="Archive or delete">
      <div className="flex flex-wrap gap-2">
        {group.archived ? (
          <button className="btn btn-secondary" onClick={() => updateGroup(group.id, { archived: undefined })}>
            <ArchiveRestore className="size-4" /> Unarchive
          </button>
        ) : (
          <button
            className="btn btn-secondary"
            onClick={() => {
              updateGroup(group.id, { archived: true })
              navigate('/')
              toast(`Archived “${group.name}”`, { label: 'Undo', run: () => updateGroup(group.id, { archived: undefined }) })
            }}
          >
            <Archive className="size-4" /> Archive
          </button>
        )}
        <button className="btn btn-danger" onClick={remove}>
          <Trash2 className="size-4" /> Delete group
        </button>
      </div>
      <p className="mt-3 text-[13px] text-muted">Archived groups move to the bottom of your list and can be brought back any time.</p>
    </Card>
  )
}
