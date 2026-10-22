import { displayName } from '../lib/members'
import type { Group, ID } from '../lib/types'
import { Avatar } from './Avatar'

/** A row of overlapping avatars, e.g. in group headers and cards. */
export function AvatarStack({ group, size = 28, max = 5 }: { group: Group; size?: number; max?: number }) {
  const shown = group.members.slice(0, max)
  const extra = group.members.length - shown.length
  return (
    <div className="flex items-center -space-x-1.5">
      {shown.map((m, i) => (
        <Avatar key={m.id} name={m.name} index={i} size={size} ring />
      ))}
      {extra > 0 && (
        <span
          className="inline-grid place-items-center rounded-full bg-surface-2 text-[11px] font-semibold text-ink-2 ring-2 ring-surface"
          style={{ width: size, height: size }}
        >
          +{extra}
        </span>
      )}
    </div>
  )
}

/** Avatar chips that act as radio buttons, for picking one member. */
export function MemberRadio({
  group,
  value,
  onChange,
  label,
}: {
  group: Group
  value: ID | undefined
  onChange: (id: ID) => void
  label: string
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-1.5">
      {group.members.map((m, i) => (
        <button
          key={m.id}
          type="button"
          role="radio"
          aria-checked={value === m.id}
          onClick={() => onChange(m.id)}
          className={`flex h-9 items-center gap-2 rounded-full border pr-3.5 pl-1 text-sm transition-colors ${
            value === m.id ? 'border-accent bg-accent-soft font-medium text-ink' : 'border-line bg-surface text-ink-2 hover:bg-surface-2'
          }`}
        >
          <Avatar name={m.name} index={i} size={26} />
          {displayName(group, m.id, m.name)}
        </button>
      ))}
    </div>
  )
}
