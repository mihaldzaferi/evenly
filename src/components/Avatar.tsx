import { initials } from '../lib/members'

/** Fixed categorical order, so a member keeps their colour as others join. */
const COLORS = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#6250d6', '#e34948']
/** Light fills (aqua, yellow, magenta) get dark initials for contrast. */
const DARK_TEXT = new Set([2, 3, 4])

export function Avatar({ name, index, size = 32, ring = false }: { name: string; index: number; size?: number; ring?: boolean }) {
  const slot = ((index % COLORS.length) + COLORS.length) % COLORS.length
  return (
    <span
      title={name}
      aria-hidden="true"
      className={`inline-grid shrink-0 place-items-center rounded-full font-semibold select-none ${ring ? 'ring-2 ring-surface' : ''}`}
      style={{
        width: size,
        height: size,
        fontSize: Math.round(size * 0.38),
        background: COLORS[slot],
        color: DARK_TEXT.has(slot) ? '#141413' : '#ffffff',
      }}
    >
      {initials(name)}
    </span>
  )
}
