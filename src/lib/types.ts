/**
 * Domain model. All money is stored as integers in the currency's *minor*
 * unit (cents, øre, …) so arithmetic is exact. JPY has no minor unit, so
 * ¥500 is stored as 500; EUR 12.50 is stored as 1250.
 */

export type ID = string

export interface Member {
  id: ID
  name: string
}

export type SplitMode = 'equal' | 'exact' | 'percent' | 'shares'

/**
 * How an expense is divided. `weights` is keyed by member id, and only members
 * present in it take part:
 * - equal:   1 for every participant
 * - exact:   the amount each participant owes, in the expense's minor units
 * - percent: basis points (25% = 2500); must add up to 10000
 * - shares:  positive whole numbers (2 shares costs twice as much as 1)
 */
export interface Split {
  mode: SplitMode
  weights: Record<ID, number>
}

export type CategoryId =
  | 'food'
  | 'groceries'
  | 'transport'
  | 'lodging'
  | 'entertainment'
  | 'shopping'
  | 'utilities'
  | 'travel'
  | 'health'
  | 'other'

export interface Expense {
  id: ID
  title: string
  /** In minor units of `currency`. */
  amount: number
  currency: string
  /** Group-currency units per one unit of `currency`. 1 when they match. */
  rate: number
  paidBy: ID
  split: Split
  category: CategoryId
  /** Local calendar date, YYYY-MM-DD. */
  date: string
  note?: string
  createdAt: number
}

/** A direct payment between two members ("Ana paid Ben back 20"). */
export interface Settlement {
  id: ID
  from: ID
  to: ID
  /** In minor units of the group currency. */
  amount: number
  date: string
  note?: string
  createdAt: number
}

export interface Group {
  id: ID
  name: string
  emoji: string
  /** ISO 4217 code that balances are kept in. */
  currency: string
  members: Member[]
  expenses: Expense[]
  settlements: Settlement[]
  /** Which member is "you" on this device, if chosen. */
  meId?: ID
  archived?: boolean
  createdAt: number
  updatedAt: number
}

/** A suggested or recorded transfer that moves money from one member to another. */
export interface Transfer {
  from: ID
  to: ID
  amount: number
}
