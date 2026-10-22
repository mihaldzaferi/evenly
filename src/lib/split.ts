import { allocate, convert } from './money'
import type { Expense, ID, Split, SplitMode } from './types'

/** The expense amount converted to the group currency, in minor units. */
export function amountInGroupCurrency(expense: Expense, groupCurrency: string): number {
  return convert(expense.amount, expense.currency, expense.rate, groupCurrency)
}

/** Members taking part in a split, in the order they were added to it. */
export function participants(split: Split): ID[] {
  return Object.keys(split.weights).filter((id) => split.weights[id] > 0)
}

/**
 * What each participant owes for an expense, in group-currency minor units.
 * Every mode reduces to proportional weights, and `allocate` guarantees the
 * shares add up to the converted total exactly — no cent is lost or invented.
 */
export function shares(expense: Expense, groupCurrency: string): Map<ID, number> {
  const ids = participants(expense.split)
  const weights = ids.map((id) => (expense.split.mode === 'equal' ? 1 : expense.split.weights[id]))
  const parts = allocate(amountInGroupCurrency(expense, groupCurrency), weights)
  return new Map(ids.map((id, i) => [id, parts[i]]))
}

export function equalSplit(memberIds: ID[]): Split {
  return { mode: 'equal', weights: Object.fromEntries(memberIds.map((id) => [id, 1])) }
}

export interface SplitCheck {
  ok: boolean
  /** Human-readable reason when `ok` is false. */
  error?: string
  /**
   * For exact and percent splits: how much is still unassigned (negative when
   * over-assigned), in the expense's minor units or basis points.
   */
  remaining?: number
}

export function checkSplit(split: Split, amount: number): SplitCheck {
  const ids = participants(split)
  const values = Object.values(split.weights)
  if (values.some((v) => !Number.isFinite(v) || v < 0 || !Number.isInteger(v))) {
    return { ok: false, error: 'Use whole, positive numbers.' }
  }
  if (ids.length === 0) return { ok: false, error: 'Pick at least one person.' }

  const sum = ids.reduce((acc, id) => acc + split.weights[id], 0)
  switch (split.mode) {
    case 'equal':
    case 'shares':
      return { ok: true }
    case 'exact': {
      const remaining = amount - sum
      return remaining === 0
        ? { ok: true, remaining }
        : { ok: false, remaining, error: remaining > 0 ? 'Not all of it is assigned yet.' : 'The amounts add up to more than the total.' }
    }
    case 'percent': {
      const remaining = 10000 - sum
      return remaining === 0
        ? { ok: true, remaining }
        : { ok: false, remaining, error: 'Percentages must add up to 100%.' }
    }
  }
}

export const SPLIT_MODES: { id: SplitMode; label: string; hint: string }[] = [
  { id: 'equal', label: 'Equally', hint: 'Everyone ticked pays the same.' },
  { id: 'exact', label: 'Exact', hint: 'Type what each person owes.' },
  { id: 'percent', label: 'Percent', hint: 'Give each person a percentage.' },
  { id: 'shares', label: 'Shares', hint: 'E.g. 2 shares for the double room, 1 for a single.' },
]
