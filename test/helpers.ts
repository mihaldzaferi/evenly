import { equalSplit } from '../src/lib/split'
import type { Expense, Group, Split } from '../src/lib/types'

export function makeGroup(names: string[], currency = 'EUR'): Group {
  return {
    id: 'g1',
    name: 'Test',
    emoji: '🧪',
    currency,
    members: names.map((n) => ({ id: n, name: n })),
    expenses: [],
    settlements: [],
    createdAt: 0,
    updatedAt: 0,
  }
}

let seq = 0
export function expense(
  paidBy: string,
  amount: number,
  split: Split | string[],
  extra: Partial<Expense> = {},
): Expense {
  return {
    id: `e${++seq}`,
    title: 'Thing',
    amount,
    currency: 'EUR',
    rate: 1,
    paidBy,
    split: Array.isArray(split) ? equalSplit(split) : split,
    category: 'other',
    date: '2026-10-01',
    createdAt: 0,
    ...extra,
  }
}
