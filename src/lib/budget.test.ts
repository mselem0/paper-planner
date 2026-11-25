import { describe, expect, it } from 'vitest'
import { formatAmount, parseAmount } from './budget'

const v = (s: string) => { const r = parseAmount(s); return r.ok ? r.value : 'INVALID' }

describe('parseAmount', () => {
  it('parses plain and grouped numbers', () => {
    expect(v('1500')).toBe(1500)
    expect(v('1,500')).toBe(1500)
    expect(v('1,500.5')).toBe(1500.5)
    expect(v('1,234,567.25')).toBe(1234567.25)
    expect(v(' 12 ')).toBe(12)
  })
  it('treats a comma as decimal when it is not a thousands group', () => {
    expect(v('1500,5')).toBe(1500.5)
    expect(v('0,25')).toBe(0.25)
    expect(v('1.500,5')).toBe(1500.5)
    expect(v('.5')).toBe(0.5)
  })
  it('parses Arabic-Indic digits and separators', () => {
    expect(v('١٥٠٠')).toBe(1500)
    expect(v('١٬٥٠٠٫٥')).toBe(1500.5)
    expect(v('۱۲۳')).toBe(123)
  })
  it('handles empty and negative', () => {
    expect(v('')).toBeNull()
    expect(v('   ')).toBeNull()
    expect(v('-20')).toBe(-20)
  })
  it('flags invalid input', () => {
    for (const bad of ['abc', '12a', '1.2.3', '--5', '-', '.', ',', '1,5,5']) expect(v(bad)).toBe('INVALID')
  })
  it('formats for display', () => {
    expect(formatAmount(1500.5)).toBe('1,500.5')
  })
})
