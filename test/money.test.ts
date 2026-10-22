import { describe, expect, it } from 'vitest'
import { allocate, amountInputValue, convert, formatMoney, fractionDigits, parseAmount } from '../src/lib/money'

describe('allocate', () => {
  it('splits evenly when it can', () => {
    expect(allocate(900, [1, 1, 1])).toEqual([300, 300, 300])
  })

  it('never loses or invents a cent', () => {
    expect(allocate(1000, [1, 1, 1])).toEqual([334, 333, 333])
    for (let total = 0; total < 500; total += 7) {
      const parts = allocate(total, [3, 1, 4, 1, 5])
      expect(parts.reduce((a, b) => a + b, 0)).toBe(total)
    }
  })

  it('gives leftovers to the largest remainders', () => {
    // 100 * 2/7 = 28.57, 100 * 5/7 = 71.43: the 2-weight gets the extra cent.
    expect(allocate(100, [2, 5])).toEqual([29, 71])
  })

  it('skips zero weights and handles an empty total', () => {
    expect(allocate(10, [0, 1, 1])).toEqual([0, 5, 5])
    expect(allocate(10, [0, 0])).toEqual([0, 0])
  })

  it('handles negative totals symmetrically', () => {
    expect(allocate(-1000, [1, 1, 1])).toEqual([-334, -333, -333])
  })
})

describe('parseAmount', () => {
  it.each([
    ['12', 1200],
    ['12.5', 1250],
    ['12,50', 1250],
    ['0.99', 99],
    ['.5', 50],
    ['1,234', 123400],
    ['12.345', 1234500],
    ['1.234,56', 123456],
    ['1,234.56', 123456],
    ['1 234,56', 123456],
    ['1.000.000', 100000000],
    ['12.50 + 4', 1650],
    ['10+10+0,5', 2050],
  ])('reads %s as %d cents', (input, cents) => {
    expect(parseAmount(input, 'EUR')).toBe(cents)
  })

  it.each(['', 'abc', '-5', '1..2', '12+', '1,23,4'])('rejects %j', (input) => {
    expect(parseAmount(input, 'EUR')).toBeNull()
  })

  it('respects currencies without a minor unit', () => {
    expect(parseAmount('1500', 'JPY')).toBe(1500)
    expect(parseAmount('1,500', 'JPY')).toBe(1500)
    expect(parseAmount('15.5', 'JPY')).toBeNull()
  })
})

describe('currency helpers', () => {
  it('knows minor-unit digits', () => {
    expect(fractionDigits('EUR')).toBe(2)
    expect(fractionDigits('JPY')).toBe(0)
    expect(fractionDigits('KWD')).toBe(3)
  })

  it('converts between currencies with different digits', () => {
    expect(convert(1000, 'EUR', 11.62, 'NOK')).toBe(11620)
    expect(convert(1000, 'JPY', 0.0723, 'NOK')).toBe(7230)
    expect(convert(1234, 'NOK', 1, 'NOK')).toBe(1234)
  })

  it('formats for display and for inputs', () => {
    expect(formatMoney(123456, 'EUR', { locale: 'en-US' })).toBe('€1,234.56')
    expect(formatMoney(-500, 'USD', { locale: 'en-US', signed: true })).toBe('-$5.00')
    expect(amountInputValue(1250, 'EUR')).toBe('12.50')
    expect(amountInputValue(1500, 'JPY')).toBe('1500')
  })
})
