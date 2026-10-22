import { fractionDigits, formatMoney, toMajor } from './money'

/**
 * Helpers for paying people back outside the app. Evenly can't move money
 * itself (that needs a bank or payment provider), so it gets the amount and
 * the recipient's details ready and hands off to Vipps, PayPal or a bank.
 */

/** Keeps a leading + and the digits: "+47 412 34 567" → "+4741234567". */
export function normalizePhone(input: string): string {
  const trimmed = input.trim()
  return (trimmed.startsWith('+') ? '+' : '') + trimmed.replace(/\D/g, '')
}

/** Accepts "anna", "@anna", "paypal.me/anna" or a full PayPal.me link. */
export function normalizePaypal(input: string): string {
  return input
    .trim()
    .replace(/^https?:\/\//i, '')
    .replace(/^(www\.)?paypal\.me\//i, '')
    .replace(/^@/, '')
    .split(/[/?#]/)[0]
    .replace(/[^\w.-]/g, '')
}

/** Groups digits for reading aloud: Norwegian numbers as "412 34 567". */
export function formatPhone(phone: string): string {
  const local = phone.replace(/^\+47/, '')
  if (/^\d{8}$/.test(local)) return `${local.slice(0, 3)} ${local.slice(3, 5)} ${local.slice(5)}`
  return phone
}

/** A PayPal.me link with the amount filled in, e.g. https://paypal.me/anna/54.77NOK */
export function paypalLink(username: string, minor: number, currency: string): string {
  const amount = toMajor(minor, currency).toFixed(fractionDigits(currency))
  return `https://paypal.me/${encodeURIComponent(username)}/${amount}${currency}`
}

/**
 * The amount as you'd type it into another app: no currency sign or
 * thousands separators, with the local decimal mark ("54,77" in Norway).
 */
export function plainAmount(minor: number, currency: string, locale?: string): string {
  const digits = fractionDigits(currency)
  return new Intl.NumberFormat(locale, { minimumFractionDigits: digits, maximumFractionDigits: digits, useGrouping: false }).format(
    toMajor(minor, currency),
  )
}

/** A friendly nudge to send someone who owes you money. */
export function reminderText(opts: {
  to: string
  groupName: string
  amount: number
  currency: string
  myPhone?: string
  locale?: string
}): string {
  const amount = formatMoney(opts.amount, opts.currency, { locale: opts.locale })
  const how = opts.myPhone ? ` You can Vipps me at ${formatPhone(opts.myPhone)}.` : ''
  return `Hi ${opts.to}! For “${opts.groupName}” you owe me ${amount}.${how} Thanks!`
}
