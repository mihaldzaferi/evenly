import { addDays, today } from './dates'
import { newId } from './ids'
import { equalSplit } from './split'
import type { CategoryId, Group, Split } from './types'

type Row = [title: string, amount: number, currency: string, paidBy: string, daysAgo: number, category: CategoryId, split?: Split]

/** Builds a group from compact rows. Member names double as keys in rows. */
function build(
  name: string,
  emoji: string,
  currency: string,
  names: string[],
  rates: Record<string, number>,
  rows: (members: Record<string, string>) => Row[],
  payments: [from: string, to: string, amount: number, daysAgo: number, note?: string][],
  me: string,
): Group {
  const members = names.map((n) => ({ id: newId(), name: n }))
  const id = Object.fromEntries(members.map((m) => [m.name, m.id]))
  const all = equalSplit(members.map((m) => m.id))
  const now = Date.now()
  return {
    id: newId(),
    name,
    emoji,
    currency,
    members,
    meId: id[me],
    expenses: rows(id).map(([title, amount, cur, paidBy, ago, category, split], i) => ({
      id: newId(),
      title,
      amount,
      currency: cur,
      rate: cur === currency ? 1 : rates[cur],
      paidBy: id[paidBy],
      split: split ?? all,
      category,
      date: addDays(today(), -ago),
      createdAt: now - ago * 86_400_000 + i,
    })),
    settlements: payments.map(([from, to, amount, ago, note], i) => ({
      id: newId(),
      from: id[from],
      to: id[to],
      amount,
      date: addDays(today(), -ago),
      note,
      createdAt: now - ago * 86_400_000 + i,
    })),
    createdAt: now,
    updatedAt: now,
  }
}

const by = (mode: Split['mode'], weights: Record<string, number>): Split => ({ mode, weights })

/** Two example groups that show off multi-currency, uneven splits and repayments. */
export function demoGroups(): Group[] {
  const lisbon = build(
    'Lisbon weekend',
    '🇵🇹',
    'NOK',
    ['Ana', 'Ben', 'Chloé', 'Dev'],
    { EUR: 11.62 },
    (m) => [
      ['Flights OSL → LIS', 796000, 'NOK', 'Ana', 26, 'travel'],
      ['Airbnb in Alfama, 3 nights', 61200, 'EUR', 'Ben', 16, 'lodging', by('shares', { [m.Ana]: 1, [m.Ben]: 1, [m.Chloé]: 1, [m.Dev]: 2 })],
      ['Taxi from the airport', 3800, 'EUR', 'Chloé', 16, 'transport'],
      ['Pastéis de Belém', 1440, 'EUR', 'Dev', 15, 'food'],
      ['Dinner at Time Out Market', 12650, 'EUR', 'Ana', 15, 'food'],
      ['Tram 28 day passes', 2400, 'EUR', 'Ben', 15, 'transport'],
      ['Groceries at Pingo Doce', 4185, 'EUR', 'Chloé', 14, 'groceries'],
      ['Surf lesson at Caparica', 18000, 'EUR', 'Dev', 14, 'entertainment', by('equal', { [m.Ana]: 1, [m.Ben]: 1, [m.Dev]: 1 })],
      ['Train to Sintra', 1840, 'EUR', 'Ana', 13, 'transport'],
      ['Pena Palace tickets', 8000, 'EUR', 'Ben', 13, 'entertainment'],
      ['Fado dinner', 21400, 'EUR', 'Dev', 13, 'food', by('exact', { [m.Ana]: 5200, [m.Ben]: 6150, [m.Chloé]: 4800, [m.Dev]: 5250 })],
      ['Sunscreen and plasters', 1290, 'EUR', 'Chloé', 12, 'health', by('equal', { [m.Ana]: 1, [m.Chloé]: 1 })],
      ['Bolt to the airport', 3120, 'EUR', 'Ben', 12, 'transport'],
    ],
    [['Chloé', 'Ana', 50000, 10, 'Vipps']],
    'Ana',
  )

  const rent = (m: Record<string, string>) => by('percent', { [m.Ingrid]: 4000, [m.Jonas]: 3000, [m.Leo]: 3000 })
  const flat = build(
    'Flat 4B',
    '🏠',
    'NOK',
    ['Ingrid', 'Jonas', 'Leo'],
    { SEK: 0.98, EUR: 11.62 },
    (m) => [
      ['Rent', 2100000, 'NOK', 'Ingrid', 82, 'lodging', rent(m)],
      ['Electricity', 148700, 'NOK', 'Jonas', 78, 'utilities'],
      ['Internet', 54900, 'NOK', 'Leo', 75, 'utilities'],
      ['Groceries at Rema', 84350, 'NOK', 'Leo', 70, 'groceries'],
      ['Rent', 2100000, 'NOK', 'Ingrid', 52, 'lodging', rent(m)],
      ['IKEA run (shelves + plants)', 124900, 'SEK', 'Leo', 49, 'shopping'],
      ['Electricity', 112400, 'NOK', 'Jonas', 47, 'utilities'],
      ['Internet', 54900, 'NOK', 'Leo', 45, 'utilities'],
      ['Cleaning supplies', 31900, 'NOK', 'Ingrid', 40, 'other'],
      ['Groceries at Kiwi', 61225, 'NOK', 'Jonas', 33, 'groceries'],
      ['Rent', 2100000, 'NOK', 'Ingrid', 21, 'lodging', rent(m)],
      ['Pizza night', 46800, 'NOK', 'Jonas', 18, 'food', by('shares', { [m.Ingrid]: 1, [m.Jonas]: 2, [m.Leo]: 1 })],
      ['Electricity', 163300, 'NOK', 'Jonas', 16, 'utilities'],
      ['Internet', 54900, 'NOK', 'Leo', 14, 'utilities'],
      ['Spotify Family', 1799, 'EUR', 'Ingrid', 9, 'entertainment'],
      ['Groceries at Meny', 92740, 'NOK', 'Leo', 4, 'groceries'],
    ],
    [
      ['Jonas', 'Ingrid', 630000, 80, 'Rent share'],
      ['Leo', 'Ingrid', 630000, 80, 'Rent share'],
      ['Jonas', 'Ingrid', 630000, 50, 'Rent share'],
      ['Leo', 'Ingrid', 600000, 49, 'Rent share (minus IKEA)'],
    ],
    'Leo',
  )

  return [lisbon, flat]
}
