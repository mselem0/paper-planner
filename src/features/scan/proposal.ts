/**
 * Pure scan -> store merge logic (no React, no store access).
 *   buildProposal: scan result + current (resolved) week -> changes that are safe to apply + conflicts needing a choice.
 *   applyProposal: apply it through store actions only.
 * Rules: scanned/empty values never erase existing data; existing non-empty data is only replaced when the
 * conflict is resolved with 'replace'; dots only ever turn ON (an unmarked dot is "no information").
 */
import type { DayIndex, ISODate } from '../../lib/dates'
import { uid } from '../../lib/id'
import type { Actions } from '../../store'
import type { Task, TaskStatus, WeekData } from '../../store/types'
import type { ScanOk } from './engine'

export const STATUSES = ['ok', 'delay', 'stuck', 'cancel'] as const
export type StatusValue = (typeof STATUSES)[number]

export type FieldRef =
  | { kind: 'habit-done'; habit: number; day: number }
  | { kind: 'habit-name'; habit: number }
  | { kind: 'task-text'; day: number; index: number }
  | { kind: 'task-status'; day: number; index: number }

/** Parse a template `maps_to` path (the date inside is ignored: the page code's week is authoritative). */
export function parseMapsTo(path: string): FieldRef | null {
  let m = /^weeks\[[^\]]+\]\.habits\[(\d+)\]\.done\[(\d+)\]$/.exec(path)
  if (m) return { kind: 'habit-done', habit: +m[1], day: +m[2] }
  m = /^weeks\[[^\]]+\]\.habits\[(\d+)\]\.name$/.exec(path)
  if (m) return { kind: 'habit-name', habit: +m[1] }
  m = /^weeks\[[^\]]+\]\.days\[(\d+)\]\[(\d+)\]\.(text|status)$/.exec(path)
  if (m) return m[3] === 'text' ? { kind: 'task-text', day: +m[1], index: +m[2] } : { kind: 'task-status', day: +m[1], index: +m[2] }
  return null
}

/** What the user changed on the review screen, by cell id. Missing = untouched scan reading. */
export type Edits = Record<string, boolean | string | null>
export type Resolutions = Record<string, 'keep' | 'replace'>

export interface Change {
  id: string
  ref: FieldRef
  existing: boolean | string | null
  next: boolean | string
}
export interface Proposal { week: ISODate; changes: Change[]; conflicts: Change[] }

const isStatus = (v: unknown): v is StatusValue => typeof v === 'string' && (STATUSES as readonly string[]).includes(v)

export const taskAt = (w: WeekData, day: number, index: number): Task | undefined => w.days[day as DayIndex]?.[index]

/** Value a text/status cell holds before the user touches it (shared with the review UI). */
export function initialStatus(cell: { kind: string; value: unknown }): StatusValue | null {
  return cell.kind === 'choice-boxes' && isStatus(cell.value) ? cell.value : null
}

export function buildProposal(scan: ScanOk, week: WeekData, edits: Edits = {}): Proposal {
  const changes: Change[] = []
  const conflicts: Change[] = []
  const push = (c: Change) => (c.existing !== null && c.existing !== '' && c.existing !== false ? conflicts : changes).push(c)

  for (const cell of scan.cells) {
    const ref = parseMapsTo(cell.mapsTo)
    if (!ref) continue
    const edit = edits[cell.id]
    if (ref.kind === 'habit-done') {
      const next = edit !== undefined ? edit === true : cell.value === true
      const existing = week.habits[ref.habit]?.done[ref.day]
      if (existing === undefined || !next || existing) continue // off / already on / no such habit: nothing to do
      changes.push({ id: cell.id, ref, existing: false, next: true })
    } else if (ref.kind === 'habit-name' || ref.kind === 'task-text') {
      if (typeof edit !== 'string') continue // untouched: the field keeps its stored text
      const next = edit.trim()
      const existing = ref.kind === 'habit-name' ? week.habits[ref.habit]?.name : taskAt(week, ref.day, ref.index)?.text ?? ''
      if (existing === undefined || next === '' || next === existing.trim()) continue
      push({ id: cell.id, ref, existing: existing.trim(), next })
    } else {
      const next = edit !== undefined ? edit : initialStatus(cell)
      if (!isStatus(next)) continue
      const existing: TaskStatus = taskAt(week, ref.day, ref.index)?.status ?? null
      if (next === existing) continue
      push({ id: cell.id, ref, existing, next })
    }
  }
  return { week: scan.page.key, changes, conflicts }
}

export type ApplyActions = Pick<Actions, 'toggleHabit' | 'setHabitName' | 'setDayTasks'>

/** Apply safe changes plus the conflicts resolved to 'replace' (default keep). Returns how many fields were written. */
export function applyProposal(p: Proposal, resolutions: Resolutions, week: WeekData, actions: ApplyActions): number {
  const todo = [...p.changes, ...p.conflicts.filter((c) => resolutions[c.id] === 'replace')]
  const days = new Map<number, Task[]>()
  let n = 0
  for (const c of todo) {
    const r = c.ref
    if (r.kind === 'habit-done') {
      if (!week.habits[r.habit]?.done[r.day]) { actions.toggleHabit(p.week, r.habit, r.day); n++ }
    } else if (r.kind === 'habit-name') {
      actions.setHabitName(p.week, r.habit, String(c.next)); n++
    } else {
      let tasks = days.get(r.day)
      if (!tasks) { tasks = (week.days[r.day as DayIndex] ?? []).map((t) => ({ ...t })); days.set(r.day, tasks) }
      while (tasks.length <= r.index) tasks.push({ id: uid(), text: '', status: null })
      if (r.kind === 'task-text') tasks[r.index].text = String(c.next)
      else tasks[r.index].status = c.next as StatusValue
      n++
    }
  }
  for (const [day, tasks] of days) actions.setDayTasks(p.week, day as DayIndex, tasks)
  return n
}
