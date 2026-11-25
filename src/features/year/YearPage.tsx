import { motion } from 'framer-motion'
import type { CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { BigTitle, PaperPage, ScriptTitle } from '../../components/paper'
import { MONTHS } from '../../lib/months'
import { useStore } from '../../store'
import s from './year.module.css'

export function YearPage() {
  const agenda = useStore((st) => st.yearAgenda)
  const setYearAgenda = useStore((st) => st.setYearAgenda)
  const name = useStore((st) => st.profile.name).trim()

  return (
    <PaperPage wide label="2027 Agenda">
      <header className={s.head}>
        <BigTitle className={s.year}>2027</BigTitle>
        <ScriptTitle className={s.agenda} rotate={-5}>AGENDA</ScriptTitle>
        <p className={s.sub}>{name ? `${name}'s year at a glance.` : 'Your year at a glance.'} Jot the big things on each month.</p>
      </header>
      <div className={s.grid}>
        {MONTHS.map((m, i) => (
          <motion.div
            key={m.n} className={s.tile} style={{ ['--tile' as string]: m.tileColor } as CSSProperties}
            initial={{ opacity: 0, y: 14, rotate: i % 2 ? 1 : -1 }} animate={{ opacity: 1, y: 0, rotate: 0 }}
            transition={{ delay: 0.04 * i, type: 'spring', stiffness: 260, damping: 22 }}
          >
            <textarea
              className={s.text} value={agenda[m.n] ?? ''} onChange={(e) => setYearAgenda(m.n, e.target.value)}
              aria-label={`${m.name} notes`} placeholder="" spellCheck
            />
            <Link to={`/m/${m.n}`} className={s.open} aria-label={`Open ${m.name}`} title={`Open ${m.name}`}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M7 17L17 7M9 7h8v8" /></svg>
            </Link>
            <span className={s.label} style={{ color: m.accentInk }}>{m.short}</span>
          </motion.div>
        ))}
      </div>
    </PaperPage>
  )
}
