import { today } from './dates'

/**
 * Exchange rates for any currency, from two free sources that need no key:
 *
 * 1. Frankfurter: official European Central Bank reference rates for about
 *    30 major currencies. Preferred whenever it covers both currencies.
 * 2. currency-api (github.com/fawazahmed0/exchange-api): daily rates for
 *    160+ currencies, served from jsDelivr with a Cloudflare mirror. Used for
 *    everything else, and as a fallback when Frankfurter can't be reached.
 */
const FRANKFURTER = 'https://api.frankfurter.dev/v1'
const CURRENCY_API = [
  (day: string, base: string) => `https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@${day}/v1/currencies/${base}.json`,
  (day: string, base: string) => `https://${day}.currency-api.pages.dev/v1/currencies/${base}.json`,
]
/** currency-api keeps a daily history from this day on. */
const HISTORY_START = '2024-03-02'

const ECB_CURRENCIES = new Set([
  'AUD', 'BGN', 'BRL', 'CAD', 'CHF', 'CNY', 'CZK', 'DKK', 'EUR', 'GBP', 'HKD', 'HUF', 'IDR', 'ILS', 'INR',
  'ISK', 'JPY', 'KRW', 'MXN', 'MYR', 'NOK', 'NZD', 'PHP', 'PLN', 'RON', 'SEK', 'SGD', 'THB', 'TRY', 'USD', 'ZAR',
])

export type RateSource = 'ecb' | 'market'

export interface Rate {
  rate: number
  /** The day the rate is from. Can be earlier (ECB on weekends) or "today" when no history exists. */
  date: string
  source: RateSource
}

const cache = new Map<string, Promise<Rate>>()

/**
 * How many `to` one `from` was worth on `date`, from the best source that has
 * it. Answers are cached for the session. Aborting `signal` stops waiting
 * without cancelling the shared request, so other callers still get it.
 */
export function fetchRate(from: string, to: string, date: string, signal?: AbortSignal): Promise<Rate> {
  const key = `${from}>${to}@${date}`
  let pending = cache.get(key)
  if (!pending) {
    pending = lookup(from, to, date)
    cache.set(key, pending)
    // Only successful answers are worth keeping.
    pending.catch(() => cache.delete(key))
  }
  return signal ? abortable(pending, signal) : pending
}

function abortable<T>(promise: Promise<T>, signal: AbortSignal): Promise<T> {
  const aborted = () => new DOMException('The rate lookup was cancelled.', 'AbortError')
  if (signal.aborted) return Promise.reject(aborted())
  return new Promise((resolve, reject) => {
    const onAbort = () => reject(aborted())
    signal.addEventListener('abort', onAbort, { once: true })
    promise.then(resolve, reject).finally(() => signal.removeEventListener('abort', onAbort))
  })
}

/** Forgets cached rates (used by tests). */
export function clearRateCache(): void {
  cache.clear()
}

async function lookup(from: string, to: string, date: string): Promise<Rate> {
  if (ECB_CURRENCIES.has(from) && ECB_CURRENCIES.has(to)) {
    try {
      return await fromFrankfurter(from, to, date)
    } catch {
      // Fall through to the second source.
    }
  }
  return fromCurrencyApi(from, to, date)
}

async function fromFrankfurter(from: string, to: string, date: string): Promise<Rate> {
  const day = date >= today() ? 'latest' : date
  const res = await fetch(`${FRANKFURTER}/${day}?base=${from}&symbols=${to}`)
  if (!res.ok) throw new Error(`Couldn’t get a rate (${res.status}).`)
  const body = (await res.json()) as { date: string; rates: Record<string, number> }
  return { rate: check(body.rates[to], from, to), date: body.date, source: 'ecb' }
}

async function fromCurrencyApi(from: string, to: string, date: string): Promise<Rate> {
  const day = date >= today() || date < HISTORY_START ? 'latest' : date
  const base = from.toLowerCase()
  let lastError: unknown = new Error(`No rate for ${from} → ${to}.`)
  for (const url of CURRENCY_API) {
    try {
      const res = await fetch(url(day, base))
      if (!res.ok) throw new Error(`Couldn’t get a rate (${res.status}).`)
      const body = (await res.json()) as { date: string } & Record<string, Record<string, number> | string>
      const rates = body[base]
      const rate = check(typeof rates === 'object' ? rates[to.toLowerCase()] : undefined, from, to)
      return { rate: Number(rate.toPrecision(8)), date: body.date, source: 'market' }
    } catch (err) {
      lastError = err
    }
  }
  throw lastError
}

function check(rate: unknown, from: string, to: string): number {
  if (typeof rate !== 'number' || !Number.isFinite(rate) || rate <= 0) throw new Error(`No rate for ${from} → ${to}.`)
  return rate
}
