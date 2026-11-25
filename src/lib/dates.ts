/** Date helpers for the 2027 planner. All maths is done in UTC so DST/timezone never shifts a day. */
export const YEAR = 2027
export type ISODate = string // YYYY-MM-DD
export type Month = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12
export type DayIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6 // 0 = Sunday

export const MONTH_NUMBERS: Month[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
export const WEEKDAY_SHORT = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'] as const
export const WEEKDAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'] as const

const pad = (n: number) => String(n).padStart(2, '0')

export function toISO(y: number, m: number, d: number): ISODate {
  return `${y}-${pad(m)}-${pad(d)}`
}

function toUTC(iso: ISODate): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d))
}

function fromUTC(dt: Date): ISODate {
  return toISO(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate())
}

export function isISODate(v: unknown): v is ISODate {
  if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return false
  return fromUTC(toUTC(v)) === v
}

export function addDays(iso: ISODate, n: number): ISODate {
  const dt = toUTC(iso)
  dt.setUTCDate(dt.getUTCDate() + n)
  return fromUTC(dt)
}

/** 0 = Sunday … 6 = Saturday */
export function weekdayOf(iso: ISODate): DayIndex {
  return toUTC(iso).getUTCDay() as DayIndex
}

export function monthOf(iso: ISODate): number {
  return Number(iso.slice(5, 7))
}
export function yearOf(iso: ISODate): number {
  return Number(iso.slice(0, 4))
}
export function dayOf(iso: ISODate): number {
  return Number(iso.slice(8, 10))
}

export function daysInMonth(m: Month, y = YEAR): number {
  return new Date(Date.UTC(y, m, 0)).getUTCDate()
}

/** The Sunday that starts the week containing `iso`. */
export function sundayOf(iso: ISODate): ISODate {
  return addDays(iso, -weekdayOf(iso))
}

/** Seven ISO dates Sun..Sat for a week keyed by its Sunday. */
export function weekDates(sunday: ISODate): ISODate[] {
  return Array.from({ length: 7 }, (_, i) => addDays(sunday, i))
}

/**
 * A week belongs to the month of its Thursday (the ISO-8601 rule).
 * The very first planner week (Sun 27 Dec 2026) has its Thursday in 2026; it is shown under January.
 */
export function weekMonth(sunday: ISODate): Month {
  const thu = addDays(sunday, 4)
  if (yearOf(thu) < YEAR) return 1
  if (yearOf(thu) > YEAR) return 12
  return monthOf(thu) as Month
}

/** Every Sunday-keyed week that touches 2027: 27 Dec 2026 … 26 Dec 2027 (53 weeks). */
export function allWeeks(y = YEAR): ISODate[] {
  const first = sundayOf(toISO(y, 1, 1))
  const lastDay = toISO(y, 12, 31)
  const out: ISODate[] = []
  for (let s = first; s <= lastDay; s = addDays(s, 7)) out.push(s)
  return out
}

/** Weeks having at least one day inside the month (a week may appear in two months). */
export function weeksOverlappingMonth(m: Month, y = YEAR): ISODate[] {
  const first = toISO(y, m, 1)
  const last = toISO(y, m, daysInMonth(m, y))
  return allWeeks(y).filter((s) => addDays(s, 6) >= first && s <= last)
}

/** Weeks whose Thursday sits in the month (each week belongs to exactly one month). */
export function weeksOwnedByMonth(m: Month, y = YEAR): ISODate[] {
  return allWeeks(y).filter((s) => weekMonth(s) === m)
}

/** 6 rows × 7 columns, Sunday first; null for padding cells. */
export function monthGrid(m: Month, y = YEAR): (ISODate | null)[][] {
  const lead = weekdayOf(toISO(y, m, 1))
  const n = daysInMonth(m, y)
  const rows: (ISODate | null)[][] = []
  for (let r = 0; r < 6; r++) {
    const row: (ISODate | null)[] = []
    for (let c = 0; c < 7; c++) {
      const day = r * 7 + c - lead + 1
      row.push(day >= 1 && day <= n ? toISO(y, m, day) : null)
    }
    rows.push(row)
  }
  return rows
}

export function quarterOf(m: Month): 1 | 2 | 3 | 4 {
  return (Math.floor((m - 1) / 3) + 1) as 1 | 2 | 3 | 4
}

export function monthsOfQuarter(q: 1 | 2 | 3 | 4): Month[] {
  const s = (q - 1) * 3 + 1
  return [s, s + 1, s + 2] as Month[]
}

export function todayISO(now = new Date()): ISODate {
  return toISO(now.getFullYear(), now.getMonth() + 1, now.getDate())
}

/** The planner month "now" maps to: real month if in 2027, otherwise clamped to Jan / Dec. */
export function currentPlannerMonth(now = new Date()): Month {
  if (now.getFullYear() < YEAR) return 1
  if (now.getFullYear() > YEAR) return 12
  return (now.getMonth() + 1) as Month
}

/** Today's week key, clamped into the planner range. */
export function currentPlannerWeek(now = new Date()): ISODate {
  const weeks = allWeeks()
  const s = sundayOf(todayISO(now))
  if (s < weeks[0]) return weeks[0]
  if (s > weeks[weeks.length - 1]) return weeks[weeks.length - 1]
  return s
}

export function formatDayLong(iso: ISODate): string {
  return toUTC(iso).toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC',
  })
}
