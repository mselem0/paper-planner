import { MONTH_NUMBERS, type DayIndex, type Month } from '../lib/dates'
import { uid } from '../lib/id'
import type {
  AppData, BudgetData, BudgetRow, Quarter, QuarterData, ReviewData, WeekData,
} from './types'

export const DATA_VERSION = 1
export const STORAGE_KEY = 'rodaina-planner:v1'

export const row = (label = '', amount: number | null = null): BudgetRow => ({ id: uid(), label, amount })

export function emptyBudget(): BudgetData {
  return {
    income: [row('Paycheck'), row('Side income'), row('Other')],
    spending: [row(), row(), row(), row()],
    expenses: [row(), row(), row(), row()],
    savingDebt: [row(), row()],
    savingGoal: '', emergency: '', notes: '',
  }
}

export function emptyWeek(): WeekData {
  const days = {} as Record<DayIndex, never[]>
  for (let i = 0; i < 7; i++) days[i as DayIndex] = []
  return {
    matrix: { ui: [], inu: [], niu: [], ninu: [] },
    notes: '',
    days: days as WeekData['days'],
    habits: [0, 1, 2, 3].map(() => ({ name: '', done: Array(7).fill(false) as boolean[] })),
  }
}

export function emptyQuarter(q: Quarter): QuarterData {
  const months = {} as Record<Month, string[]>
  for (const m of MONTH_NUMBERS) months[m] = []
  void q
  return { goals: ['', '', ''], months, notes: '' }
}

export const emptyReview = (): ReviewData => ({
  goal: '', inspired: '', lowest: '', skills: '', favorites: '', betterNextYear: '', improve: '',
})

export function createDefaultData(): AppData {
  const yearAgenda = {} as Record<Month, string>
  const budgets = {} as Record<Month, BudgetData>
  for (const m of MONTH_NUMBERS) { yearAgenda[m] = ''; budgets[m] = emptyBudget() }
  return {
    version: DATA_VERSION,
    profile: { name: '', currency: 'EGP' },
    yearAgenda,
    quarters: { 1: emptyQuarter(1), 2: emptyQuarter(2), 3: emptyQuarter(3), 4: emptyQuarter(4) },
    days: {},
    budgets,
    weeks: {},
    notes: [],
    review: emptyReview(),
  }
}
