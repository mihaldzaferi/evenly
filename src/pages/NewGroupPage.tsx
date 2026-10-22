import { ChevronLeft, UserPlus, X } from 'lucide-react'
import { useRef, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { Avatar } from '../components/Avatar'
import { CurrencySelect } from '../components/CurrencySelect'
import { EmojiField } from '../components/EmojiField'
import { defaultCurrency } from '../lib/locale'
import { useStore } from '../store/useStore'

export function NewGroupPage() {
  const createGroup = useStore((s) => s.createGroup)
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [emoji, setEmoji] = useState('✈️')
  const [currency, setCurrency] = useState(defaultCurrency)
  const [people, setPeople] = useState(['', ''])
  const [submitted, setSubmitted] = useState(false)
  const list = useRef<HTMLUListElement>(null)

  const names = people.map((p) => p.trim()).filter(Boolean)
  const duplicate = names.find((n, i) => names.findIndex((m) => m.toLowerCase() === n.toLowerCase()) !== i)
  const error = !name.trim()
    ? 'Give the group a name.'
    : names.length < 2
      ? 'Add at least two people.'
      : duplicate
        ? `“${duplicate}” is listed twice. Add an initial to tell them apart.`
        : null

  function addPerson() {
    setPeople((p) => [...p, ''])
    // Focus the new field once it renders.
    requestAnimationFrame(() => list.current?.querySelector<HTMLInputElement>('li:last-child input')?.focus())
  }

  function submit(e: FormEvent) {
    e.preventDefault()
    setSubmitted(true)
    if (error) return
    const group = createGroup({ name: name.trim(), emoji, currency, memberNames: names })
    navigate(`/g/${group.id}`, { replace: true })
  }

  return (
    <div className="mx-auto max-w-xl">
      <Link to="/" className="mb-4 inline-flex items-center gap-1 rounded-lg text-sm text-muted hover:text-ink">
        <ChevronLeft className="size-4" /> All groups
      </Link>
      <h1 className="text-2xl font-semibold tracking-tight">New group</h1>
      <p className="mt-1 text-sm text-muted">A trip, a shared flat, a dinner club — anything you split costs for.</p>

      <form onSubmit={submit} className="card mt-6 space-y-6 p-5 sm:p-6" noValidate>
        <div>
          <label htmlFor="group-name" className="label">
            Name
          </label>
          <input
            id="group-name"
            className="field"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Summer in Lofoten"
            maxLength={80}
            autoFocus
          />
        </div>

        <div>
          <span className="label">Icon</span>
          <EmojiField value={emoji} onChange={setEmoji} />
        </div>

        <div>
          <label htmlFor="group-currency" className="label">
            Main currency
          </label>
          <CurrencySelect id="group-currency" value={currency} onChange={setCurrency} />
          <p className="mt-1.5 text-[13px] text-muted">Balances are kept in this currency. Each expense can still be in any currency.</p>
        </div>

        <div>
          <span className="label">People</span>
          <ul ref={list} className="space-y-2">
            {people.map((p, i) => (
              <li key={i} className="flex items-center gap-2">
                <Avatar name={p || '?'} index={i} size={32} />
                <input
                  aria-label={i === 0 ? 'Your name' : `Person ${i + 1}`}
                  className="field"
                  value={p}
                  maxLength={60}
                  placeholder={i === 0 ? 'Your name' : `Person ${i + 1}`}
                  onChange={(e) => setPeople(people.map((x, j) => (j === i ? e.target.value : x)))}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && i === people.length - 1 && p.trim()) {
                      e.preventDefault()
                      addPerson()
                    }
                  }}
                />
                {people.length > 2 && (
                  <button
                    type="button"
                    className="btn btn-ghost btn-icon"
                    aria-label={`Remove ${p || `person ${i + 1}`}`}
                    onClick={() => setPeople(people.filter((_, j) => j !== i))}
                  >
                    <X className="size-4" />
                  </button>
                )}
              </li>
            ))}
          </ul>
          <button type="button" className="btn btn-ghost btn-sm mt-2 -ml-2 text-accent-text" onClick={addPerson}>
            <UserPlus className="size-4" /> Add person
          </button>
          <p className="mt-1 text-[13px] text-muted">You can add more people later.</p>
        </div>

        {submitted && error && <p className="text-[13px] text-neg-text">{error}</p>}
        <div className="flex justify-end gap-2 border-t border-line pt-5">
          <Link to="/" className="btn btn-ghost">
            Cancel
          </Link>
          <button type="submit" className="btn btn-primary">
            Create group
          </button>
        </div>
      </form>
    </div>
  )
}
