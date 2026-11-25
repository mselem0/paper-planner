import { beforeEach, describe, expect, it } from 'vitest'
import { budgetTotals } from '../lib/budget'
import { getWeek, nextStatus, useStore } from './index'
import { createDefaultData } from './defaults'
import { normalizeData } from './normalize'
import { createDebouncedStorage } from './storage'
import { useToasts } from './toast'

const W = '2027-01-03'
beforeEach(() => { useStore.getState().resetAll(); useToasts.setState({ toasts: [] }) })

describe('store', () => {
  it('has the full default data model', () => {
    const s = useStore.getState()
    expect(Object.keys(s.yearAgenda)).toHaveLength(12)
    expect(Object.keys(s.budgets)).toHaveLength(12)
    expect(Object.keys(s.quarters)).toHaveLength(4)
    expect(s.profile.currency).toBe('EGP')
  })
  it('profile + year agenda', () => {
    useStore.getState().setName('Rodaina')
    useStore.getState().setYearAgenda(3, 'Trip')
    expect(useStore.getState().profile.name).toBe('Rodaina')
    expect(useStore.getState().yearAgenda[3]).toBe('Trip')
  })
  it('tasks: add, cycle status, move to tomorrow (incl. across weeks)', () => {
    const s = useStore.getState()
    const id = s.addTask(W, 2, 'Call bank')
    expect(getWeek(useStore.getState(), W).days[2][0].text).toBe('Call bank')
    s.cycleTaskStatus(W, 2, id)
    expect(getWeek(useStore.getState(), W).days[2][0].status).toBe('ok')
    expect(nextStatus('cancel')).toBeNull()
    s.moveTaskToTomorrow(W, 2, id)
    expect(getWeek(useStore.getState(), W).days[2]).toHaveLength(0)
    expect(getWeek(useStore.getState(), W).days[3][0].text).toBe('Call bank')
    const sat = s.addTask(W, 6, 'Rest')
    s.moveTaskToTomorrow(W, 6, sat)
    expect(getWeek(useStore.getState(), '2027-01-10').days[0][0].text).toBe('Rest')
  })
  it('habits toggle', () => {
    useStore.getState().toggleHabit(W, 1, 4)
    expect(getWeek(useStore.getState(), W).habits[1].done[4]).toBe(true)
    useStore.getState().toggleHabit(W, 1, 4)
    expect(getWeek(useStore.getState(), W).habits[1].done[4]).toBe(false)
  })
  it('budget rows + totals', () => {
    const s = useStore.getState()
    const b = s.budgets[1]
    s.updateBudgetRow(1, 'income', b.income[0].id, { amount: 10000 })
    s.updateBudgetRow(1, 'spending', b.spending[0].id, { amount: 2500 })
    s.updateBudgetRow(1, 'expenses', b.expenses[0].id, { amount: 3000 })
    s.addBudgetRow(1, 'savingDebt')
    const sd = useStore.getState().budgets[1].savingDebt
    s.updateBudgetRow(1, 'savingDebt', sd[sd.length - 1].id, { amount: 1000 })
    expect(budgetTotals(useStore.getState().budgets[1])).toEqual({ income: 10000, expenses: 6500, left: 3500 })
  })
  it('day notes clear when emptied', () => {
    useStore.getState().setDayNote('2027-05-05', 'Dentist')
    expect(useStore.getState().days['2027-05-05'].note).toBe('Dentist')
    useStore.getState().setDayNote('2027-05-05', '')
    expect(useStore.getState().days['2027-05-05']).toBeUndefined()
  })
  it('notes CRUD', () => {
    const id = useStore.getState().addNote()
    useStore.getState().updateNote(id, { title: 'Ideas' })
    expect(useStore.getState().notes[0].title).toBe('Ideas')
    useStore.getState().deleteNote(id)
    expect(useStore.getState().notes).toHaveLength(0)
  })
  it('export -> reset -> import restores everything', () => {
    const s = useStore.getState()
    s.setName('Rodaina'); s.addTask(W, 1, 'x'); s.setReview('goal', 'Ship it'); s.setQuarterGoal(2, 1, 'Run 5k')
    const json = s.exportJSON()
    s.resetAll()
    expect(useStore.getState().profile.name).toBe('')
    expect(useStore.getState().importJSON(json)).toEqual({ ok: true })
    const r = useStore.getState()
    expect(r.profile.name).toBe('Rodaina')
    expect(getWeek(r, W).days[1][0].text).toBe('x')
    expect(r.review.goal).toBe('Ship it')
    expect(r.quarters[2].goals[1]).toBe('Run 5k')
  })
  it('import rejects bad input without touching data', () => {
    useStore.getState().setName('Keep')
    expect(useStore.getState().importJSON('{nope').ok).toBe(false)
    expect(useStore.getState().importJSON('[1,2]').ok).toBe(false)
    expect(useStore.getState().importJSON(JSON.stringify({ version: 99 })).ok).toBe(false)
    expect(useStore.getState().profile.name).toBe('Keep')
  })
})

describe('normalizeData', () => {
  it('fills defaults and drops garbage', () => {
    const d = normalizeData({ profile: { name: 5 }, weeks: { 'bad': {}, '2027-01-03': { days: { 0: [{ text: 'a', status: 'nope' }] } } } })
    expect(d.profile.name).toBe('')
    expect(Object.keys(d.weeks)).toEqual(['2027-01-03'])
    expect(d.weeks['2027-01-03'].days[0][0].status).toBeNull()
    expect(d.weeks['2027-01-03'].habits).toHaveLength(4)
    expect(d.budgets[12].income.length).toBeGreaterThan(0)
  })
  it('default data round-trips', () => {
    const def = createDefaultData()
    const back = normalizeData(JSON.parse(JSON.stringify(def)))
    expect(back.quarters).toEqual(def.quarters)
    expect(back.yearAgenda).toEqual(def.yearAgenda)
  })
})

describe('debounced storage', () => {
  it('coalesces writes and flushes', () => {
    const mem = new Map<string, string>()
    const backing = { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, v), removeItem: (k: string) => void mem.delete(k) } as unknown as Storage
    const st = createDebouncedStorage(10_000, () => backing)
    st.setItem('k', '1'); st.setItem('k', '2')
    expect(mem.has('k')).toBe(false)
    expect(st.getItem('k')).toBe('2')
    st.flush()
    expect(mem.get('k')).toBe('2')
  })
  it('surfaces quota errors as a toast instead of failing silently', () => {
    const backing = { getItem: () => null, setItem: () => { throw new DOMException('full', 'QuotaExceededError') }, removeItem: () => {} } as unknown as Storage
    const st = createDebouncedStorage(10_000, () => backing)
    st.setItem('k', 'v'); st.flush()
    expect(useToasts.getState().toasts.some((t) => t.kind === 'error')).toBe(true)
  })
})
