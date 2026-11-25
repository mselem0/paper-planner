import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { addDays, type DayIndex, type ISODate, type Month } from '../lib/dates'
import { uid } from '../lib/id'
import { markBackup, markFirstEdit } from '../lib/backup'
import {
  DATA_VERSION, STORAGE_KEY, createDefaultData, emptyBudget, emptyQuarter, emptyWeek, row,
} from './defaults'
import { normalizeData } from './normalize'
import { plannerStorage } from './storage'
import { toast } from './toast'
import type {
  AppData, BudgetData, BudgetRow, BudgetSection, MatrixQuadrant, NoteDoc, Quarter, QuarterData,
  Habit, ReviewData, Task, TaskStatus, WeekData,
} from './types'

export const STATUS_CYCLE: TaskStatus[] = [null, 'ok', 'delay', 'stuck', 'cancel']
export const nextStatus = (s: TaskStatus): TaskStatus => STATUS_CYCLE[(STATUS_CYCLE.indexOf(s) + 1) % STATUS_CYCLE.length]

export interface Actions {
  setName: (name: string) => void
  setCurrency: (currency: string) => void
  setYearAgenda: (m: Month, text: string) => void

  setQuarterGoal: (q: Quarter, i: 0 | 1 | 2, text: string) => void
  setQuarterMonthLines: (q: Quarter, m: Month, lines: string[]) => void
  setQuarterNotes: (q: Quarter, text: string) => void

  setDayNote: (iso: ISODate, note: string) => void

  addBudgetRow: (m: Month, section: BudgetSection) => void
  updateBudgetRow: (m: Month, section: BudgetSection, id: string, patch: Partial<Omit<BudgetRow, 'id'>>) => void
  removeBudgetRow: (m: Month, section: BudgetSection, id: string) => void
  setBudgetText: (m: Month, field: 'savingGoal' | 'emergency' | 'notes', text: string) => void

  setMatrix: (week: ISODate, quad: MatrixQuadrant, lines: string[]) => void
  setWeekNotes: (week: ISODate, text: string) => void
  setDayTasks: (week: ISODate, day: DayIndex, tasks: Task[]) => void
  addTask: (week: ISODate, day: DayIndex, text?: string) => string
  updateTask: (week: ISODate, day: DayIndex, id: string, patch: Partial<Omit<Task, 'id'>>) => void
  removeTask: (week: ISODate, day: DayIndex, id: string) => void
  cycleTaskStatus: (week: ISODate, day: DayIndex, id: string) => void
  moveTaskToTomorrow: (week: ISODate, day: DayIndex, id: string) => void
  carryTaskTo: (fromWeek: ISODate, fromDay: DayIndex, id: string, toWeek: ISODate, toDay: DayIndex) => void
  setHabitName: (week: ISODate, index: number, name: string) => void
  toggleHabit: (week: ISODate, index: number, day: number) => void

  addNote: () => string
  updateNote: (id: string, patch: Partial<Pick<NoteDoc, 'title' | 'body'>>) => void
  deleteNote: (id: string) => void

  setReview: (field: keyof ReviewData, text: string) => void

  exportJSON: () => string
  downloadExport: () => void
  importJSON: (text: string) => { ok: true } | { ok: false; error: string }
  resetAll: () => void
}

export type Store = AppData & Actions

/** Pure read helpers - selectors never mutate the store, defaults are created lazily on first write. */
export const getWeek = (s: AppData, key: ISODate): WeekData => s.weeks[key] ?? emptyWeek()

const hasNames = (w: WeekData | undefined): boolean => !!w && w.habits.some((h) => h.name.trim() !== '')

/** Habit names for a week: its own if it has any, else inherited from the most recent earlier week that has names. */
export function inheritedHabitNames(weeks: Record<ISODate, WeekData>, key: ISODate): string[] {
  if (hasNames(weeks[key])) return weeks[key].habits.map((h) => h.name)
  let best: ISODate | null = null
  for (const k of Object.keys(weeks)) if (k < key && hasNames(weeks[k]) && (best === null || k > best)) best = k
  const n = (best ? weeks[best].habits.length : 4)
  return Array.from({ length: n }, (_, i) => (best ? weeks[best].habits[i]?.name ?? '' : ''))
}

