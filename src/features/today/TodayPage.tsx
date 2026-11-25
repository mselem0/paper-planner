import { useState, type CSSProperties, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { PaperPage, ScriptTitle } from '../../components/paper'
import { budgetTotals, formatMoney } from '../../lib/budget'
import {
  WEEKDAY_SHORT, YEAR, formatDayLong, monthOf, sundayOf, todayISO, weekMonth, weekdayOf, yearOf, type ISODate, type Month,
} from '../../lib/dates'
import { monthInfo } from '../../lib/months'
import { habitCount } from '../../lib/week'
import { findCarryover } from '../../lib/carryover'
import { BackupNudge } from './BackupNudge'
import { GetReady } from './GetReady'
import { useStore } from '../../store'
import { DayTasks } from '../week/DayTasks'
import { HabitDot, useHabitToggle, useHabits } from '../week/HabitTracker'
import wk from '../week/week.module.css'
import s from './today.module.css'

function daysBetween(a: ISODate, b: ISODate): number {
  const u = (x: ISODate) => Date.UTC(Number(x.slice(0, 4)), Number(x.slice(5, 7)) - 1, Number(x.slice(8, 10)))
  return Math.round((u(b) - u(a)) / 86400000)
}

export function TodayPage() {
  const real = todayISO()
  const [date, setDate] = useState<ISODate>(yearOf(real) === YEAR ? real : `${YEAR}-01-01`)
  const outside = yearOf(real) !== YEAR
  const untilStart = daysBetween(real, `${YEAR}-01-01`)
  const week = sundayOf(date)
  const day = weekdayOf(date)
  const month = (yearOf(date) === YEAR ? monthOf(date) : weekMonth(week)) as Month
  const info = monthInfo(month)
  const name = useStore((st) => st.profile.name)
  const currency = useStore((st) => st.profile.currency)
  const budget = useStore((st) => st.budgets[month])
  const note = useStore((st) => st.days[date]?.note ?? '')
  const setDayNote = useStore((st) => st.setDayNote)
  const habits = useHabits(week)
  const toggle = useHabitToggle(week)
  const weeks = useStore((st) => st.weeks)
  const carryTo = useStore((st) => st.carryTaskTo)
  const setHabitName = useStore((st) => st.setHabitName)
  const [newHabit, setNewHabit] = useState('')
  const [allCarry, setAllCarry] = useState(false)
  const carry = !outside ? findCarryover(weeks, date) : []
  const addHabit = (e: FormEvent) => {
    e.preventDefault()
    const text = newHabit.trim()
    const idx = habits.findIndex((h) => !h.name.trim())
    if (!text || idx < 0) return
    setHabitName(week, idx, text)
    setNewHabit('')
  }
  const totals = budget ? budgetTotals(budget) : { income: 0, expenses: 0, left: 0 }
  const named = habits.map((h, i) => ({ h, i })).filter((x) => x.h.name.trim())

  return (
    <PaperPage tint="var(--paper)" accent={info.accent} label="Today">
      <div className={s.wrap} style={{ '--ink-m': info.accentInk } as CSSProperties}>
        <header className={s.hero}>
          <ScriptTitle size="clamp(44px, 9vw, 76px)" rotate={-3}>Hi {name.trim() || 'there'}</ScriptTitle>
          {outside && (
            <p className={s.countdown} role="status">
              {untilStart > 0
                ? `Your ${YEAR} planner starts in ${untilStart} ${untilStart === 1 ? 'day' : 'days'}. Showing ${formatDayLong(`${YEAR}-01-01`)} for now.`
                : `The ${YEAR} planner year has ended. Showing ${formatDayLong(`${YEAR}-01-01`)}.`}
            </p>
          )}
          <p className={s.date}>{formatDayLong(date)}</p>
          <label className={s.jump}>
            {outside ? 'Jump to a 2027 day' : 'Jump to'}
            <input type="date" min={`${YEAR}-01-01`} max={`${YEAR}-12-31`} value={date} onChange={(e) => e.target.value && setDate(e.target.value)} />
          </label>
        </header>

        <BackupNudge />
        <GetReady />

        {carry.length > 0 && (
          <section className={`${s.card} ${s.carry}`} aria-label="Unfinished from earlier">
            <h2 className={s.h2}>Unfinished from earlier</h2>
            <ul>
              {(allCarry ? carry : carry.slice(0, 2)).map((c) => (
                <li key={c.task.id}>
                  <span>{c.task.text}<small>{formatDayLong(c.date)} &middot; {c.task.status === 'stuck' ? 'stuck' : 'delayed'}</small></span>
                  <button type="button" className={s.carryBtn} onClick={() => carryTo(c.week, c.day, c.task.id, week, day)} aria-label={`Bring "${c.task.text}" to today`}>Bring to today</button>
                </li>
              ))}
            </ul>
            {carry.length > 2 && (
              <button type="button" className={s.moreBtn} onClick={() => setAllCarry((v) => !v)}>
                {allCarry ? 'Show fewer' : `Show ${carry.length - 2} more`}
              </button>
            )}
          </section>
        )}

        <section className={s.card} aria-label="Today's tasks">
          <h2 className={s.h2}>Today&apos;s tasks</h2>
          <DayTasks week={week} day={day} minRows={4} label={`${WEEKDAY_SHORT[day]} tasks`} />
        </section>

        <section className={s.card} aria-label="Today's habits">
          <h2 className={s.h2}>Habits</h2>
          {named.length === 0 ? (
            <p className={s.empty}>No habits yet. Add one below, or edit all of them in <Link to={`/w/${week}`}>this week&apos;s planner</Link>.</p>
          ) : (
            <ul className={s.habitList}>
              {named.map(({ h, i }) => (
                <li key={i}>
                  <HabitDot on={h.done[day]} onClick={() => toggle(i, day)} label={`${h.name}: ${h.done[day] ? 'done' : 'not done'} today`} />
                  <span className={s.habitName}>{h.name}</span>
                  <span className={s.habitCount}>{habitCount(h.done)}/7</span>
                </li>
              ))}
            </ul>
          )}
          {habits.some((h) => !h.name.trim()) && (
            <form className={s.habitAdd} onSubmit={addHabit}>
              <input value={newHabit} onChange={(e) => setNewHabit(e.target.value)} placeholder="add a habit, e.g. read 10 pages" aria-label="New habit name" maxLength={40} />
              <button type="submit">Add</button>
            </form>
          )}
        </section>

        <section className={s.card} aria-label="Day note">
          <h2 className={s.h2}>Note for the day</h2>
          <input className={`${wk.taskInput} ${s.noteInput}`} value={note} onChange={(e) => setDayNote(date, e.target.value)} placeholder="a little something to remember..." aria-label="Day note" />
        </section>

        <Link to={`/m/${month}/budget`} className={`${s.card} ${s.budget}`} aria-label={`${info.name} budget`}>
          <h2 className={s.h2}>{info.name} budget</h2>
          <div className={s.totals}>
            <span><small>income</small><b>{formatMoney(totals.income, currency)}</b></span>
            <span><small>expenses</small><b>{formatMoney(totals.expenses, currency)}</b></span>
            <span><small>left to save</small><b style={{ color: totals.left < 0 ? 'var(--red)' : undefined }}>{formatMoney(totals.left, currency)}</b></span>
          </div>
        </Link>

        <nav className={s.links} aria-label="Quick links">
          <Link to={`/w/${week}`} style={{ background: info.accent }}>This week &rarr;</Link>
          <Link to={`/m/${month}`} style={{ background: info.accent }}>{info.name} &rarr;</Link>
        </nav>
      </div>
    </PaperPage>
  )
}
