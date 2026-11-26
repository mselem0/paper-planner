import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { BigTitle, LineList, MonthDots, PaperPage } from '../../components/paper'
import { celebrate } from '../../lib/confetti'
import { WEEKDAY_SHORT, dayOf, todayISO, weekDates, weekMonth, type DayIndex, type ISODate } from '../../lib/dates'
import { monthInfo } from '../../lib/months'
import { shiftWeek, weekAllOk, weekRangeTitle } from '../../lib/week'
import { getWeek, useStore } from '../../store'
import type { MatrixQuadrant } from '../../store/types'
import { DayTasks, StatusLegend } from './DayTasks'
import { HabitTracker } from './HabitTracker'
import s from './week.module.css'

const QUADS: { key: MatrixQuadrant; label: string }[] = [
  { key: 'ui', label: 'Important & Urgent' },
  { key: 'inu', label: 'Important & not urgent' },
  { key: 'niu', label: 'not important & Urgent' },
  { key: 'ninu', label: 'not important & not urgent' },
]

function Matrix({ week }: { week: ISODate }) {
  const matrix = useStore((st) => st.weeks[week]?.matrix) ?? getWeek(useStore.getState(), week).matrix
  const notes = useStore((st) => st.weeks[week]?.notes ?? '')
  const setMatrix = useStore((st) => st.setMatrix)
  const setNotes = useStore((st) => st.setWeekNotes)
  return (
    <div className={s.panelInner}>
      <div className={s.quads}>
        {QUADS.map((q) => (
          <section key={q.key} className={s.quad} aria-label={q.label}>
            <h3 className={s.quadLabel}>{q.label}</h3>
            <LineList values={matrix[q.key]} onChange={(v) => setMatrix(week, q.key, v)} minLines={9} ariaLabel={q.label} lineHeight={30} />
          </section>
        ))}
      </div>
      <BigTitle as="h2" color="var(--accent)" size="clamp(40px, 7vw, 58px)" className={s.notesTitle}>NOTES</BigTitle>
      <LineList values={notes.split('\n')} onChange={(v) => setNotes(week, v.join('\n'))} minLines={6} ariaLabel="Week notes" />
    </div>
  )
}

function Planner({ week }: { week: ISODate }) {
  const dates = weekDates(week)
  const today = todayISO()
  return (
    <div className={s.panelInner} data-testid="weekly-planner">
      <StatusLegend />
      <div className={s.days}>
        {dates.map((iso, i) => (
          <div key={iso} className={`${s.dayRow} ${iso === today ? s.dayNow : ''}`}>
            <div className={s.dayLabel}>
              <span>{WEEKDAY_SHORT[i]}</span>
              <small>{dayOf(iso)}</small>
            </div>
            <DayTasks week={week} day={i as DayIndex} label={`${WEEKDAY_SHORT[i]} ${dayOf(iso)} tasks`} />
          </div>
        ))}
      </div>
      <HabitTracker week={week} />
    </div>
  )
}

export function WeekPage({ week }: { week: ISODate }) {
  const month = weekMonth(week)
  const info = monthInfo(month)
  const navigate = useNavigate()
  const location = useLocation()
  const [tab, setTab] = useState<'matrix' | 'planner'>(
    (location.state as { tab?: string } | null)?.tab === 'planner' ? 'planner' : 'matrix',
  )
  const prev = shiftWeek(week, -1)
  const next = shiftWeek(week, 1)
  const allOk = useStore((st) => (st.weeks[week] ? weekAllOk(st.weeks[week]) : false))
  const prevAllOk = useRef(allOk)
  const lastWeek = useRef(week)
  useEffect(() => {
    if (lastWeek.current !== week) { lastWeek.current = week; prevAllOk.current = allOk; return }
    if (allOk && !prevAllOk.current) celebrate(month, true)
    prevAllOk.current = allOk
  }, [allOk, week, month])

  return (
    <PaperPage tint="var(--paper)" accent={info.accent} className={s.root} label={`Week of ${week}`}>
      <div className={s.wrap} style={{ '--ink-m': info.accentInk } as CSSProperties}>
        <header className={s.head}>
          <MonthDots current={month} accent={info.accent} />
          <span className={s.year}>2027</span>
        </header>
        <div className={s.titleRow}>
          <button type="button" className={s.arrow} disabled={!prev} onClick={() => prev && navigate(`/w/${prev}`)} aria-label="Previous week">&#8249;</button>
          <h1 className={s.title}>{weekRangeTitle(week)}</h1>
          <button type="button" className={s.arrow} disabled={!next} onClick={() => next && navigate(`/w/${next}`)} aria-label="Next week">&#8250;</button>
          <Link to={`/m/${month}`} className={s.monthLink} style={{ background: info.accent }}>{info.name} &rarr;</Link>
          <Link to="/scan" className={s.scanLink}>Scan page</Link>
        </div>
        <div className={s.tabs} role="tablist" aria-label="Week view">
          {([['matrix', 'Priority matrix'], ['planner', 'Weekly planner']] as const).map(([k, l]) => (
            <button key={k} type="button" role="tab" aria-selected={tab === k} className={`${s.tab} ${tab === k ? s.tabOn : ''}`} onClick={() => setTab(k)}>{l}</button>
          ))}
        </div>
        <div className={s.spread}>
          <div className={`${s.panel} ${tab === 'matrix' ? s.panelOn : ''}`}><Matrix week={week} /></div>
          <div className={`${s.panel} ${tab === 'planner' ? s.panelOn : ''}`}><Planner week={week} /></div>
        </div>
      </div>
    </PaperPage>
  )
}
