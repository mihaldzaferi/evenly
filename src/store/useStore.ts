import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { memberIsUnused } from '../lib/balances'
import { demoGroups } from '../lib/demo'
import { newId } from '../lib/ids'
import type { Expense, Group, ID, Member, Settlement } from '../lib/types'

export type Theme = 'system' | 'light' | 'dark'

/** New items may leave createdAt out; the store stamps it. */
type Draft<T extends { createdAt: number }> = Omit<T, 'createdAt'> & { createdAt?: number }

export interface NewGroup {
  name: string
  emoji: string
  currency: string
  memberNames: string[]
}

interface State {
  groups: Group[]
  theme: Theme
  setTheme: (theme: Theme) => void

  createGroup: (input: NewGroup) => Group
  updateGroup: (id: ID, patch: Partial<Pick<Group, 'name' | 'emoji' | 'currency' | 'meId' | 'archived'>>) => void
  deleteGroup: (id: ID) => void
  /** Puts a deleted group back where it was (for undo). */
  restoreGroup: (group: Group, index: number) => void
  /** Adds a group from a share link or file. 'replace' overwrites a group with the same id. */
  importGroup: (group: Group, mode: 'copy' | 'replace') => ID
  replaceAll: (groups: Group[]) => void
  loadDemo: () => ID[]

  addMember: (groupId: ID, name: string) => Member
  renameMember: (groupId: ID, memberId: ID, name: string) => void
  /** Only succeeds for members with no expenses or payments. */
  removeMember: (groupId: ID, memberId: ID) => boolean

  saveExpense: (groupId: ID, expense: Draft<Expense>) => void
  deleteExpense: (groupId: ID, expenseId: ID) => void
  saveSettlement: (groupId: ID, settlement: Draft<Settlement>) => void
  deleteSettlement: (groupId: ID, settlementId: ID) => void
}

const upsert = <T extends { id: ID }>(list: T[], item: T): T[] =>
  list.some((x) => x.id === item.id) ? list.map((x) => (x.id === item.id ? item : x)) : [...list, item]

export const useStore = create<State>()(
  persist(
    (set, get) => {
      /** Applies `fn` to one group and bumps its updatedAt. */
      const change = (groupId: ID, fn: (g: Group) => Group) =>
        set((s) => ({
          groups: s.groups.map((g) => (g.id === groupId ? { ...fn(g), updatedAt: Date.now() } : g)),
        }))

      return {
        groups: [],
        theme: 'system',
        setTheme: (theme) => set({ theme }),

        createGroup: ({ name, emoji, currency, memberNames }) => {
          const now = Date.now()
          const members = memberNames.map((n) => ({ id: newId(), name: n }))
          const group: Group = {
            id: newId(),
            name,
            emoji,
            currency,
            members,
            expenses: [],
            settlements: [],
            meId: members[0]?.id,
            createdAt: now,
            updatedAt: now,
          }
          set((s) => ({ groups: [group, ...s.groups] }))
          return group
        },
        updateGroup: (id, patch) => change(id, (g) => ({ ...g, ...patch })),
        deleteGroup: (id) => set((s) => ({ groups: s.groups.filter((g) => g.id !== id) })),
        restoreGroup: (group, index) =>
          set((s) => {
            const groups = s.groups.filter((g) => g.id !== group.id)
            groups.splice(Math.min(index, groups.length), 0, group)
            return { groups }
          }),
        importGroup: (incoming, mode) => {
          const exists = get().groups.some((g) => g.id === incoming.id)
          if (mode === 'replace' && exists) {
            set((s) => ({
              groups: s.groups.map((g) => (g.id === incoming.id ? { ...incoming, meId: g.meId, updatedAt: Date.now() } : g)),
            }))
            return incoming.id
          }
          const group = { ...incoming, id: exists ? newId() : incoming.id, updatedAt: Date.now() }
          set((s) => ({ groups: [group, ...s.groups] }))
          return group.id
        },
        replaceAll: (groups) => set({ groups }),
        loadDemo: () => {
          const demo = demoGroups()
          set((s) => ({ groups: [...demo, ...s.groups] }))
          return demo.map((g) => g.id)
        },

        addMember: (groupId, name) => {
          const member = { id: newId(), name }
          change(groupId, (g) => ({ ...g, members: [...g.members, member] }))
          return member
        },
        renameMember: (groupId, memberId, name) =>
          change(groupId, (g) => ({ ...g, members: g.members.map((m) => (m.id === memberId ? { ...m, name } : m)) })),
        removeMember: (groupId, memberId) => {
          const group = get().groups.find((g) => g.id === groupId)
          if (!group || !memberIsUnused(group, memberId)) return false
          change(groupId, (g) => ({
            ...g,
            members: g.members.filter((m) => m.id !== memberId),
            meId: g.meId === memberId ? undefined : g.meId,
          }))
          return true
        },

        saveExpense: (groupId, expense) =>
          change(groupId, (g) => ({ ...g, expenses: upsert(g.expenses, { ...expense, createdAt: expense.createdAt ?? Date.now() }) })),
        deleteExpense: (groupId, expenseId) =>
          change(groupId, (g) => ({ ...g, expenses: g.expenses.filter((e) => e.id !== expenseId) })),
        saveSettlement: (groupId, settlement) =>
          change(groupId, (g) => ({ ...g, settlements: upsert(g.settlements, { ...settlement, createdAt: settlement.createdAt ?? Date.now() }) })),
        deleteSettlement: (groupId, settlementId) =>
          change(groupId, (g) => ({ ...g, settlements: g.settlements.filter((s) => s.id !== settlementId) })),
      }
    },
    {
      name: 'evenly',
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ groups: s.groups, theme: s.theme }),
    },
  ),
)

export function useGroup(id: ID | undefined): Group | undefined {
  return useStore((s) => s.groups.find((g) => g.id === id))
}
