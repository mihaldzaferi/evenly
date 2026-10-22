import { CATEGORIES } from './categories'
import { isISODate } from './dates'
import { normalizePaypal, normalizePhone } from './payments'
import { checkSplit } from './split'
import type { CategoryId, Expense, Group, Member, Settlement, SplitMode } from './types'

/** Thrown when imported data isn't a valid group; the message is shown to the user. */
export class InvalidDataError extends Error {}

const SPLIT_MODES: SplitMode[] = ['equal', 'exact', 'percent', 'shares']
const CATEGORY_IDS = new Set<string>(CATEGORIES.map((c) => c.id))

type Obj = Record<string, unknown>

function fail(msg: string): never {
  throw new InvalidDataError(msg)
}
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v)
const str = (v: unknown, what: string, max = 200): string =>
  typeof v === 'string' && v.length <= max ? v : fail(`${what} is missing or too long.`)
const optStr = (v: unknown, what: string, max = 1000): string | undefined =>
  v === undefined ? undefined : str(v, what, max)
const int = (v: unknown, what: string): number =>
  Number.isSafeInteger(v) && (v as number) >= 0 ? (v as number) : fail(`${what} must be a whole, positive number.`)
const date = (v: unknown, what: string): string => (isISODate(v) ? v : fail(`${what} is not a valid date.`))
/** Optional payment details are dropped, not rejected, when they look wrong. */
const payDetail = (v: unknown, clean: (v: string) => string): string | undefined => {
  if (typeof v !== 'string' || v.length > 60) return undefined
  return clean(v) || undefined
}
const currency = (v: unknown): string =>
  typeof v === 'string' && /^[A-Z]{3}$/.test(v) ? v : fail('Currency must be a 3-letter code like EUR.')

/**
 * Checks untrusted data (a shared link or a backup file) and returns a clean
 * Group. Unknown fields are dropped, and anything that would break balances
 * — like an expense paid by someone who isn't a member — is rejected.
 */
export function parseGroup(input: unknown): Group {
  if (!isObj(input)) fail('This doesn’t look like an Evenly group.')
  const members: Member[] = Array.isArray(input.members)
    ? input.members.map((m, i) => {
        if (!isObj(m)) fail(`Member ${i + 1} is invalid.`)
        return {
          id: str(m.id, 'Member id', 64),
          name: str(m.name, 'Member name', 60),
          phone: payDetail(m.phone, normalizePhone),
          paypal: payDetail(m.paypal, normalizePaypal),
          account: payDetail(m.account, (v) => v.trim()),
        }
      })
    : fail('The group has no members list.')
  const ids = new Set(members.map((m) => m.id))
  if (ids.size !== members.length) fail('Two members share the same id.')
  const member = (v: unknown, what: string) => {
    const id = str(v, what, 64)
    return ids.has(id) ? id : fail(`${what} isn’t a member of the group.`)
  }

  const groupCurrency = currency(input.currency)
  const expenses: Expense[] = (Array.isArray(input.expenses) ? input.expenses : []).map((e, i) => {
    const what = `Expense ${i + 1}`
    if (!isObj(e) || !isObj(e.split) || !isObj(e.split.weights)) fail(`${what} is invalid.`)
    const mode = SPLIT_MODES.includes(e.split.mode as SplitMode) ? (e.split.mode as SplitMode) : fail(`${what} has an unknown split.`)
    const weights: Record<string, number> = {}
    for (const [id, w] of Object.entries(e.split.weights)) weights[member(id, `${what}’s split`)] = int(w, `${what}’s split`)
    const amount = int(e.amount, `${what}’s amount`)
    const check = checkSplit({ mode, weights }, amount)
    if (!check.ok) fail(`${what}: ${check.error}`)
    const rate = typeof e.rate === 'number' && e.rate > 0 && Number.isFinite(e.rate) ? e.rate : fail(`${what} has an invalid exchange rate.`)
    return {
      id: str(e.id, `${what} id`, 64),
      title: str(e.title, `${what}’s title`),
      amount,
      currency: currency(e.currency),
      rate: e.currency === groupCurrency ? 1 : rate,
      paidBy: member(e.paidBy, `${what}’s payer`),
      split: { mode, weights },
      category: CATEGORY_IDS.has(e.category as string) ? (e.category as CategoryId) : 'other',
      date: date(e.date, `${what}’s date`),
      note: optStr(e.note, `${what}’s note`),
      createdAt: typeof e.createdAt === 'number' ? e.createdAt : Date.now(),
    }
  })

  const settlements: Settlement[] = (Array.isArray(input.settlements) ? input.settlements : []).map((s, i) => {
    const what = `Payment ${i + 1}`
    if (!isObj(s)) fail(`${what} is invalid.`)
    const from = member(s.from, `${what}’s sender`)
    const to = member(s.to, `${what}’s receiver`)
    if (from === to) fail(`${what} is from someone to themselves.`)
    return {
      id: str(s.id, `${what} id`, 64),
      from,
      to,
      amount: int(s.amount, `${what}’s amount`),
      date: date(s.date, `${what}’s date`),
      note: optStr(s.note, `${what}’s note`),
      createdAt: typeof s.createdAt === 'number' ? s.createdAt : Date.now(),
    }
  })

  const now = Date.now()
  return {
    id: str(input.id, 'Group id', 64),
    name: str(input.name, 'Group name', 80),
    emoji: typeof input.emoji === 'string' && input.emoji.length <= 16 ? input.emoji : '💸',
    currency: groupCurrency,
    members,
    expenses,
    settlements,
    meId: typeof input.meId === 'string' && ids.has(input.meId) ? input.meId : undefined,
    archived: input.archived === true ? true : undefined,
    createdAt: typeof input.createdAt === 'number' ? input.createdAt : now,
    updatedAt: typeof input.updatedAt === 'number' ? input.updatedAt : now,
  }
}
