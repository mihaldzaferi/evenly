/** Dates are stored as local calendar days ("2026-10-22"), never as UTC instants. */

const pad = (n: number) => String(n).padStart(2, '0')

export function toISODate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function today(): string {
  return toISODate(new Date())
}

export function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function addDays(iso: string, days: number): string {
  const d = parseISODate(iso)
  d.setDate(d.getDate() + days)
  return toISODate(d)
}

/** Whole days from `a` to `b` (positive when b is later). */
export function daysBetween(a: string, b: string): number {
  return Math.round((parseISODate(b).getTime() - parseISODate(a).getTime()) / 86_400_000)
}

export function isISODate(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && toISODate(parseISODate(value)) === value
}

export function formatDay(iso: string): string {
  const d = parseISODate(iso)
  const sameYear = d.getFullYear() === new Date().getFullYear()
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', ...(sameYear ? {} : { year: 'numeric' }) })
}

/** "2026-10" → "October 2026" */
export function formatMonth(month: string, style: 'long' | 'short' = 'long'): string {
  const d = parseISODate(`${month}-01`)
  return d.toLocaleDateString(undefined, style === 'long' ? { month: 'long', year: 'numeric' } : { month: 'short' })
}

/** Every "YYYY-MM" from `first` to `last`, inclusive. */
export function monthRange(first: string, last: string): string[] {
  const months: string[] = []
  let [y, m] = first.split('-').map(Number)
  const [ly, lm] = last.split('-').map(Number)
  while (y < ly || (y === ly && m <= lm)) {
    months.push(`${y}-${pad(m)}`)
    m += 1
    if (m > 12) {
      m = 1
      y += 1
    }
  }
  return months
}

const relative = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' })

/** "just now", "5 minutes ago", "yesterday", "3 weeks ago" */
export function timeAgo(ms: number, now = Date.now()): string {
  const seconds = Math.round((ms - now) / 1000)
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ['year', 31_536_000],
    ['month', 2_592_000],
    ['week', 604_800],
    ['day', 86_400],
    ['hour', 3_600],
    ['minute', 60],
  ]
  for (const [unit, size] of units) {
    if (Math.abs(seconds) >= size) return relative.format(Math.round(seconds / size), unit)
  }
  return 'just now'
}
