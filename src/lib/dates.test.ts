import { describe, expect, it } from 'vitest'
import {
  addDays, allWeeks, daysInMonth, isISODate, monthGrid, sundayOf, weekdayOf, weekDates, weekMonth,
  weeksOverlappingMonth, weeksOwnedByMonth,
} from './dates'

describe('2027 calendar', () => {
  it('Jan 1 2027 is a Friday', () => {
    expect(weekdayOf('2027-01-01')).toBe(5)
  })
  it('sundayOf snaps back to Sunday', () => {
    expect(sundayOf('2027-01-01')).toBe('2026-12-27')
    expect(sundayOf('2027-01-03')).toBe('2027-01-03')
    expect(sundayOf('2027-01-09')).toBe('2027-01-03')
  })
  it('addDays crosses months/years', () => {
    expect(addDays('2027-12-31', 1)).toBe('2028-01-01')
    expect(addDays('2027-03-01', -1)).toBe('2027-02-28')
  })
  it('validates ISO dates', () => {
    expect(isISODate('2027-02-29')).toBe(false)
    expect(isISODate('2027-02-28')).toBe(true)
  })
  it('generates 53 Sun-keyed weeks covering the year', () => {
    const w = allWeeks()
    expect(w).toHaveLength(53)
    expect(w[0]).toBe('2026-12-27')
    expect(w[52]).toBe('2027-12-26')
    expect(w.every((s) => weekdayOf(s) === 0)).toBe(true)
    expect(weekDates(w[1])).toEqual(['2027-01-03', '2027-01-04', '2027-01-05', '2027-01-06', '2027-01-07', '2027-01-08', '2027-01-09'])
  })
  it('week -> month uses the Thursday', () => {
    expect(weekMonth('2026-12-27')).toBe(1) // Thursday is 31 Dec 2026, shown under January
    expect(weekMonth('2027-01-03')).toBe(1)
    expect(weekMonth('2027-01-31')).toBe(2) // Thu 4 Feb
    expect(weekMonth('2027-03-28')).toBe(4) // Thu 1 Apr
    expect(weekMonth('2027-12-26')).toBe(12)
  })
  it('each week belongs to exactly one month', () => {
    let total = 0
    for (let m = 1; m <= 12; m++) total += weeksOwnedByMonth(m as never).length
    expect(total).toBe(53)
  })
  it('weeks overlapping a month include boundary weeks', () => {
    const jan = weeksOverlappingMonth(1)
    expect(jan[0]).toBe('2026-12-27')
    expect(jan[jan.length - 1]).toBe('2027-01-31')
    const feb = weeksOverlappingMonth(2)
    expect(feb[0]).toBe('2027-01-31')
    expect(feb).toContain('2027-02-28')
    expect(feb).not.toContain('2027-03-07')
  })
  it('month grid: Sunday first, correct leading blanks', () => {
    const g = monthGrid(1)
    expect(g).toHaveLength(6)
    expect(g[0].slice(0, 5)).toEqual([null, null, null, null, null])
    expect(g[0][5]).toBe('2027-01-01')
    expect(g[0][6]).toBe('2027-01-02')
    expect(g.flat().filter(Boolean)).toHaveLength(31)
    expect(g[4][0]).toBe('2027-01-24')
    expect(g[5][0]).toBe('2027-01-31')
  })
  it('daysInMonth knows 2027 is not a leap year', () => {
    expect(daysInMonth(2)).toBe(28)
  })
})
