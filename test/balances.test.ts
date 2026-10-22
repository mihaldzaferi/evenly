import { describe, expect, it } from 'vitest'
import { memberIsUnused, settleUp, suggestedTransfers, summarize } from '../src/lib/balances'
import type { Transfer } from '../src/lib/types'
import { expense, makeGroup } from './helpers'

function apply(balances: number[], transfers: Transfer[]): number[] {
  const out = [...balances]
  for (const t of transfers) {
    out[Number(t.from)] += t.amount
    out[Number(t.to)] -= t.amount
  }
  return out
}

/** Brute force: the most blocks a zero-sum set can be partitioned into. */
function maxZeroSumBlocks(values: number[]): number {
  if (values.length === 0) return 0
  const [first, ...rest] = values
  let best = 0
  for (let mask = 0; mask < 1 << rest.length; mask++) {
    const inBlock = rest.filter((_, i) => mask & (1 << i))
    if (first + inBlock.reduce((a, b) => a + b, 0) !== 0) continue
    best = Math.max(best, 1 + maxZeroSumBlocks(rest.filter((_, i) => !(mask & (1 << i)))))
  }
  return best
}

function random(seed: number) {
  return () => {
    seed = (seed * 1103515245 + 12345) % 2 ** 31
    return seed / 2 ** 31
  }
}

describe('summarize', () => {
  it('tracks paid, share and net per member', () => {
    const g = makeGroup(['a', 'b', 'c'])
    g.expenses.push(expense('a', 900, ['a', 'b', 'c']))
    g.expenses.push(expense('b', 300, ['b', 'c']))
    const s = Object.fromEntries(summarize(g).map((m) => [m.id, m]))
    expect(s.a).toMatchObject({ paid: 900, share: 300, net: 600 })
    expect(s.b).toMatchObject({ paid: 300, share: 450, net: -150 })
    expect(s.c).toMatchObject({ paid: 0, share: 450, net: -450 })
  })

  it('counts repayments', () => {
    const g = makeGroup(['a', 'b'])
    g.expenses.push(expense('a', 1000, ['a', 'b']))
    g.settlements.push({ id: 's', from: 'b', to: 'a', amount: 500, date: '2026-10-02', createdAt: 0 })
    expect(summarize(g).map((m) => m.net)).toEqual([0, 0])
    expect(suggestedTransfers(g)).toEqual([])
  })

  it('always sums to zero', () => {
    const g = makeGroup(['a', 'b', 'c', 'd'])
    g.expenses.push(expense('a', 1001, ['a', 'b', 'c']))
    g.expenses.push(expense('d', 777, { mode: 'shares', weights: { a: 1, b: 2, d: 4 } }))
    g.expenses.push(expense('c', 1000, ['b', 'c'], { currency: 'USD', rate: 0.917 }))
    expect(summarize(g).reduce((acc, m) => acc + m.net, 0)).toBe(0)
  })
})

describe('settleUp', () => {
  it('returns nothing when everyone is even', () => {
    expect(settleUp([['a', 0], ['b', 0]])).toEqual([])
  })

  it('pays creditors from debtors', () => {
    expect(settleUp([['a', 600], ['b', -150], ['c', -450]])).toEqual([
      { from: 'c', to: 'a', amount: 450 },
      { from: 'b', to: 'a', amount: 150 },
    ])
  })

  it('beats plain greedy matching when subgroups can settle on their own', () => {
    // Greedy needs 4 transfers here; {+4, −4} and {+3, +2, −5} need only 3.
    const balances = [4, 3, 2, -5, -4]
    const transfers = settleUp(balances.map((b, i) => [String(i), b]))
    expect(transfers).toHaveLength(3)
    expect(apply(balances, transfers)).toEqual([0, 0, 0, 0, 0])
  })

  it('finds the fewest possible transfers (checked against brute force)', () => {
    const rand = random(42)
    for (let run = 0; run < 300; run++) {
      const n = 2 + Math.floor(rand() * 7)
      // Small values make zero-sum subgroups common, which is the hard case.
      const balances = Array.from({ length: n - 1 }, () => Math.floor(rand() * 11) - 5)
      balances.push(-balances.reduce((a, b) => a + b, 0))
      const transfers = settleUp(balances.map((b, i) => [String(i), b]))

      expect(apply(balances, transfers).every((b) => b === 0)).toBe(true)
      expect(transfers.every((t) => t.amount > 0)).toBe(true)
      const nonZero = balances.filter((b) => b !== 0)
      expect(transfers).toHaveLength(nonZero.length - maxZeroSumBlocks(nonZero))
    }
  })

  it('still settles groups too large for the exact search', () => {
    const balances = Array.from({ length: 40 }, (_, i) => (i % 2 ? 100 + i : -(100 + i - 1)))
    balances.push(-balances.reduce((a, b) => a + b, 0))
    const transfers = settleUp(balances.map((b, i) => [String(i), b]))
    expect(apply(balances, transfers).every((b) => b === 0)).toBe(true)
    expect(transfers.length).toBeLessThan(balances.length)
  })
})

describe('memberIsUnused', () => {
  it('detects members with no activity', () => {
    const g = makeGroup(['a', 'b', 'c'])
    g.expenses.push(expense('a', 100, ['a', 'b']))
    expect(memberIsUnused(g, 'a')).toBe(false)
    expect(memberIsUnused(g, 'b')).toBe(false)
    expect(memberIsUnused(g, 'c')).toBe(true)
  })
})
