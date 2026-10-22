import { describe, expect, it } from 'vitest'
import { demoGroups } from '../src/lib/demo'
import { decodeGroup, encodeGroup } from '../src/lib/share'
import { parseGroup } from '../src/lib/validate'
import { expense, makeGroup } from './helpers'

describe('share links', () => {
  it('round-trips a group, minus device-only fields', async () => {
    const [group] = demoGroups()
    const code = await encodeGroup({ ...group, archived: true })
    expect(code).toMatch(/^1\.[A-Za-z0-9_-]+$/)
    const back = await decodeGroup(code)
    expect(back).toEqual({ ...group, meId: undefined, archived: undefined })
  })

  it('stays short enough to paste into a chat', async () => {
    const [, flat] = demoGroups()
    const code = await encodeGroup(flat)
    expect(code.length).toBeLessThan(2500)
  })

  it('rejects damaged or foreign links', async () => {
    await expect(decodeGroup('1.notreallydata')).rejects.toThrow(/damaged/)
    await expect(decodeGroup('9.abc')).rejects.toThrow(/version/)
  })
})

describe('parseGroup', () => {
  it('accepts valid data and drops unknown fields', () => {
    const g = makeGroup(['a', 'b'])
    g.expenses.push(expense('a', 100, ['a', 'b']))
    const parsed = parseGroup({ ...g, hacker: true, expenses: [{ ...g.expenses[0], extra: 1 }] })
    expect(parsed).not.toHaveProperty('hacker')
    expect(parsed.expenses[0]).not.toHaveProperty('extra')
  })

  it('rejects expenses that reference strangers', () => {
    const g = makeGroup(['a', 'b'])
    g.expenses.push(expense('zed', 100, ['a', 'b']))
    expect(() => parseGroup(g)).toThrow(/payer isn’t a member/)
  })

  it('rejects splits that do not add up', () => {
    const g = makeGroup(['a', 'b'])
    g.expenses.push(expense('a', 100, { mode: 'exact', weights: { a: 10, b: 10 } }))
    expect(() => parseGroup(g)).toThrow(/assigned/)
  })

  it('rejects malformed values', () => {
    expect(() => parseGroup(null)).toThrow()
    expect(() => parseGroup({ ...makeGroup(['a']), currency: 'euro' })).toThrow(/Currency/)
    const g = makeGroup(['a'])
    g.expenses.push(expense('a', 100, ['a'], { date: '2026-02-30' }))
    expect(() => parseGroup(g)).toThrow(/date/)
  })
})
