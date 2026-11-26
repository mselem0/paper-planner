import { beforeEach, describe, expect, it } from 'vitest'
import { getWeek, resolveHabits, useStore } from '../../store'
import type { WeekData } from '../../store/types'
import { applyProposal, buildProposal, parseMapsTo } from './proposal'
import { WEEK, cell, scanOf } from './testkit'

beforeEach(() => { useStore.getState().resetAll() })
const week = (): WeekData => { const w = useStore.getState().weeks; return { ...getWeek({ weeks: w } as never, WEEK), habits: resolveHabits(w, WEEK) } }
const actions = () => { const { toggleHabit, setHabitName, setDayTasks } = useStore.getState(); return { toggleHabit, setHabitName, setDayTasks } }
const stored = () => getWeek(useStore.getState(), WEEK)

describe('parseMapsTo', () => {
  it('parses the four path shapes and rejects others', () => {
    expect(parseMapsTo('weeks[2027-01-03].habits[1].done[4]')).toEqual({ kind: 'habit-done', habit: 1, day: 4 })
    expect(parseMapsTo('weeks[2027-01-03].habits[2].name')).toEqual({ kind: 'habit-name', habit: 2 })
    expect(parseMapsTo('weeks[2027-01-03].days[3][5].text')).toEqual({ kind: 'task-text', day: 3, index: 5 })
    expect(parseMapsTo('weeks[2027-01-03].days[3][5].status')).toEqual({ kind: 'task-status', day: 3, index: 5 })
    expect(parseMapsTo('weeks[x].matrix')).toBeNull()
  })
})

describe('buildProposal / applyProposal', () => {
  it('turns dots on, never off, and ignores unmarked dots', () => {
    useStore.getState().toggleHabit(WEEK, 0, 1)
    const scan = scanOf([
      cell('h0d0', 'dot', 'weeks[DATE].habits[0].done[0]', true),
      cell('h0d1', 'dot', 'weeks[DATE].habits[0].done[1]', false), // unmarked, but stored as done: must stay done
      cell('h0d2', 'dot', 'weeks[DATE].habits[0].done[2]', false),
    ])
    const p = buildProposal(scan, week())
    expect(p.conflicts).toEqual([])
    expect(p.changes.map((c) => c.id)).toEqual(['h0d0'])
    expect(applyProposal(p, {}, week(), actions())).toBe(1)
    expect(stored().habits[0].done.slice(0, 3)).toEqual([true, true, false])
    // user explicitly toggling an unmarked dot to false is also a no-op (no erasing)
    expect(buildProposal(scan, week(), { h0d0: false }).changes).toEqual([])
  })

  it('creates tasks by index, padding gaps, and sets status from choice boxes', () => {
    const scan = scanOf([
      cell('t', 'text-line', 'weeks[DATE].days[2][2].text', true),
      cell('ts', 'choice-boxes', 'weeks[DATE].days[2][2].status', 'delay'),
    ])
    const p = buildProposal(scan, week(), { t: '  Buy milk ' })
    expect(p.changes).toHaveLength(2)
    applyProposal(p, {}, week(), actions())
    const tasks = stored().days[2]
    expect(tasks).toHaveLength(3)
    expect(tasks[0]).toMatchObject({ text: '', status: null })
    expect(tasks[2]).toMatchObject({ text: 'Buy milk', status: 'delay' })
    expect(new Set(tasks.map((t) => t.id)).size).toBe(3)
  })

  it('symbol-circle mark alone proposes nothing until the user picks a status', () => {
    const scan = scanOf([cell('c', 'symbol-circle', 'weeks[DATE].days[0][0].status', true)])
    expect(buildProposal(scan, week()).changes).toEqual([])
    expect(buildProposal(scan, week(), { c: 'stuck' }).changes[0]).toMatchObject({ next: 'stuck', existing: null })
  })

  it('conflicts on existing text/status/name default to keep; replace is explicit', () => {
    const st = useStore.getState()
    const id = st.addTask(WEEK, 0, 'old task')
    st.updateTask(WEEK, 0, id, { status: 'ok' })
    st.setHabitName(WEEK, 0, 'Read')
    const scan = scanOf([
      cell('t', 'text-line', 'weeks[DATE].days[0][0].text', true),
      cell('s', 'choice-boxes', 'weeks[DATE].days[0][0].status', 'cancel'),
      cell('n', 'text-line', 'weeks[DATE].habits[0].name', true),
    ])
    const p = buildProposal(scan, week(), { t: 'new task', n: 'Walk' })
    expect(p.changes).toEqual([])
    expect(p.conflicts.map((c) => [c.id, c.existing, c.next])).toEqual([['t', 'old task', 'new task'], ['s', 'ok', 'cancel'], ['n', 'Read', 'Walk']])

    expect(applyProposal(p, {}, week(), actions())).toBe(0) // default keep
    expect(stored().days[0][0]).toMatchObject({ text: 'old task', status: 'ok' })
    expect(stored().habits[0].name).toBe('Read')

    expect(applyProposal(p, { t: 'replace', n: 'replace' }, week(), actions())).toBe(2)
    expect(stored().days[0][0]).toMatchObject({ text: 'new task', status: 'ok' })
    expect(stored().habits[0].name).toBe('Walk')
  })

  it('empty or unchanged text never erases or conflicts; inherited habit names count as existing', () => {
    useStore.getState().setHabitName('2026-12-27', 0, 'Inherited')
    const w = week()
    expect(w.habits[0].name).toBe('Inherited')
    const scan = scanOf([
      cell('n', 'text-line', 'weeks[DATE].habits[0].name', true),
      cell('t', 'text-line', 'weeks[DATE].days[1][0].text', false),
    ])
    expect(buildProposal(scan, w, { n: '', t: '' })).toMatchObject({ changes: [], conflicts: [] })
    expect(buildProposal(scan, w, { n: 'Inherited' })).toMatchObject({ changes: [], conflicts: [] })
    const p = buildProposal(scan, w, { n: 'Other' })
    expect(p.conflicts[0]).toMatchObject({ existing: 'Inherited', next: 'Other' })
  })

  it('writes a habit name into a week with no existing name', () => {
    const scan = scanOf([cell('n', 'text-line', 'weeks[DATE].habits[1].name', true)])
    applyProposal(buildProposal(scan, week(), { n: 'Sport' }), {}, week(), actions())
    expect(stored().habits[1].name).toBe('Sport')
  })
})
