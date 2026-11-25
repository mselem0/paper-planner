import type { BudgetData, BudgetRow } from '../store/types'

export const sumRows = (rows: BudgetRow[]): number =>
  rows.reduce((t, r) => t + (typeof r.amount === 'number' && Number.isFinite(r.amount) ? r.amount : 0), 0)

export function budgetTotals(b: BudgetData) {
  const income = sumRows(b.income)
  const expenses = sumRows(b.spending) + sumRows(b.expenses) + sumRows(b.savingDebt)
  return { income, expenses, left: income - expenses }
}

export function formatMoney(n: number, currency = 'EGP'): string {
  const v = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(n)
  return `${v} ${currency}`
}

export type ParsedAmount = { ok: true; value: number | null } | { ok: false }

const ARABIC_DIGITS: Record<string, string> = {}
'٠١٢٣٤٥٦٧٨٩'.split('').forEach((c, i) => { ARABIC_DIGITS[c] = String(i) })
'۰۱۲۳۴۵۶۷۸۹'.split('').forEach((c, i) => { ARABIC_DIGITS[c] = String(i) })

/**
 * Tolerant amount parser: "1,500.5", "1500,5", "1.500,5", "١٥٠٠", "١٬٥٠٠٫٥" -> number.
 * Empty -> { ok: true, value: null }. Anything unparseable -> { ok: false }.
 */
export function parseAmount(input: string): ParsedAmount {
  let t = input.replace(/[٠-٩۰-۹]/g, (c) => ARABIC_DIGITS[c]).replace(/٫/g, '.').replace(/٬/g, ',')
  t = t.replace(/[\s  ']/g, '')
  if (t === '') return { ok: true, value: null }
  let neg = false
  if (t.startsWith('-') || t.startsWith('−')) { neg = true; t = t.slice(1) }
  if (!/^[\d.,]+$/.test(t) || !/\d/.test(t)) return { ok: false }
  const lastDot = t.lastIndexOf('.')
  const lastComma = t.lastIndexOf(',')
  const count = (c: string) => t.split(c).length - 1
  let dec = -1 // index of the decimal separator, -1 = none
  if (lastDot >= 0 && lastComma >= 0) dec = Math.max(lastDot, lastComma)
  else if (lastComma >= 0) {
    // "1,500" and "1,500,000" are thousands groups; "1500,5" / "0,25" are decimals.
    const groups = t.split(',')
    const thousands = groups.slice(1).every((g) => g.length === 3) && groups[0].length >= 1 && groups[0].length <= 3
    if (!thousands) { if (count(',') > 1) return { ok: false }; dec = lastComma }
  } else if (lastDot >= 0 && count('.') > 1) {
    const groups = t.split('.')
    if (!groups.slice(1).every((g) => g.length === 3)) return { ok: false }
  } else if (lastDot >= 0) dec = lastDot
  const intPart = (dec >= 0 ? t.slice(0, dec) : t).replace(/[.,]/g, '')
  const fracPart = dec >= 0 ? t.slice(dec + 1) : ''
  if (/[.,]/.test(fracPart)) return { ok: false }
  if (intPart === '' && fracPart === '') return { ok: false }
  const n = Number(`${intPart || '0'}${fracPart ? `.${fracPart}` : ''}`)
  if (!Number.isFinite(n)) return { ok: false }
  return { ok: true, value: neg ? -n : n }
}

/** Display form for an unfocused amount field: grouped, up to 2 decimals. */
export const formatAmount = (n: number): string => new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(n)
