import type { CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { LineInput, LineList, PaperPage } from '../../components/paper'
import type { Month } from '../../lib/dates'
import { MONTHS } from '../../lib/months'
import { fromLines, toLines } from '../../lib/text'
import { useStore } from '../../store'
import { emptyQuarter } from '../../store/defaults'
import type { Quarter } from '../../store/types'
import s from './quarter.module.css'

const EMPTY = emptyQuarter(1)

export function QuarterPage({ q }: { q: Quarter }) {
  const data = useStore((st) => st.quarters[q]) ?? EMPTY
  const setGoal = useStore((st) => st.setQuarterGoal)
  const setLines = useStore((st) => st.setQuarterMonthLines)
  const setNotes = useStore((st) => st.setQuarterNotes)
  const months = [0, 1, 2].map((i) => MONTHS[(q - 1) * 3 + i])

  return (
    <PaperPage wide label={`Quarterly plan ${q}`}>
      <div className={s.head}>
        <nav className={s.nav} aria-label="Quarter navigation">
          {q > 1 ? <Link className={s.arrow} to={`/q/${q - 1}`} aria-label={`Previous quarter, Q${q - 1}`}>&larr;</Link> : <span className={s.arrowOff} aria-hidden>&larr;</span>}
          <span className={s.qTag}>Q{q}</span>
          {q < 4 ? <Link className={s.arrow} to={`/q/${q + 1}`} aria-label={`Next quarter, Q${q + 1}`}>&rarr;</Link> : <span className={s.arrowOff} aria-hidden>&rarr;</span>}
        </nav>
        <span className={s.year}>2027</span>
      </div>
      <h1 className={s.title}>Quarterly plan</h1>
      <div className={s.goals}>
        {[0, 1, 2].map((i) => (
          <div key={i} className={s.goal}>
            <span className={s.num}>{i + 1}</span>
            <LineInput
              value={data.goals[i]} onChange={(v) => setGoal(q, i as 0 | 1 | 2, v)}
              ariaLabel={`Quarter ${q} goal ${i + 1}`} placeholder={i === 0 ? 'my biggest goal...' : undefined}
            />
          </div>
        ))}
      </div>
      <div className={s.cols}>
        {months.map((m) => (
          <section key={m.n} className={s.col} style={{ '--tile': m.tileColor, '--accent': m.accentInk, '--line': `color-mix(in srgb, ${m.accentInk} 45%, transparent)` } as CSSProperties} aria-label={m.name}>
            <Link to={`/m/${m.n}`} className={s.mname} aria-label={`Open ${m.name}`}>{m.short}</Link>
            <LineList
              values={data.months[m.n as Month] ?? []} minLines={13} ariaLabel={`${m.name} plan`}
              onChange={(v) => setLines(q, m.n as Month, v)}
            />
          </section>
        ))}
      </div>
      <section className={s.notes}>
        <h2 className={s.notesH}>Notes</h2>
        <LineList values={toLines(data.notes)} minLines={6} ariaLabel={`Quarter ${q} notes`} onChange={(v) => setNotes(q, fromLines(v))} />
      </section>
    </PaperPage>
  )
}
