/**
 * Exchange rates from the free Frankfurter API (European Central Bank
 * reference rates, no key needed). It covers about 30 major currencies; for
 * anything else the rate is typed in by hand.
 */
const API = 'https://api.frankfurter.dev/v1'

export const RATE_CURRENCIES = new Set([
  'AUD', 'BGN', 'BRL', 'CAD', 'CHF', 'CNY', 'CZK', 'DKK', 'EUR', 'GBP', 'HKD', 'HUF', 'IDR', 'ILS', 'INR',
  'ISK', 'JPY', 'KRW', 'MXN', 'MYR', 'NOK', 'NZD', 'PHP', 'PLN', 'RON', 'SEK', 'SGD', 'THB', 'TRY', 'USD', 'ZAR',
])

export function canFetchRate(from: string, to: string): boolean {
  return RATE_CURRENCIES.has(from) && RATE_CURRENCIES.has(to)
}

export interface Rate {
  rate: number
  /** The day the rate is from; can be earlier than asked for on weekends and holidays. */
  date: string
}

/** How many `to` one `from` was worth on `date` (or the closest earlier working day). */
export async function fetchRate(from: string, to: string, date: string, signal?: AbortSignal): Promise<Rate> {
  const day = date > new Date().toISOString().slice(0, 10) ? 'latest' : date
  const res = await fetch(`${API}/${day}?base=${from}&symbols=${to}`, { signal })
  if (!res.ok) throw new Error(`Couldn’t get a rate (${res.status}).`)
  const body = (await res.json()) as { date: string; rates: Record<string, number> }
  const rate = body.rates[to]
  if (typeof rate !== 'number') throw new Error(`No rate for ${from} → ${to}.`)
  return { rate, date: body.date }
}
