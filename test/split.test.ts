import { describe, expect, it } from 'vitest'
import { checkSplit, shares } from '../src/lib/split'
import { expense } from './helpers'

describe('shares', () => {
  it('splits equally among the people ticked', () => {
    const e = expense('a', 1000, ['a', 'b', 'c'])
    expect(Object.fromEntries(shares(e, 'EUR'))).toEqual({ a: 334, b: 333, c: 333 })
  })

  it('uses exact amounts as given', () => {
    const e = expense('a', 1000, { mode: 'exact', weights: { a: 250, b: 750 } })
    expect(Object.fromEntries(shares(e, 'EUR'))).toEqual({ a: 250, b: 750 })
  })

  it('uses percentages (basis points)', () => {
    const e = expense('a', 21000, { mode: 'percent', weights: { a: 4000, b: 3000, c: 3000 } })
    expect(Object.fromEntries(shares(e, 'EUR'))).toEqual({ a: 8400, b: 6300, c: 6300 })
  })

  it('uses shares as weights', () => {
    const e = expense('a', 900, { mode: 'shares', weights: { a: 2, b: 1 } })
    expect(Object.fromEntries(shares(e, 'EUR'))).toEqual({ a: 600, b: 300 })
  })

  it('converts foreign expenses before splitting, keeping the total exact', () => {
    const e = expense('a', 1000, ['a', 'b', 'c'], { currency: 'EUR', rate: 11.62 })
    const s = shares(e, 'NOK')
    expect([...s.values()].reduce((x, y) => x + y, 0)).toBe(11620)
  })

  it('ignores people with zero weight', () => {
    const e = expense('a', 1000, { mode: 'shares', weights: { a: 1, b: 0 } })
    expect(Object.fromEntries(shares(e, 'EUR'))).toEqual({ a: 1000 })
  })
})

describe('checkSplit', () => {
  it('needs at least one participant', () => {
    expect(checkSplit({ mode: 'equal', weights: {} }, 100).ok).toBe(false)
  })

  it('reports what is left to assign for exact splits', () => {
    expect(checkSplit({ mode: 'exact', weights: { a: 300 } }, 1000)).toMatchObject({ ok: false, remaining: 700 })
    expect(checkSplit({ mode: 'exact', weights: { a: 1200 } }, 1000)).toMatchObject({ ok: false, remaining: -200 })
    expect(checkSplit({ mode: 'exact', weights: { a: 400, b: 600 } }, 1000).ok).toBe(true)
  })

  it('requires percentages to reach 100%', () => {
    expect(checkSplit({ mode: 'percent', weights: { a: 5000, b: 4000 } }, 1).remaining).toBe(1000)
    expect(checkSplit({ mode: 'percent', weights: { a: 5000, b: 5000 } }, 1).ok).toBe(true)
  })

  it('rejects fractional or negative weights', () => {
    expect(checkSplit({ mode: 'shares', weights: { a: 1.5 } }, 1).ok).toBe(false)
    expect(checkSplit({ mode: 'shares', weights: { a: -1, b: 2 } }, 1).ok).toBe(false)
  })
})
