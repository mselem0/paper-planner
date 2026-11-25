import { describe, expect, it } from 'vitest'
import { shiftWeek, weekAllOk, weekRangeTitle, wouldCompleteHabit, isHabitComplete } from './week'
import { emptyWeek } from '../store/defaults'

describe('week helpers', () => {
  it('range title and bounds', () => {
    expect(weekRangeTitle('2027-01-03')).toBe('Jan 3 – Jan 9')
    expect(shiftWeek('2026-12-27', -1)).toBeNull()
    expect(shiftWeek('2027-12-26', 1)).toBeNull()
    expect(shiftWeek('2027-01-03', -1)).toBe('2026-12-27')
  })
  it('detects habit 7/7', () => {
    expect(isHabitComplete(Array(7).fill(true))).toBe(true)
    expect(isHabitComplete([true, true, true, true, true, true, false])).toBe(false)
    expect(wouldCompleteHabit([true, true, true, true, true, true, false], 6)).toBe(true)
    expect(wouldCompleteHabit([true, true, true, false, true, true, false], 6)).toBe(false)
    expect(wouldCompleteHabit(Array(7).fill(true), 2)).toBe(false)
  })
  it('weekAllOk ignores blank tasks, needs at least one', () => {
    const w = emptyWeek()
    expect(weekAllOk(w)).toBe(false)
    w.days[1] = [{ id: 'a', text: 'x', status: 'ok' }, { id: 'b', text: '', status: null }]
    expect(weekAllOk(w)).toBe(true)
    w.days[2] = [{ id: 'c', text: 'y', status: 'delay' }]
    expect(weekAllOk(w)).toBe(false)
  })
})
