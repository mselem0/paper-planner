import { addDays, allWeeks, dayOf, type ISODate } from './dates'
import type { WeekData } from '../store/types'

const SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const fmt = (iso: ISODate) => `${SHORT[Number(iso.slice(5, 7)) - 1]} ${dayOf(iso)}`

/** "Jan 3 – Jan 9" */
export const weekRangeTitle = (sunday: ISODate): string => `${fmt(sunday)} – ${fmt(addDays(sunday, 6))}`

/** Previous / next planner week, or null at the 2027 boundaries. */
export function shiftWeek(sunday: ISODate, dir: -1 | 1): ISODate | null {
  const weeks = allWeeks()
  const target = addDays(sunday, 7 * dir)
  return weeks.includes(target) ? target : null
}

export const isHabitComplete = (done: boolean[]): boolean => done.length === 7 && done.every(Boolean)

/** True when ticking `day` would make the row 7/7 (it is currently unticked and the other six are ticked). */
export const wouldCompleteHabit = (done: boolean[], day: number): boolean =>
  done.length === 7 && !done[day] && done.every((d, i) => i === day || d)

/** Every non-empty task of the week is OK (and there is at least one). */
export function weekAllOk(w: WeekData): boolean {
  const tasks = Object.values(w.days).flat().filter((t) => t.text.trim() !== '')
  return tasks.length > 0 && tasks.every((t) => t.status === 'ok')
}

export const habitCount = (done: boolean[]): number => done.filter(Boolean).length
