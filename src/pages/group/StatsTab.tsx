import { ChartColumn } from 'lucide-react'
import { Avatar } from '../../components/Avatar'
import { ChartTable, ColumnChart, type Column } from '../../components/charts'
import { EmptyState } from '../../components/EmptyState'
import { Money } from '../../components/Money'
import { summarize } from '../../lib/balances'
import { category } from '../../lib/categories'
import { formatMonth, parseISODate } from '../../lib/dates'
import { formatMoney } from '../../lib/money'
import { amountInGroupCurrency } from '../../lib/split'
import { groupStats } from '../../lib/stats'
import { useGroupContext } from './context'

/** "12%", or "<1%" so a small category never reads as nothing. */
const percentLabel = (share: number) => (share > 0 && share < 0.005 ? '<1%' : `${Math.round(share * 100)}%`)

/** Trips get a bar per day; longer-running groups (a shared flat) a bar per month. */
const DAILY_LIMIT = 45

export function StatsTab() {
  const { group } = useGroupContext()
  const stats = groupStats(group)
  const cur = group.currency

  if (stats.count === 0) {
    return (
      <div className="card">
        <EmptyState icon={ChartColumn} title="No numbers yet">
          Stats appear once the group has a few expenses.
        </EmptyState>
      </div>
    )
  }

  const daily = stats.days <= DAILY_LIMIT
  const columns: Column[] = daily
    ? stats.byDay.map(({ day, total }) => {
        const d = parseISODate(day)
        return {
          key: day,
          label: d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' }),
          tick: String(d.getDate()),
          value: total,
        }
      })
    : stats.byMonth.map(({ month, total }) => ({ key: month, label: formatMonth(month), tick: formatMonth(month, 'short'), value: total }))

  const people = summarize(group)
  const peopleMax = Math.max(1, ...people.flatMap((p) => [p.paid, p.share]))
  const categoryMax = Math.max(1, ...stats.byCategory.map((c) => c.total))

  const tiles = [
    { label: 'Total spent', value: formatMoney(stats.total, cur), sub: `${stats.count} expenses` },
    { label: 'Per person', value: formatMoney(Math.round(stats.total / group.members.length), cur), sub: `${group.members.length} people` },
    {
      label: daily ? 'Per day' : 'Per month',
      value: formatMoney(Math.round(stats.total / (daily ? stats.days : stats.byMonth.length)), cur),
      sub: daily ? `over ${stats.days} ${stats.days === 1 ? 'day' : 'days'}` : `over ${stats.byMonth.length} months`,
    },
    stats.biggest && {
      label: 'Biggest expense',
      value: formatMoney(amountInGroupCurrency(stats.biggest, cur), cur),
      sub: stats.biggest.title,
    },
  ].filter(Boolean) as { label: string; value: string; sub: string }[]

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {tiles.map((t) => (
          <div key={t.label} className="card min-w-0 p-4">
            <p className="text-[13px] text-muted">{t.label}</p>
            <p className="mt-1 truncate text-xl font-semibold tracking-tight">{t.value}</p>
            <p className="truncate text-[13px] text-muted">{t.sub}</p>
          </div>
        ))}
      </div>

      <section className="card p-5">
        <h2 className="font-semibold">Spending by {daily ? 'day' : 'month'}</h2>
        <p className="mt-0.5 mb-8 text-[13px] text-muted">In {cur}. Hover or tab through the bars for exact amounts.</p>
        <ColumnChart data={columns} currency={cur} />
        <ChartTable headers={[daily ? 'Day' : 'Month', `Spent (${cur})`]} rows={columns.map((c) => [c.label, formatMoney(c.value, cur)])} />
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card p-5">
          <h2 className="font-semibold">By category</h2>
          <p className="mt-0.5 mb-5 text-[13px] text-muted">Share of the total, largest first.</p>
          <ul className="space-y-3.5">
            {stats.byCategory.map((c) => {
              const { icon: Icon, label } = category(c.category)
              return (
                <li key={c.category}>
                  <div className="mb-1.5 flex items-center gap-2 text-sm">
                    <Icon className="size-4 text-muted" />
                    <span className="flex-1">{label}</span>
                    <Money amount={c.total} currency={cur} className="font-medium" />
                    <span className="num w-10 text-right text-[13px] text-muted">{percentLabel(c.total / stats.total)}</span>
                  </div>
                  <div className="h-2 rounded-r-[4px]">
                    <div className="h-full rounded-r-[4px] bg-pos" style={{ width: `${(c.total / categoryMax) * 100}%` }} />
                  </div>
                </li>
              )
            })}
          </ul>
        </section>

        <section className="card p-5">
          <h2 className="font-semibold">Who paid, who used</h2>
          <p className="mt-0.5 text-[13px] text-muted">What each person paid for, next to their share of the costs.</p>
          <div className="mt-3 mb-5 flex gap-4 text-[13px] text-ink-2">
            <span className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-sm bg-pos" /> Paid for
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-sm bg-series-2" /> Their share
            </span>
          </div>
          <ul className="space-y-4">
            {people.map((p, i) => {
              const member = group.members.find((m) => m.id === p.id)
              return (
                <li key={p.id} className="grid grid-cols-[minmax(0,6rem)_1fr] items-center gap-3">
                  <span className="flex min-w-0 items-center gap-2 text-sm">
                    <Avatar name={member?.name ?? '?'} index={i} size={22} />
                    <span className="truncate">{member?.name}</span>
                  </span>
                  <div className="space-y-0.5">
                    {[
                      { value: p.paid, color: 'bg-pos', what: 'paid for' },
                      { value: p.share, color: 'bg-series-2', what: 'share' },
                    ].map((bar) => (
                      <div key={bar.what} className="flex items-center gap-2" title={`${member?.name} ${bar.what}: ${formatMoney(bar.value, cur)}`}>
                        <div className={`h-2.5 rounded-r-[4px] ${bar.color}`} style={{ width: `${(bar.value / peopleMax) * 75}%` }} />
                        <span className="num text-[11px] whitespace-nowrap text-ink-2">{formatMoney(bar.value, cur, { compact: true })}</span>
                      </div>
                    ))}
                  </div>
                </li>
              )
            })}
          </ul>
          <ChartTable
            headers={['Person', 'Paid for', 'Their share']}
            rows={people.map((p) => [group.members.find((m) => m.id === p.id)?.name ?? '?', formatMoney(p.paid, cur), formatMoney(p.share, cur)])}
          />
        </section>
      </div>
    </div>
  )
}
