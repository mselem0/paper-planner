import { Navigate, useParams } from 'react-router-dom'
import { allWeeks } from '../lib/dates'
import { parseMonthParam } from '../lib/months'
import { BudgetPage } from '../features/budget/BudgetPage'
import { TodayPage } from '../features/today/TodayPage'
import { WeekPage } from '../features/week/WeekPage'
import { MonthPage } from '../features/month/MonthPage'
import { Link } from 'react-router-dom'
import { PaperPage } from '../components/paper'
import { NoteEditor } from '../features/notes/NoteEditor'
import { NotesPage } from '../features/notes/NotesPage'
import { QuarterPage } from '../features/quarter/QuarterPage'
import { ReviewPage } from '../features/review/ReviewPage'
import { SettingsPage } from '../features/settings/SettingsPage'
import type { Quarter } from '../store/types'

export const TodayRoute = () => <TodayPage />

export function QuarterRoute() {
  const q = Number(useParams().q)
  if (![1, 2, 3, 4].includes(q)) return <NotFound />
  return <QuarterPage q={q as Quarter} />
}

export function MonthRoute({ budget = false }: { budget?: boolean }) {
  const m = parseMonthParam(useParams().month)
  if (!m) return <NotFound />
  return budget ? <BudgetPage month={m} /> : <MonthPage month={m} />
}

export function WeekRoute() {
  const date = useParams().date ?? ''
  if (!allWeeks().includes(date)) return <NotFound />
  return <WeekPage week={date} />
}

export const NotesRoute = () => <NotesPage />
export const NoteRoute = () => <NoteEditor id={useParams().id ?? ''} />
export const ReviewRoute = () => <ReviewPage />
export const SettingsRoute = () => <SettingsPage />

export function NotFound() {
  return (
    <PaperPage label="Page not found">
      <div style={{ display: 'grid', placeItems: 'center', gap: 12, padding: '60px 0', textAlign: 'center' }}>
        <h1 style={{ fontFamily: 'var(--font-hand)', fontSize: 44, color: 'var(--red)' }}>Oops, page not found</h1>
        <Link to="/year" style={{ color: 'var(--blue)', fontWeight: 800 }}>Back to the year</Link>
      </div>
    </PaperPage>
  )
}

export const RedirectHome = () => <Navigate to="/" replace />
