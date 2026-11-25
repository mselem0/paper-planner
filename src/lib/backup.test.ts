import { describe, expect, it } from 'vitest'
import { backupDue, markBackup, markFirstEdit, readBackupMeta } from './backup'
import { findCarryover } from './carryover'
import { emptyWeek } from '../store/defaults'

const mem = (): Storage => {
  const m = new Map<string, string>()
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v), removeItem: (k) => void m.delete(k), clear: () => m.clear(), key: () => null, length: 0 } as Storage
}
const DAY = 86400000

describe('backup reminder', () => {
  it('never nags an untouched planner', () => {
    expect(backupDue(readBackupMeta(mem()))).toBe(false)
  })
  it('is due 7 days after first edit with no backup, and resets after a backup', () => {
    const st = mem(); const t0 = 1_000_000_000_000
    markFirstEdit(t0, st)
    expect(backupDue(readBackupMeta(st), t0 + 6 * DAY)).toBe(false)
    expect(backupDue(readBackupMeta(st), t0 + 7 * DAY)).toBe(true)
    markBackup(t0 + 8 * DAY, st)
    expect(backupDue(readBackupMeta(st), t0 + 10 * DAY)).toBe(false)
    expect(backupDue(readBackupMeta(st), t0 + 15 * DAY)).toBe(true)
  })
  it('survives corrupt stored meta', () => {
    const st = mem(); st.setItem('rodaina-planner:backup-meta', '{nope')
    expect(readBackupMeta(st)).toEqual({ firstEditAt: null, lastBackupAt: null })
  })
})

describe('carryover boundaries', () => {
  const mk = (week: string, day: number, status: 'delay' | 'stuck' | 'ok') => { const w = emptyWeek(); w.days[day as 0] = [{ id: 'x', text: 'T', status }]; return { [week]: w } }
  it('7-day cutoff: day -7 included, day -8 excluded', () => {
    expect(findCarryover(mk('2027-01-10', 0, 'delay'), '2027-01-17')).toHaveLength(1)
    expect(findCarryover(mk('2027-01-10', 0, 'delay'), '2027-01-18')).toHaveLength(0)
  })
  it('crosses the year boundary: Dec 28 2026 task shows on Jan 1 2027', () => {
    expect(findCarryover(mk('2026-12-27', 1, 'stuck'), '2027-01-01')).toHaveLength(1)
  })
  it('ok tasks and future days never carry', () => {
    expect(findCarryover(mk('2027-01-10', 0, 'ok'), '2027-01-12')).toHaveLength(0)
    expect(findCarryover(mk('2027-01-10', 3, 'delay'), '2027-01-12')).toHaveLength(0)
  })
})

describe('carryover', () => {
  it('finds delayed/stuck tasks from the previous days, across a week boundary', () => {
    const w1 = emptyWeek(); w1.days[6] = [{ id: 'a', text: 'Pay rent', status: 'delay' }, { id: 'b', text: 'done', status: 'ok' }, { id: 'c', text: '  ', status: 'stuck' }]
    const w2 = emptyWeek(); w2.days[0] = [{ id: 'd', text: 'Call', status: 'stuck' }]
    const r = findCarryover({ '2027-01-03': w1, '2027-01-10': w2 }, '2027-01-11')
    expect(r.map((x) => x.task.id)).toEqual(['d', 'a'])
    const r2 = findCarryover({ '2027-01-03': w1, '2027-01-10': w2 }, '2027-01-17')
    expect(r2.map((x) => x.task.id)).toEqual(['d'])
    expect(findCarryover({ '2027-01-03': w1 }, '2027-01-10').map((x) => x.task.id)).toEqual(['a'])
  })
})