/** Week habits with names resolved (done-dots always come from the week itself). */
export function resolveHabits(weeks: Record<ISODate, WeekData>, key: ISODate): Habit[] {
  const w = weeks[key] ?? emptyWeek()
  const names = inheritedHabitNames(weeks, key)
  return w.habits.map((h, i) => ({ ...h, name: names[i] ?? h.name }))
}

const dataOf = (s: Store): AppData => ({
  version: s.version, profile: s.profile, yearAgenda: s.yearAgenda, quarters: s.quarters,
  days: s.days, budgets: s.budgets, weeks: s.weeks, notes: s.notes, review: s.review,
})

export const useStore = create<Store>()(
  persist(
    (set, get) => {
      const patchWeek = (key: ISODate, fn: (w: WeekData) => WeekData) =>
        set((s) => ({ weeks: { ...s.weeks, [key]: fn(getWeek(s, key)) } }))
      const patchBudget = (m: Month, fn: (b: BudgetData) => BudgetData) =>
        set((s) => ({ budgets: { ...s.budgets, [m]: fn(s.budgets[m] ?? emptyBudget()) } }))
      const patchQuarter = (q: Quarter, fn: (x: QuarterData) => QuarterData) =>
        set((s) => ({ quarters: { ...s.quarters, [q]: fn(s.quarters[q] ?? emptyQuarter(q)) } }))
      const patchTasks = (key: ISODate, day: DayIndex, fn: (t: Task[]) => Task[]) =>
        patchWeek(key, (w) => ({ ...w, days: { ...w.days, [day]: fn(w.days[day] ?? []) } }))

      return {
        ...createDefaultData(),

        setName: (name) => set((s) => ({ profile: { ...s.profile, name } })),
        setCurrency: (currency) => set((s) => ({ profile: { ...s.profile, currency } })),
        setYearAgenda: (m, text) => set((s) => ({ yearAgenda: { ...s.yearAgenda, [m]: text } })),

        setQuarterGoal: (q, i, text) =>
          patchQuarter(q, (x) => {
            const goals = [...x.goals] as QuarterData['goals']
            goals[i] = text
            return { ...x, goals }
          }),
        setQuarterMonthLines: (q, m, lines) => patchQuarter(q, (x) => ({ ...x, months: { ...x.months, [m]: lines } })),
        setQuarterNotes: (q, text) => patchQuarter(q, (x) => ({ ...x, notes: text })),

        setDayNote: (iso, note) =>
          set((s) => {
            const days = { ...s.days }
            if (note === '') delete days[iso]
            else days[iso] = { note }
            return { days }
          }),

        addBudgetRow: (m, section) => patchBudget(m, (b) => ({ ...b, [section]: [...b[section], row()] })),
        updateBudgetRow: (m, section, id, patch) =>
          patchBudget(m, (b) => ({ ...b, [section]: b[section].map((r) => (r.id === id ? { ...r, ...patch } : r)) })),
        removeBudgetRow: (m, section, id) =>
          patchBudget(m, (b) => ({ ...b, [section]: b[section].filter((r) => r.id !== id) })),
        setBudgetText: (m, field, text) => patchBudget(m, (b) => ({ ...b, [field]: text })),

        setMatrix: (week, quad, lines) => patchWeek(week, (w) => ({ ...w, matrix: { ...w.matrix, [quad]: lines } })),
        setWeekNotes: (week, text) => patchWeek(week, (w) => ({ ...w, notes: text })),
        setDayTasks: (week, day, tasks) => patchTasks(week, day, () => tasks),
        addTask: (week, day, text = '') => {
          const id = uid()
          patchTasks(week, day, (t) => [...t, { id, text, status: null }])
          return id
        },
        updateTask: (week, day, id, patch) =>
          patchTasks(week, day, (t) => t.map((x) => (x.id === id ? { ...x, ...patch } : x))),
        removeTask: (week, day, id) => patchTasks(week, day, (t) => t.filter((x) => x.id !== id)),
        cycleTaskStatus: (week, day, id) =>
          patchTasks(week, day, (t) => t.map((x) => (x.id === id ? { ...x, status: nextStatus(x.status) } : x))),
        moveTaskToTomorrow: (week, day, id) => {
          const task = getWeek(get(), week).days[day]?.find((x) => x.id === id)
          if (!task) return
          // Tomorrow may live in the next week (Saturday -> next Sunday).
          const [toWeek, toDay] = day === 6 ? [addDays(week, 7), 0 as DayIndex] : [week, (day + 1) as DayIndex]
          patchTasks(week, day, (t) => t.filter((x) => x.id !== id))
          patchTasks(toWeek, toDay, (t) => [...t, { id: uid(), text: task.text, status: null }])
        },
        carryTaskTo: (fromWeek, fromDay, id, toWeek, toDay) => {
          const task = getWeek(get(), fromWeek).days[fromDay]?.find((x) => x.id === id)
          if (!task) return
          patchTasks(fromWeek, fromDay, (t) => t.filter((x) => x.id !== id))
          patchTasks(toWeek, toDay, (t) => [...t, { id: uid(), text: task.text, status: null }])
        },
        setHabitName: (week, index, name) =>
          set((s) => {
            // Copy-on-first-edit: a week without its own names starts from the inherited ones.
            const names = inheritedHabitNames(s.weeks, week)
            const w = getWeek(s, week)
            return {
              weeks: {
                ...s.weeks,
                [week]: { ...w, habits: w.habits.map((h, i) => ({ ...h, name: i === index ? name : names[i] ?? h.name })) },
              },
            }
          }),
        toggleHabit: (week, index, day) =>
          patchWeek(week, (w) => ({
            ...w,
            habits: w.habits.map((h, i) =>
              i === index ? { ...h, done: h.done.map((d, j) => (j === day ? !d : d)) } : h),
          })),

        addNote: () => {
          const id = uid()
          set((s) => ({ notes: [{ id, title: '', body: '', updatedAt: Date.now() }, ...s.notes] }))
          return id
        },
        updateNote: (id, patch) =>
          set((s) => ({ notes: s.notes.map((n) => (n.id === id ? { ...n, ...patch, updatedAt: Date.now() } : n)) })),
        deleteNote: (id) => set((s) => ({ notes: s.notes.filter((n) => n.id !== id) })),

        setReview: (field, text) => set((s) => ({ review: { ...s.review, [field]: text } })),

        exportJSON: () => JSON.stringify(dataOf(get()), null, 2),
        downloadExport: () => {
          try {
            const blob = new Blob([get().exportJSON()], { type: 'application/json' })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `rodaina-planner-${new Date().toISOString().slice(0, 10)}.json`
            document.body.appendChild(a)
            a.click()
            a.remove()
            setTimeout(() => URL.revokeObjectURL(url), 1000)
          } catch (e) {
            console.error('[planner] export failed', e)
            toast('Could not create the backup file. Nothing was recorded as saved.', 'error')
            return
          }
          // The browser cannot tell us whether the file really reached the device, so we only record that it was created.
          markBackup()
          toast('Backup file created. Check your Downloads or Files app to make sure it is there.', 'success')
        },
        importJSON: (text) => {
          try {
            const data = normalizeData(JSON.parse(text))
            set({ ...data, version: DATA_VERSION })
            plannerStorage.flush()
            return { ok: true }
          } catch (e) {
            const error = e instanceof SyntaxError ? 'That file is not valid JSON.' : e instanceof Error ? e.message : 'Import failed.'
            return { ok: false, error }
          }
        },
        resetAll: () => {
          set({ ...createDefaultData() })
          plannerStorage.flush()
        },
      }
    },
    {
      name: STORAGE_KEY,
      version: DATA_VERSION,
      storage: createJSONStorage(() => plannerStorage),
      partialize: (s) => dataOf(s as Store),
      // Future schema bumps: transform `persisted` from `version` up to DATA_VERSION here.
      migrate: (persisted) => normalizeData(persisted),
      merge: (persisted, current) => {
        try {
          return { ...current, ...normalizeData(persisted ?? {}) }
        } catch {
          return current
        }
      },
      onRehydrateStorage: () => (_s, err) => {
        if (err) toast('Could not read your saved planner data.', 'error')
      },
    },
  ),
)

/** First real edit starts the backup clock (reminders never nag an empty planner). */
useStore.subscribe((s, prev) => {
  if (s.profile !== prev.profile || s.weeks !== prev.weeks || s.notes !== prev.notes || s.budgets !== prev.budgets
    || s.quarters !== prev.quarters || s.review !== prev.review || s.days !== prev.days || s.yearAgenda !== prev.yearAgenda) markFirstEdit()
})
