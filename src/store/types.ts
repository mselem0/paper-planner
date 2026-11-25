import type { DayIndex, ISODate, Month } from '../lib/dates'

export type Quarter = 1 | 2 | 3 | 4
export interface BudgetRow { id: string; label: string; amount: number | null }
export type BudgetSection = 'income' | 'spending' | 'expenses' | 'savingDebt'
export interface BudgetData {
  income: BudgetRow[]
  spending: BudgetRow[]
  expenses: BudgetRow[]
  savingDebt: BudgetRow[]
  savingGoal: string
  emergency: string
  notes: string
}
export type TaskStatus = null | 'ok' | 'delay' | 'stuck' | 'cancel'
export interface Task { id: string; text: string; status: TaskStatus }
export type MatrixQuadrant = 'ui' | 'inu' | 'niu' | 'ninu'
export interface Habit { name: string; done: boolean[] }
export interface WeekData {
  matrix: Record<MatrixQuadrant, string[]>
  notes: string
  days: Record<DayIndex, Task[]>
  habits: Habit[]
}
export interface QuarterData {
  goals: [string, string, string]
  months: Record<Month, string[]>
  notes: string
}
export interface NoteDoc { id: string; title: string; body: string; updatedAt: number }
export interface ReviewData {
  goal: string; inspired: string; lowest: string; skills: string
  favorites: string; betterNextYear: string; improve: string
}
export interface Profile { name: string; currency: string }

export interface AppData {
  version: number
  profile: Profile
  yearAgenda: Record<Month, string>
  quarters: Record<Quarter, QuarterData>
  days: Record<ISODate, { note: string }>
  budgets: Record<Month, BudgetData>
  weeks: Record<ISODate, WeekData>
  notes: NoteDoc[]
  review: ReviewData
}
