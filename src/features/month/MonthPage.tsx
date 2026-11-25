import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { PaperPage } from '../../components/paper'
import {
  WEEKDAY_LETTERS, addDays, dayOf, monthGrid, sundayOf, todayISO, weekDates, weekdayOf, weeksOverlappingMonth,
  type ISODate, type Month,
} from '../../lib/dates'
import { monthInfo } from '../../lib/months'
import { useStore } from '../../store'
import s from './month.module.css'

const SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
export function weekLabel(sunday: ISODate): string {
  const sat = addDays(sunday, 6)
  const f = (iso: ISODate) => `${SHORT[Number(iso.slice(5, 7)) - 1]} ${dayOf(iso)}`
  return `Week of ${f(sunday)} – ${f(sat)}`
}

/** Day numbers are brand blue on every sheet of the PDF calendar. */
const CAL_NUM = '#4a67ad'

const dayLabel = (iso: ISODate) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', timeZone: 'UTC' })

export function MonthPage({ month }: { month: Month }) {
  const info = monthInfo(month)
  const navigate = useNavigate()
  const days = useStore((st) => st.days)
  const weeks = useStore((st) => st.weeks)
  const setDayNote = useStore((st) => st.setDayNote)
  const [editing, setEditing] = useState<ISODate | null>(null)
  const grid = useMemo(() => monthGrid(month), [month])
  const weekKeys = useMemo(() => weeksOverlappingMonth(month), [month])
  const today = todayISO()
  const prev = month > 1 ? month - 1 : null
  const next = month < 12 ? month + 1 : null

  useEffect(() => { setEditing(null) }, [month])
  // Full-bleed month colour behind the page, like the printed calendar sheet.
  useEffect(() => {
    const prevColor = document.body.style.backgroundColor
    const prevImage = document.body.style.backgroundImage
    document.body.style.backgroundImage = 'none'
    document.body.style.backgroundColor = info.calendarBg
    return () => { document.body.style.backgroundColor = prevColor; document.body.style.backgroundImage = prevImage }
  }, [info.calendarBg])
  useEffect(() => {
    if (!editing) return
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') setEditing(null) }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [editing])

  const taskCount = (iso: ISODate) => {
    const t = weeks[sundayOf(iso)]?.days[weekdayOf(iso)] ?? []
    return t.filter((x) => x.text.trim()).length
  }

  return (
    <PaperPage wide tint={info.calendarBg} accent={info.accent} label={`${info.name} 2027 calendar`}>
      <div className={s.wrap} style={{ '--ink-m': CAL_NUM, '--grid': info.accentInk } as CSSProperties}>
        <header className={s.head}>
          <button type="button" className={s.arrow} disabled={!prev} onClick={() => prev && navigate(`/m/${prev}`)} aria-label="Previous month">&#8249;</button>
          <h1 className={s.name} style={{ color: info.accent }}>{info.name.toUpperCase()}</h1>
          <span className={s.year} style={{ color: info.accent }} aria-label="2027">2027</span>
          <button type="button" className={s.arrow} disabled={!next} onClick={() => next && navigate(`/m/${next}`)} aria-label="Next month">&#8250;</button>
        </header>

        <div className={s.dow} style={{ background: info.accent }} aria-hidden>
          {WEEKDAY_LETTERS.map((l, i) => <span key={i}>{l}</span>)}
        </div>
        <div className={s.grid} role="grid" aria-label={`${info.name} 2027`}>
          {grid.flat().map((iso, i) => {
            if (!iso) return <div key={i} className={s.empty} role="gridcell" aria-hidden />
            const note = days[iso]?.note ?? ''
            const n = taskCount(iso)
            return (
              <button
                key={iso} type="button" role="gridcell"
                className={`${s.cell} ${iso === today ? s.today : ''} ${editing === iso ? s.sel : ''}`}
                onClick={() => setEditing(iso)}
                aria-label={`${dayLabel(iso)}${note ? `, note: ${note}` : ''}${n ? `, ${n} tasks` : ''}`}
              >
                {note && <span className={s.preview}>{note}</span>}
                {n > 0 && (
                  <span className={s.tasks} aria-hidden>
                    {Array.from({ length: Math.min(n, 5) }, (_, k) => <i key={k} style={{ background: info.accentInk }} />)}
                  </span>
                )}
                <span className={s.num} style={{ color: CAL_NUM }}>{dayOf(iso)}</span>
              </button>
            )
          })}
        </div>

        <section className={s.below}>
          <Link to={`/m/${month}/budget`} className={s.budgetLink} style={{ background: info.accent }}>
            {info.name} budget &rarr;
          </Link>
          <h2 className={s.weeksTitle}>Weeks</h2>
          <ul className={s.weeks}>
            {weekKeys.map((w) => (
              <li key={w}>
                <Link to={`/w/${w}`} className={`${s.weekCard} ${weekDates(w).includes(today) ? s.weekNow : ''}`}>{weekLabel(w)}</Link>
              </li>
            ))}
          </ul>
        </section>
      </div>

      {editing && (
        <div className={s.overlay} onMouseDown={(e) => { if (e.target === e.currentTarget) setEditing(null) }}>
          <div className={s.sheet} role="dialog" aria-modal="true" aria-label={`Note for ${editing}`}>
            <div className={s.sheetHead}>
              <strong>{new Date(editing + 'T00:00:00Z').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' })}</strong>
              <button type="button" className={s.done} onClick={() => setEditing(null)}>Done</button>
            </div>
            <textarea
              autoFocus className={s.editor} rows={5} placeholder="Write a note for this day..."
              value={days[editing]?.note ?? ''} onChange={(e) => setDayNote(editing, e.target.value)}
              aria-label={`Note for ${editing}`}
            />
          </div>
        </div>
      )}
    </PaperPage>
  )
}
