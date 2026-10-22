import { describe, expect, it } from 'vitest'
import { groupToCsv } from '../src/lib/csv'
import { groupStats } from '../src/lib/stats'
import { expense, makeGroup } from './helpers'

describe('groupStats', () => {
  it('totals by category and month, filling empty months', () => {
    const g = makeGroup(['a', 'b'])
    g.expenses.push(expense('a', 1000, ['a', 'b'], { category: 'food', date: '2026-08-30' }))
    g.expenses.push(expense('b', 3000, ['a', 'b'], { category: 'lodging', date: '2026-10-02' }))
    g.expenses.push(expense('b', 500, ['a', 'b'], { category: 'food', date: '2026-10-03' }))
    const s = groupStats(g)
    expect(s.total).toBe(4500)
    expect(s.days).toBe(35)
    expect(s.biggest?.amount).toBe(3000)
    expect(s.byCategory).toEqual([
      { category: 'lodging', total: 3000, count: 1 },
      { category: 'food', total: 1500, count: 2 },
    ])
    expect(s.byMonth).toEqual([
      { month: '2026-08', total: 1000 },
      { month: '2026-09', total: 0 },
      { month: '2026-10', total: 3500 },
    ])
    expect(s.byDay).toHaveLength(35)
    expect(s.byDay[0]).toEqual({ day: '2026-08-30', total: 1000 })
    expect(s.byDay[34]).toEqual({ day: '2026-10-03', total: 500 })
  })

  it('handles an empty group', () => {
    expect(groupStats(makeGroup(['a']))).toMatchObject({ total: 0, count: 0, days: 0, byMonth: [], byDay: [] })
  })
})

describe('groupToCsv', () => {
  it('writes a row per expense and payment with member shares', () => {
    const g = makeGroup(['Ana', 'Ben'])
    g.expenses.push(expense('Ana', 1000, ['Ana', 'Ben'], { title: 'Dinner, "fancy"' }))
    g.settlements.push({ id: 's', from: 'Ben', to: 'Ana', amount: 500, date: '2026-10-05', createdAt: 0 })
    const lines = groupToCsv(g).trim().split('\r\n')
    expect(lines[0]).toBe('Date,Type,Description,Category,Paid by,Paid to,Amount,Currency,Rate,Amount (EUR),Ana share (EUR),Ben share (EUR)')
    expect(lines[1]).toBe('2026-10-01,Expense,"Dinner, ""fancy""",Other,Ana,,10,EUR,1,10,5,5')
    expect(lines[2]).toBe('2026-10-05,Payment,Payment,,Ben,Ana,5,EUR,1,5,,')
  })

  it('neutralises spreadsheet formulas', () => {
    const g = makeGroup(['a'])
    g.expenses.push(expense('a', 100, ['a'], { title: '=HYPERLINK("x")' }))
    expect(groupToCsv(g)).toContain(`"'=HYPERLINK(""x"")"`)
  })
})
