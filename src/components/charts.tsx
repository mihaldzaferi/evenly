import { useState } from 'react'
import { formatMoney } from '../lib/money'

/** Rounds up to a "nice" axis maximum: 1, 2, 2.5 or 5 times a power of ten. */
function niceMax(value: number): number {
  if (value <= 0) return 1
  const power = 10 ** Math.floor(Math.log10(value))
  const step = [1, 2, 2.5, 5, 10].find((s) => s * power >= value)!
  return step * power
}

export interface Column {
  key: string
  /** Full label for the tooltip and table ("Tue 14 Oct"). */
  label: string
  /** Short axis label ("14"). */
  tick: string
  value: number
}

/**
 * Single-series column chart in plain HTML. Each column is a focusable hit
 * target the full height of the plot, so hovering anywhere above a short bar
 * still shows its tooltip.
 */
export function ColumnChart({ data, currency, height = 180 }: { data: Column[]; currency: string; height?: number }) {
  const [active, setActive] = useState<number | null>(null)
  const max = niceMax(Math.max(...data.map((d) => d.value)))
  const ticks = [max, max / 2, 0]
  const every = Math.ceil(data.length / 8)
  const current = active === null ? null : data[active]

  return (
    <div className="grid grid-cols-[auto_1fr] gap-x-2">
      <div className="num relative w-14 text-right text-[11px] text-muted" style={{ height }}>
        {ticks.map((t) => (
          <span key={t} className="absolute right-0 -translate-y-1/2 whitespace-nowrap" style={{ top: `${(1 - t / max) * 100}%` }}>
            {formatMoney(t, currency, { compact: true })}
          </span>
        ))}
      </div>

      <div className="relative" style={{ height }} onMouseLeave={() => setActive(null)}>
        {ticks.map((t) => (
          <div
            key={t}
            className={`absolute inset-x-0 border-t ${t === 0 ? 'border-line-strong' : 'border-line'}`}
            style={{ top: `${(1 - t / max) * 100}%` }}
          />
        ))}
        <div className="absolute inset-0 flex">
          {data.map((d, i) => (
            <button
              key={d.key}
              type="button"
              className="group/col relative flex h-full flex-1 items-end justify-center focus:outline-none"
              aria-label={`${d.label}: ${formatMoney(d.value, currency)}`}
              onMouseEnter={() => setActive(i)}
              onFocus={() => setActive(i)}
              onBlur={() => setActive(null)}
            >
              {active === i && <span className="absolute inset-y-0 inset-x-px rounded-md bg-surface-2/70" />}
              {d.value > 0 && (
                <span
                  className={`relative w-[70%] max-w-6 rounded-t-[4px] bg-pos transition-opacity ${active !== null && active !== i ? 'opacity-60' : ''}`}
                  style={{ height: `${Math.max((d.value / max) * 100, 1)}%` }}
                />
              )}
            </button>
          ))}
        </div>

        {current && active !== null && (
          <div
            role="status"
            className="pointer-events-none absolute -top-2 z-10 -translate-x-1/2 -translate-y-full rounded-lg border border-line bg-surface px-2.5 py-1.5 text-center whitespace-nowrap shadow-lg"
            style={{ left: `${Math.min(Math.max(((active + 0.5) / data.length) * 100, 12), 88)}%` }}
          >
            <p className="num text-sm font-semibold">{formatMoney(current.value, currency)}</p>
            <p className="text-[11px] text-muted">{current.label}</p>
          </div>
        )}
      </div>

      <div />
      <div className="mt-1.5 flex">
        {data.map((d, i) => (
          <span key={d.key} className="flex-1 text-center text-[11px] text-muted">
            {i % every === 0 ? d.tick : ''}
          </span>
        ))}
      </div>
    </div>
  )
}

/** "View as table" for any chart: every value stays reachable without hovering. */
export function ChartTable({ rows, headers }: { rows: (string | number)[][]; headers: string[] }) {
  return (
    <details className="mt-4 text-sm">
      <summary className="w-fit rounded text-[13px] font-medium text-accent-text hover:underline">View as table</summary>
      <div className="mt-2 max-h-72 overflow-auto rounded-lg border border-line">
        <table className="w-full">
          <thead className="sticky top-0 bg-surface-2 text-left text-[12px] text-muted">
            <tr>
              {headers.map((h, i) => (
                <th key={h} className={`px-3 py-2 font-medium ${i > 0 ? 'text-right' : ''}`}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((r) => (
              <tr key={String(r[0])}>
                {r.map((c, i) => (
                  <td key={i} className={`px-3 py-1.5 ${i > 0 ? 'num text-right' : ''}`}>
                    {c}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  )
}
