import { describe, expect, it } from 'vitest'
import { formatPhone, normalizePaypal, normalizePhone, paypalLink, plainAmount, reminderText } from '../src/lib/payments'
import { parseGroup } from '../src/lib/validate'
import { makeGroup } from './helpers'

describe('payment helpers', () => {
  it('cleans up phone numbers', () => {
    expect(normalizePhone(' +47 412 34 567 ')).toBe('+4741234567')
    expect(normalizePhone('412-34-567')).toBe('41234567')
    expect(formatPhone('41234567')).toBe('412 34 567')
    expect(formatPhone('+4741234567')).toBe('412 34 567')
    expect(formatPhone('+46701234567')).toBe('+46701234567')
  })

  it('accepts PayPal.me names in any shape', () => {
    for (const input of ['anna.b', '@anna.b', 'paypal.me/anna.b', 'https://www.paypal.me/anna.b/10EUR']) {
      expect(normalizePaypal(input)).toBe('anna.b')
    }
  })

  it('builds PayPal.me links with the amount filled in', () => {
    expect(paypalLink('anna', 5477, 'NOK')).toBe('https://paypal.me/anna/54.77NOK')
    expect(paypalLink('anna', 1500, 'JPY')).toBe('https://paypal.me/anna/1500JPY')
  })

  it('formats amounts for pasting into another app', () => {
    expect(plainAmount(123456, 'NOK', 'nb-NO')).toBe('1234,56')
    expect(plainAmount(123456, 'USD', 'en-US')).toBe('1234.56')
  })

  it('writes a reminder', () => {
    expect(reminderText({ to: 'Chloé', groupName: 'Lisbon', amount: 50000, currency: 'NOK', myPhone: '41234567', locale: 'en-US' })).toBe(
      'Hi Chloé! For “Lisbon” you owe me NOK\u00a0500.00. You can Vipps me at 412 34 567. Thanks!',
    )
    expect(reminderText({ to: 'Ben', groupName: 'Flat', amount: 100, currency: 'EUR', locale: 'en-US' })).toBe(
      'Hi Ben! For “Flat” you owe me €1.00. Thanks!',
    )
  })

  it('keeps valid payment details on import and drops junk', () => {
    const g = makeGroup(['a', 'b'])
    g.members[0] = { ...g.members[0], phone: '+47 412 34 567', paypal: 'paypal.me/aa' }
    g.members[1] = { ...g.members[1], phone: 42 as unknown as string, account: 'x'.repeat(200) }
    const parsed = parseGroup(g)
    expect(parsed.members[0]).toMatchObject({ phone: '+4741234567', paypal: 'aa' })
    expect(parsed.members[1].phone).toBeUndefined()
    expect(parsed.members[1].account).toBeUndefined()
  })
})
