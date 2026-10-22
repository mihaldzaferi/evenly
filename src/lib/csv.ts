import { category } from './categories'
import { toMajor } from './money'
import { amountInGroupCurrency, shares } from './split'
import type { Group } from './types'

/**
 * One row per expense or payment, with a column per member showing what that
 * row cost them. Opens cleanly in Excel, Numbers and Google Sheets.
 */
export function groupToCsv(group: Group): string {
  const name = new Map(group.members.map((m) => [m.id, m.name]))
  const cur = group.currency
  const header = [
    'Date', 'Type', 'Description', 'Category', 'Paid by', 'Paid to', 'Amount', 'Currency', 'Rate', `Amount (${cur})`,
    ...group.members.map((m) => `${m.name} share (${cur})`),
  ]

  const rows = [
    ...group.expenses.map((e) => {
      const owed = shares(e, cur)
      return {
        date: e.date,
        cells: [
          e.date, 'Expense', e.title, category(e.category).label, name.get(e.paidBy) ?? '', '',
          toMajor(e.amount, e.currency), e.currency, e.rate, toMajor(amountInGroupCurrency(e, cur), cur),
          ...group.members.map((m) => (owed.has(m.id) ? toMajor(owed.get(m.id)!, cur) : '')),
        ],
      }
    }),
    ...group.settlements.map((s) => ({
      date: s.date,
      cells: [
        s.date, 'Payment', s.note || 'Payment', '', name.get(s.from) ?? '', name.get(s.to) ?? '',
        toMajor(s.amount, cur), cur, 1, toMajor(s.amount, cur),
        ...group.members.map(() => ''),
      ],
    })),
  ].sort((a, b) => a.date.localeCompare(b.date))

  return [header, ...rows.map((r) => r.cells)].map((r) => r.map(cell).join(',')).join('\r\n') + '\r\n'
}

function cell(value: string | number): string {
  let s = String(value)
  // Stop spreadsheet apps from treating a description like "=SUM(…)" as a formula.
  if (/^[=+\-@\t\r]/.test(s) && typeof value === 'string') s = `'${s}`
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}
