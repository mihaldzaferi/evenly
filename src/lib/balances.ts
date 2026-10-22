import { amountInGroupCurrency, shares } from './split'
import type { Group, ID, Transfer } from './types'

export interface MemberSummary {
  id: ID
  /** Total this member paid for expenses. */
  paid: number
  /** This member's share of all expenses. */
  share: number
  /** Repayments this member sent to others. */
  sent: number
  /** Repayments this member received from others. */
  received: number
  /** Positive: the group owes them. Negative: they owe the group. */
  net: number
}

/** Per-member totals in group-currency minor units, in member order. */
export function summarize(group: Group): MemberSummary[] {
  const byId = new Map<ID, MemberSummary>(
    group.members.map((m) => [m.id, { id: m.id, paid: 0, share: 0, sent: 0, received: 0, net: 0 }]),
  )
  const get = (id: ID) => {
    let s = byId.get(id)
    if (!s) {
      // Data referencing an unknown member (e.g. a hand-edited import) still balances.
      s = { id, paid: 0, share: 0, sent: 0, received: 0, net: 0 }
      byId.set(id, s)
    }
    return s
  }

  for (const e of group.expenses) {
    get(e.paidBy).paid += amountInGroupCurrency(e, group.currency)
    for (const [id, owed] of shares(e, group.currency)) get(id).share += owed
  }
  for (const s of group.settlements) {
    get(s.from).sent += s.amount
    get(s.to).received += s.amount
  }
  for (const s of byId.values()) s.net = s.paid - s.share + s.sent - s.received
  return [...byId.values()]
}

/** Largest group size solved exactly; 2^16 subsets is still instant. */
const OPTIMAL_LIMIT = 16

/**
 * The fewest transfers that bring every balance to zero.
 *
 * Any set of n people with non-zero balances can settle in n − 1 transfers,
 * but if they split into k subgroups that each sum to zero, n − k transfers
 * are enough — and that is optimal. So we find the partition with the most
 * zero-sum subgroups (a subset DP, exact for up to 16 people with a non-zero
 * balance), then settle each subgroup greedily: largest debtor pays largest
 * creditor. Larger groups fall back to the greedy pass alone.
 */
export function settleUp(net: Iterable<[ID, number]>): Transfer[] {
  const people = [...net].filter(([, amount]) => amount !== 0)
  if (people.length === 0) return []
  const balanced = people.reduce((acc, [, a]) => acc + a, 0) === 0
  const groups = balanced && people.length <= OPTIMAL_LIMIT ? zeroSumPartition(people) : [people]
  // List payments in the order people were given (usually member order), so they read predictably.
  const order = new Map(people.map(([id], i) => [id, i]))
  return groups.flatMap(greedy).sort((a, b) => order.get(a.from)! - order.get(b.from)! || order.get(a.to)! - order.get(b.to)!)
}

export function suggestedTransfers(group: Group): Transfer[] {
  return settleUp(summarize(group).map((s) => [s.id, s.net]))
}

function zeroSumPartition(people: [ID, number][]): [ID, number][][] {
  const n = people.length
  const size = 1 << n
  const sum = new Float64Array(size)
  const best = new Uint8Array(size)

  for (let mask = 1; mask < size; mask++) {
    const low = mask & -mask
    sum[mask] = sum[mask ^ low] + people[31 - Math.clz32(low)][1]
    let most = 0
    for (let rest = mask; rest; rest &= rest - 1) {
      const bit = rest & -rest
      if (best[mask ^ bit] > most) most = best[mask ^ bit]
    }
    best[mask] = most + (sum[mask] === 0 ? 1 : 0)
  }

  // Walk back from the full set, removing one person at a time along an
  // optimal path. Read forwards, every zero-sum prefix closes a subgroup.
  const removed: number[] = []
  for (let mask = size - 1; mask; ) {
    const bonus = sum[mask] === 0 ? 1 : 0
    for (let rest = mask; rest; rest &= rest - 1) {
      const bit = rest & -rest
      if (best[mask ^ bit] + bonus === best[mask]) {
        removed.push(31 - Math.clz32(bit))
        mask ^= bit
        break
      }
    }
  }

  const groups: [ID, number][][] = []
  let current: [ID, number][] = []
  let running = 0
  for (const i of removed.reverse()) {
    current.push(people[i])
    running += people[i][1]
    if (running === 0) {
      groups.push(current)
      current = []
    }
  }
  return groups
}

function greedy(people: [ID, number][]): Transfer[] {
  const rank = (list: { id: ID; amount: number; order: number }[]) =>
    list.sort((a, b) => b.amount - a.amount || a.order - b.order)
  const debtors = people.flatMap(([id, a], order) => (a < 0 ? [{ id, amount: -a, order }] : []))
  const creditors = people.flatMap(([id, a], order) => (a > 0 ? [{ id, amount: a, order }] : []))
  const transfers: Transfer[] = []

  while (debtors.length && creditors.length) {
    rank(debtors)
    rank(creditors)
    const d = debtors[0]
    const c = creditors[0]
    const amount = Math.min(d.amount, c.amount)
    transfers.push({ from: d.id, to: c.id, amount })
    d.amount -= amount
    c.amount -= amount
    if (d.amount === 0) debtors.shift()
    if (c.amount === 0) creditors.shift()
  }
  return transfers
}

/** True when a member has never paid, owed, sent or received anything. */
export function memberIsUnused(group: Group, id: ID): boolean {
  return (
    !group.expenses.some((e) => e.paidBy === id || (e.split.weights[id] ?? 0) > 0) &&
    !group.settlements.some((s) => s.from === id || s.to === id)
  )
}
