import type { Group, ID, Member } from './types'

export interface MemberInfo {
  member: Member
  /** Position in the group, which picks the avatar colour. */
  index: number
}

export function memberLookup(group: Group): (id: ID) => MemberInfo {
  const map = new Map(group.members.map((member, index) => [member.id, { member, index }]))
  return (id) => map.get(id) ?? { member: { id, name: 'Unknown' }, index: -1 }
}

export function displayName(group: Group, id: ID, name: string): string {
  return group.meId === id ? `${name} (you)` : name
}

/** "Ana" → "A", "Ana Lima" → "AL" */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  const letters = parts.length === 1 ? [[...parts[0]][0]] : [[...parts[0]][0], [...parts[parts.length - 1]][0]]
  return letters.join('').toUpperCase()
}
