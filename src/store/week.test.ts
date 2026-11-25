import { beforeEach, describe, expect, it } from 'vitest'
import { STATUS_CYCLE, getWeek, nextStatus, resolveHabits, useStore } from './index'
import { isHabitComplete } from '../lib/week'

beforeEach(() => useStore.getState().resetAll())

describe('week actions', () => {
  it('status cycles empty > ok > delay > stuck > cancel > empty', () => {
    expect(STATUS_CYCLE).toEqual([null, 'ok', 'delay', 'stuck', 'cancel'])
    const W = '2027-01-10'
    const id = useStore.getState().addTask(W, 1, 'x')
    const seen: unknown[] = []
    for (let i = 0; i < 5; i++) {
      useStore.getState().cycleTaskStatus(W, 1, id)
      seen.push(getWeek(useStore.getState(), W).days[1][0].status)
    }
    expect(seen).toEqual(['ok', 'delay', 'stuck', 'cancel', null])
    expect(nextStatus('cancel')).toBeNull()
  })
  it('moves Saturday task to next week Sunday, mid-week to next day', () => {
    const W = '2027-01-10'
    const a = useStore.getState().addTask(W, 6, 'sat task')
    useStore.getState().moveTaskToTomorrow(W, 6, a)
    const s = useStore.getState()
    expect(getWeek(s, W).days[6]).toHaveLength(0)
    expect(getWeek(s, '2027-01-17').days[0].map((t) => t.text)).toEqual(['sat task'])
    const b = s.addTask(W, 2, 'tue task')
    useStore.getState().moveTaskToTomorrow(W, 2, b)
    expect(getWeek(useStore.getState(), W).days[3].map((t) => t.text)).toEqual(['tue task'])
  })
  it('habit row reaches 7/7 after seven toggles', () => {
    const W = '2027-01-10'
    for (let d = 0; d < 7; d++) {
      expect(isHabitComplete(getWeek(useStore.getState(), W).habits[0].done)).toBe(false)
      useStore.getState().toggleHabit(W, 0, d)
    }
    expect(isHabitComplete(getWeek(useStore.getState(), W).habits[0].done)).toBe(true)
    expect(isHabitComplete(getWeek(useStore.getState(), W).habits[1].done)).toBe(false)
  })
  it('habit names carry over to later weeks; done-dots stay per week', () => {
    const A = '2027-01-10', B = '2027-01-17', C = '2027-01-24'
    const st = () => useStore.getState()
    st().setHabitName(A, 0, 'Pray')
    st().setHabitName(A, 1, 'Read')
    st().toggleHabit(A, 0, 2)
    const b = resolveHabits(st().weeks, B)
    expect(b.map((h) => h.name)).toEqual(['Pray', 'Read', '', ''])
    expect(b[0].done.some(Boolean)).toBe(false)
    // first edit in B copies inherited names, then applies the edit
    st().setHabitName(B, 2, 'Walk')
    expect(st().weeks[B].habits.map((h) => h.name)).toEqual(['Pray', 'Read', 'Walk', ''])
    // C inherits from B (the most recent), A is untouched
    expect(resolveHabits(st().weeks, C).map((h) => h.name)).toEqual(['Pray', 'Read', 'Walk', ''])
    expect(resolveHabits(st().weeks, A).map((h) => h.name)).toEqual(['Pray', 'Read', '', ''])
    // earlier weeks never inherit from later ones
    expect(resolveHabits(st().weeks, '2027-01-03').map((h) => h.name)).toEqual(['', '', '', ''])
  })
})
