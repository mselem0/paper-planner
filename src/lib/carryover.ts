import { addDays, sundayOf, weekdayOf, type DayIndex, type ISODate } from './dates'
import type { Task, WeekData } from '../store/types'

export interface Carry { week: ISODate; day: DayIndex; date: ISODate; task: Task }

/** Unfinished tasks (marked DELAY or STUCK, with text) from the `lookback` days before `date`. Newest day first. */
export function findCarryover(weeks: Record<ISODate, WeekData>, date: ISODate, lookback = 7): Carry[] {
  const out: Carry[] = []
  for (let i = 1; i <= lookback; i++) {
    const d = addDays(date, -i)
    const week = sundayOf(d)
    const day = weekdayOf(d)
    for (const t of weeks[week]?.days[day] ?? []) {
      if ((t.status === 'delay' || t.status === 'stuck') && t.text.trim()) out.push({ week, day, date: d, task: t })
    }
  }
  return out
}
