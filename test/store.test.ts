// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import { useStore } from '../src/store/useStore'
import { expense } from './helpers'

const store = () => useStore.getState()

beforeEach(() => {
  localStorage.clear()
  useStore.setState({ groups: [] })
})

describe('store', () => {
  it('creates a group with "you" set to the first person', () => {
    const g = store().createGroup({ name: 'Trip', emoji: '✈️', currency: 'EUR', memberNames: ['Mia', 'Ola'] })
    expect(g.members.map((m) => m.name)).toEqual(['Mia', 'Ola'])
    expect(g.meId).toBe(g.members[0].id)
    expect(store().groups).toHaveLength(1)
  })

  it('persists to localStorage', () => {
    store().createGroup({ name: 'Saved', emoji: '💾', currency: 'NOK', memberNames: ['A', 'B'] })
    expect(JSON.parse(localStorage.getItem('evenly')!).state.groups[0].name).toBe('Saved')
  })

  it('stamps new expenses and keeps the timestamp on edit', () => {
    const g = store().createGroup({ name: 'T', emoji: '✈️', currency: 'EUR', memberNames: ['a', 'b'] })
    const [a, b] = g.members.map((m) => m.id)
    const { createdAt: _, ...draft } = expense(a, 1000, [a, b])
    store().saveExpense(g.id, draft)
    const saved = store().groups[0].expenses[0]
    expect(saved.createdAt).toBeGreaterThan(0)
    store().saveExpense(g.id, { ...saved, title: 'Renamed' })
    expect(store().groups[0].expenses).toHaveLength(1)
    expect(store().groups[0].expenses[0]).toMatchObject({ title: 'Renamed', createdAt: saved.createdAt })
  })

  it('only removes members without activity', () => {
    const g = store().createGroup({ name: 'T', emoji: '✈️', currency: 'EUR', memberNames: ['a', 'b', 'c'] })
    const [a, b, c] = g.members.map((m) => m.id)
    store().saveExpense(g.id, expense(a, 1000, [a, b]))
    expect(store().removeMember(g.id, b)).toBe(false)
    expect(store().removeMember(g.id, c)).toBe(true)
    expect(store().groups[0].members.map((m) => m.id)).toEqual([a, b])
  })

  it('imports as a copy or replaces, keeping who "you" are', () => {
    const g = store().createGroup({ name: 'Mine', emoji: '✈️', currency: 'EUR', memberNames: ['a', 'b'] })
    const incoming = { ...g, name: 'From friend', meId: undefined }

    const copyId = store().importGroup(incoming, 'copy')
    expect(copyId).not.toBe(g.id)
    expect(store().groups).toHaveLength(2)

    expect(store().importGroup(incoming, 'replace')).toBe(g.id)
    const replaced = store().groups.find((x) => x.id === g.id)!
    expect(replaced.name).toBe('From friend')
    expect(replaced.meId).toBe(g.meId)
  })

  it('restores a deleted group in its old position', () => {
    const first = store().createGroup({ name: '1', emoji: '1️⃣', currency: 'EUR', memberNames: ['a', 'b'] })
    store().createGroup({ name: '2', emoji: '2️⃣', currency: 'EUR', memberNames: ['a', 'b'] })
    const index = store().groups.findIndex((g) => g.id === first.id)
    store().deleteGroup(first.id)
    store().restoreGroup(first, index)
    expect(store().groups.map((g) => g.name)).toEqual(['2', '1'])
  })
})
