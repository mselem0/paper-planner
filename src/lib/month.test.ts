import { describe, expect, it } from 'vitest'
import { monthGrid, weekdayOf, weeksOverlappingMonth, daysInMonth } from './dates'
import { budgetTotals } from './budget'
import { emptyBudget, row } from '../store/defaults'

describe('month grid', () => {
  it('Feb 2027 starts on Monday with 28 days', () => {
    const g = monthGrid(2)
    expect(g[0][0]).toBeNull()
    expect(g[0][1]).toBe('2027-02-01')
    expect(g.flat().filter(Boolean)).toHaveLength(28)
  })
  it('Jan 2027 starts Friday; Jan 31 is a Sunday in the last row', () => {
    const g = monthGrid(1)
    expect(g[0][5]).toBe('2027-01-01')
    expect(weekdayOf('2027-01-31')).toBe(0)
    expect(g[5][0]).toBe('2027-01-31')
    expect(g[5].slice(1).every((c) => c === null)).toBe(true)
  })
  it('every month grid holds exactly its days in order, on matching weekdays', () => {
    for (let m = 1; m <= 12; m++) {
      const flat = monthGrid(m as never).flat()
      const days = flat.filter((x): x is string => !!x)
      expect(days).toHaveLength(daysInMonth(m as never))
      flat.forEach((iso, i) => { if (iso) expect(weekdayOf(iso)).toBe(i % 7) })
    }
  })
  it('January lists the week of Dec 27', () => {
    expect(weeksOverlappingMonth(1)[0]).toBe('2026-12-27')
  })
})

describe('budget totals', () => {
  it('computes income, expenses and left', () => {
    const b = emptyBudget()
    b.income = [row('Pay', 10000), row('Side', 2500.5), row('Other', null)]
    b.spending = [row('Food', 3000)]
    b.expenses = [row('Rent', 4000)]
    b.savingDebt = [row('Loan', 1000)]
    expect(budgetTotals(b)).toEqual({ income: 12500.5, expenses: 8000, left: 4500.5 })
  })
  it('goes negative when overspent', () => {
    const b = emptyBudget()
    b.income = [row('Pay', 100)]
    b.spending = [row('x', 250)]
    expect(budgetTotals(b).left).toBe(-150)
  })
})
