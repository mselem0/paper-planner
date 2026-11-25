import { MONTH_NUMBERS, isISODate, type DayIndex, type Month } from '../lib/dates'
import { uid } from '../lib/id'
import {
  DATA_VERSION, createDefaultData, emptyBudget, emptyQuarter, emptyReview, emptyWeek,
} from './defaults'
import type {
  AppData, BudgetRow, Habit, MatrixQuadrant, Quarter, Task, TaskStatus,
} from './types'

type Obj = Record<string, unknown>
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v)
const str = (v: unknown, fb = ''): string => (typeof v === 'string' ? v : fb)
const strArr = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [])

function rows(v: unknown, fb: BudgetRow[]): BudgetRow[] {
  if (!Array.isArray(v)) return fb
  return v.filter(isObj).map((r) => ({
    id: str(r.id) || uid(),
    label: str(r.label),
    amount: typeof r.amount === 'number' && Number.isFinite(r.amount) ? r.amount : null,
  }))
}

const STATUSES: TaskStatus[] = [null, 'ok', 'delay', 'stuck', 'cancel']
function tasks(v: unknown): Task[] {
  if (!Array.isArray(v)) return []
  return v.filter(isObj).map((t) => ({
    id: str(t.id) || uid(),
    text: str(t.text),
    status: STATUSES.includes(t.status as TaskStatus) ? (t.status as TaskStatus) : null,
  }))
}

/**
 * Coerces untrusted input (imported file / old persisted state) into a complete, well-typed AppData.
 * Unknown fields are dropped, missing ones defaulted. Throws only if the input is not an object
 * or comes from a newer, unknown data version.
 */
export function normalizeData(raw: unknown): AppData {
  if (!isObj(raw)) throw new Error('This file is not a planner backup.')
  if (typeof raw.version === 'number' && raw.version > DATA_VERSION) {
    throw new Error('This backup was made by a newer version of the planner.')
  }
  const d = createDefaultData()

  if (isObj(raw.profile)) {
    d.profile.name = str(raw.profile.name)
    d.profile.currency = str(raw.profile.currency, 'EGP') || 'EGP'
  }
  if (isObj(raw.yearAgenda)) for (const m of MONTH_NUMBERS) d.yearAgenda[m] = str(raw.yearAgenda[m])

  if (isObj(raw.quarters)) {
    for (const q of [1, 2, 3, 4] as Quarter[]) {
      const src = raw.quarters[q]
      if (!isObj(src)) continue
      const qd = emptyQuarter(q)
      const g = strArr(src.goals)
      qd.goals = [g[0] ?? '', g[1] ?? '', g[2] ?? '']
      if (isObj(src.months)) for (const m of MONTH_NUMBERS) qd.months[m] = strArr(src.months[m])
      qd.notes = str(src.notes)
      d.quarters[q] = qd
    }
  }

  if (isObj(raw.days)) {
    for (const [k, v] of Object.entries(raw.days)) {
      if (isISODate(k) && isObj(v)) d.days[k] = { note: str(v.note) }
    }
  }

  if (isObj(raw.budgets)) {
    for (const m of MONTH_NUMBERS) {
      const src = raw.budgets[m]
      if (!isObj(src)) continue
      const b = emptyBudget()
      d.budgets[m] = {
        income: rows(src.income, b.income),
        spending: rows(src.spending, b.spending),
        expenses: rows(src.expenses, b.expenses),
        savingDebt: rows(src.savingDebt, b.savingDebt),
        savingGoal: str(src.savingGoal),
        emergency: str(src.emergency),
        notes: str(src.notes),
      }
    }
  }

  if (isObj(raw.weeks)) {
    for (const [k, v] of Object.entries(raw.weeks)) {
      if (!isISODate(k) || !isObj(v)) continue
      const w = emptyWeek()
      if (isObj(v.matrix)) {
        for (const quad of ['ui', 'inu', 'niu', 'ninu'] as MatrixQuadrant[]) w.matrix[quad] = strArr(v.matrix[quad])
      }
      w.notes = str(v.notes)
      if (isObj(v.days)) for (let i = 0; i < 7; i++) w.days[i as DayIndex] = tasks(v.days[i])
      if (Array.isArray(v.habits)) {
        w.habits = [0, 1, 2, 3].map((i): Habit => {
          const h = v.habits instanceof Array && isObj(v.habits[i]) ? (v.habits[i] as Obj) : {}
          const done = Array.isArray(h.done) ? h.done : []
          return { name: str(h.name), done: Array.from({ length: 7 }, (_, j) => done[j] === true) }
        })
      }
      d.weeks[k] = w
    }
  }

  if (Array.isArray(raw.notes)) {
    d.notes = raw.notes.filter(isObj).map((n) => ({
      id: str(n.id) || uid(),
      title: str(n.title),
      body: str(n.body),
      updatedAt: typeof n.updatedAt === 'number' ? n.updatedAt : Date.now(),
    }))
  }

  if (isObj(raw.review)) {
    const r = emptyReview()
    for (const key of Object.keys(r) as (keyof typeof r)[]) r[key] = str(raw.review[key])
    d.review = r
  }
  return d
}

export type { Month }
