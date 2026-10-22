const digitsCache = new Map<string, number>()

/** Number of minor-unit digits for a currency: 2 for EUR, 0 for JPY, 3 for KWD. */
export function fractionDigits(currency: string): number {
  let digits = digitsCache.get(currency)
  if (digits === undefined) {
    try {
      digits = new Intl.NumberFormat('en', { style: 'currency', currency }).resolvedOptions()
        .maximumFractionDigits ?? 2
    } catch {
      digits = 2
    }
    digitsCache.set(currency, digits)
  }
  return digits
}

export function toMinor(major: number, currency: string): number {
  return Math.round(major * 10 ** fractionDigits(currency))
}

export function toMajor(minor: number, currency: string): number {
  return minor / 10 ** fractionDigits(currency)
}

/**
 * Converts an amount between currencies. `rate` is how many units of `to`
 * one unit of `from` is worth.
 */
export function convert(minor: number, from: string, rate: number, to: string): number {
  if (from === to) return minor
  return Math.round(toMajor(minor, from) * rate * 10 ** fractionDigits(to))
}

/**
 * Splits `total` into integer parts proportional to `weights`, using the
 * largest-remainder method so the parts always add up to exactly `total`.
 * Leftover minor units go to the largest fractional remainders; ties go to
 * the earlier entry, so the result is deterministic.
 */
export function allocate(total: number, weights: number[]): number[] {
  const sum = weights.reduce((a, b) => a + b, 0)
  if (sum <= 0) return weights.map(() => 0)
  const sign = total < 0 ? -1 : 1
  const abs = Math.abs(total)

  const parts = weights.map((w) => Math.floor((abs * w) / sum))
  let leftover = abs - parts.reduce((a, b) => a + b, 0)
  const order = weights
    .map((w, i) => ({ i, rem: (abs * w) % sum }))
    .filter(({ i }) => weights[i] > 0)
    .sort((a, b) => b.rem - a.rem || a.i - b.i)
  for (let k = 0; leftover > 0; k = (k + 1) % order.length, leftover--) {
    parts[order[k].i] += 1
  }
  return parts.map((p) => p * sign)
}

/**
 * Parses what someone typed into an amount field, returning minor units or
 * null if it isn't a valid non-negative amount. Accepts both decimal commas
 * and points ("12,50", "1.234,56", "1,234.56"), spaces, and simple sums
 * ("12.50 + 4") for adding up a receipt.
 */
export function parseAmount(input: string, currency: string): number | null {
  const terms = input.split('+')
  let total = 0
  for (const term of terms) {
    const value = parseTerm(term, fractionDigits(currency))
    if (value === null) return null
    total += value
  }
  return total
}

function parseTerm(raw: string, digits: number): number | null {
  const s = raw.replace(/[\s\u00a0\u202f']/g, '')
  if (!/^\d[\d.,]*$|^[.,]\d+$/.test(s)) return null

  const lastDot = s.lastIndexOf('.')
  const lastComma = s.lastIndexOf(',')
  let intPart = s
  let fracPart = ''

  if (lastDot >= 0 && lastComma >= 0) {
    // Both appear: whichever comes last is the decimal separator.
    const decimal = Math.max(lastDot, lastComma)
    intPart = s.slice(0, decimal).replace(/[.,]/g, '')
    fracPart = s.slice(decimal + 1)
  } else if (lastDot >= 0 || lastComma >= 0) {
    const sep = lastDot >= 0 ? '.' : ','
    const pieces = s.split(sep)
    const tail = pieces[pieces.length - 1]
    // One separator followed by no more digits than the currency uses is a
    // decimal mark ("12,5"); anything else is grouping ("1,234" or "1.000.000").
    if (pieces.length === 2 && tail.length <= Math.max(digits, 2)) {
      intPart = pieces[0]
      fracPart = tail
    } else {
      if (pieces.slice(1).some((p) => p.length !== 3)) return null
      intPart = pieces.join('')
    }
  }

  if (fracPart.length > digits) return null
  const minor = Number(intPart || '0') * 10 ** digits + Number(fracPart.padEnd(digits, '0') || '0')
  return Number.isSafeInteger(minor) ? minor : null
}

/** Plain, locale-neutral string for pre-filling an amount input ("12.50", "1200"). */
export function amountInputValue(minor: number, currency: string): string {
  return toMajor(minor, currency).toFixed(fractionDigits(currency))
}

const formatters = new Map<string, Intl.NumberFormat>()

export function formatMoney(
  minor: number,
  currency: string,
  opts: { signed?: boolean; compact?: boolean; locale?: string } = {},
): string {
  const key = `${currency}|${opts.signed}|${opts.compact}|${opts.locale}`
  let fmt = formatters.get(key)
  if (!fmt) {
    fmt = new Intl.NumberFormat(opts.locale, {
      style: 'currency',
      currency,
      signDisplay: opts.signed ? 'exceptZero' : 'auto',
      ...(opts.compact ? { notation: 'compact', maximumFractionDigits: 1 } : {}),
    })
    formatters.set(key, fmt)
  }
  return fmt.format(toMajor(minor, currency))
}

/** Currencies shown first in pickers; every other ISO code follows. */
const COMMON = [
  'EUR', 'USD', 'GBP', 'NOK', 'SEK', 'DKK', 'CHF', 'ISK', 'PLN', 'CZK', 'HUF', 'RON', 'TRY',
  'JPY', 'CNY', 'KRW', 'INR', 'THB', 'SGD', 'HKD', 'AUD', 'NZD', 'CAD', 'MXN', 'BRL', 'ZAR', 'AED',
]

let allCurrencies: string[] | null = null

export function currencyCodes(): string[] {
  if (!allCurrencies) {
    const supported: string[] =
      typeof Intl.supportedValuesOf === 'function' ? Intl.supportedValuesOf('currency') : []
    allCurrencies = [...COMMON, ...supported.filter((c) => !COMMON.includes(c))]
  }
  return allCurrencies
}

let names: Intl.DisplayNames | null = null

export function currencyName(code: string): string {
  try {
    names ??= new Intl.DisplayNames(['en'], { type: 'currency' })
    return names.of(code) ?? code
  } catch {
    return code
  }
}
