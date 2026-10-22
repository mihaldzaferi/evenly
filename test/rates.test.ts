import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { clearRateCache, fetchRate } from '../src/lib/rates'

type Responder = (url: string) => { status?: number; body?: unknown } | undefined

/** Fakes fetch: each test says how URLs are answered and sees which were asked for. */
function mockFetch(respond: Responder) {
  const calls: string[] = []
  vi.stubGlobal('fetch', async (url: string) => {
    calls.push(url)
    const r = respond(url)
    if (!r) throw new TypeError('Network error')
    return new Response(JSON.stringify(r.body ?? {}), { status: r.status ?? 200 })
  })
  return calls
}

const marketBody = (base: string, date: string, rates: Record<string, number>) => ({ date, [base]: rates })

beforeEach(() => {
  clearRateCache()
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(2026, 9, 22, 12))
})
afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('fetchRate', () => {
  it('uses European Central Bank rates for major currencies', async () => {
    const calls = mockFetch(() => ({ body: { date: '2026-10-17', rates: { NOK: 11.62 } } }))
    expect(await fetchRate('EUR', 'NOK', '2026-10-18')).toEqual({ rate: 11.62, date: '2026-10-17', source: 'ecb' })
    expect(calls).toEqual(['https://api.frankfurter.dev/v1/2026-10-18?base=EUR&symbols=NOK'])
  })

  it('uses market rates for every other currency', async () => {
    const calls = mockFetch(() => ({ body: marketBody('vnd', '2026-10-17', { nok: 0.00041416071234 }) }))
    expect(await fetchRate('VND', 'NOK', '2026-10-17')).toEqual({ rate: 0.00041416071, date: '2026-10-17', source: 'market' })
    expect(calls).toEqual(['https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@2026-10-17/v1/currencies/vnd.json'])
  })

  it('falls back to the mirror when the CDN fails', async () => {
    const calls = mockFetch((url) => (url.includes('jsdelivr') ? { status: 503 } : { body: marketBody('aed', '2026-10-20', { nok: 2.55 }) }))
    expect((await fetchRate('AED', 'NOK', '2026-10-20')).rate).toBe(2.55)
    expect(calls[1]).toBe('https://2026-10-20.currency-api.pages.dev/v1/currencies/aed.json')
  })

  it('falls back to market rates when the ECB service is down', async () => {
    mockFetch((url) => (url.includes('frankfurter') ? undefined : { body: marketBody('usd', '2026-10-21', { nok: 9.36 }) }))
    expect(await fetchRate('USD', 'NOK', '2026-10-21')).toMatchObject({ rate: 9.36, source: 'market' })
  })

  it('asks for the latest rate for future dates and dates before the history starts', async () => {
    const calls = mockFetch(() => ({ body: marketBody('mad', '2026-10-22', { eur: 0.092 }) }))
    await fetchRate('MAD', 'EUR', '2027-01-01')
    await fetchRate('MAD', 'EUR', '2023-06-01')
    expect(calls).toEqual([
      'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/mad.json',
      'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/mad.json',
    ])
  })

  it('remembers answers, but not failures', async () => {
    let fail = true
    const calls = mockFetch(() => (fail ? { status: 500 } : { body: marketBody('egp', '2026-10-22', { nok: 0.19 }) }))
    await expect(fetchRate('EGP', 'NOK', '2026-10-22')).rejects.toThrow()
    fail = false
    await fetchRate('EGP', 'NOK', '2026-10-22')
    await fetchRate('EGP', 'NOK', '2026-10-22')
    expect(calls).toHaveLength(3) // two failed hosts, then one success, then the cache
  })

  it('says so when no source knows the currency', async () => {
    mockFetch(() => ({ body: marketBody('xsu', '2026-10-22', {}) }))
    await expect(fetchRate('XSU', 'NOK', '2026-10-22')).rejects.toThrow('No rate for XSU → NOK.')
  })

  it('lets one caller stop waiting without cancelling the request for others', async () => {
    mockFetch(() => ({ body: marketBody('thb', '2026-10-22', { nok: 0.29 }) }))
    const controller = new AbortController()
    const first = fetchRate('THB', 'NOK', '2026-10-22', controller.signal)
    const second = fetchRate('THB', 'NOK', '2026-10-22')
    controller.abort()
    await expect(first).rejects.toMatchObject({ name: 'AbortError' })
    expect((await second).rate).toBe(0.29)
  })
})
