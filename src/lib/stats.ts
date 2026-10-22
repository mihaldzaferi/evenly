import { addDays, daysBetween, monthRange } from './dates'
import { amountInGroupCurrency } from './split'
import type { CategoryId, Expense, Group } from './types'

export interface GroupStats {
  total: number
  count: number
  biggest: Expense | null
  /** Days from the first to the last expense, inclusive. */
  days: number
  byCategory: { category: CategoryId; total: number; count: number }[]
  /** Every month from the first expense to the last, including empty ones. */
  byMonth: { month: string; total: number }[]
  /** Every day from the first expense to the last, including empty ones. */
  byDay: { day: string; total: number }[]
}

export function groupStats(group: Group): GroupStats {
  const cats = new Map<CategoryId, { total: number; count: number }>()
  const months = new Map<string, number>()
  const daily = new Map<string, number>()
  let total = 0
  let biggest: Expense | null = null
  let biggestAmount = -1
  let first = ''
  let last = ''

  for (const e of group.expenses) {
    const amount = amountInGroupCurrency(e, group.currency)
    total += amount
    if (amount > biggestAmount) {
      biggest = e
      biggestAmount = amount
    }
    const c = cats.get(e.category) ?? { total: 0, count: 0 }
    c.total += amount
    c.count += 1
    cats.set(e.category, c)
    const month = e.date.slice(0, 7)
    months.set(month, (months.get(month) ?? 0) + amount)
    daily.set(e.date, (daily.get(e.date) ?? 0) + amount)
    if (!first || e.date < first) first = e.date
    if (!last || e.date > last) last = e.date
  }

  const days = first ? daysBetween(first, last) + 1 : 0
  return {
    total,
    count: group.expenses.length,
    biggest,
    days,
    byCategory: [...cats]
      .map(([category, v]) => ({ category, ...v }))
      .sort((a, b) => b.total - a.total),
    byMonth: first ? monthRange(first.slice(0, 7), last.slice(0, 7)).map((month) => ({ month, total: months.get(month) ?? 0 })) : [],
    byDay: Array.from({ length: days }, (_, i) => {
      const day = addDays(first, i)
      return { day, total: daily.get(day) ?? 0 }
    }),
  }
}
