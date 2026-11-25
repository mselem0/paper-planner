import { Link, NavLink } from 'react-router-dom'
import { MONTH_LINKS, QUARTER_LINKS } from './nav'
import s from './shell.module.css'

const plain = (to: string, label: string, hint: string, bg = 'var(--paper)') => (
  <NavLink key={to} to={to} className={s.tab} style={{ ['--bg' as string]: bg }}>
    <span className={s.tabName}>{label}</span><span className={s.tabHint}>{hint}</span>
  </NavLink>
)

export function Rail() {
  return (
    <nav className={s.rail} aria-label="Planner sections">
      <Link to="/" className={s.brand} aria-label="Cover">
        <span className={s.brandYear}>2027</span><span className={s.brandWord}>planner</span>
      </Link>
      <div className={s.tabs}>
        {plain('/today', 'Today', 'now', 'var(--blue-tint)')}
        {plain('/year', 'Year', '2027', 'var(--blue-tint)')}
      </div>
      <div className={s.group}>quarters</div>
      <div className={s.quarters}>
        {QUARTER_LINKS.map(({ to, q }) => <NavLink key={q} to={to} className={s.qTab} aria-label={`Quarter ${q}`}>Q{q}</NavLink>)}
      </div>
      <div className={s.group}>months</div>
      <div className={s.tabs}>
        {MONTH_LINKS.map((m) => (
          <NavLink key={m.n} to={m.to} className={s.tab} style={{ ['--bg' as string]: m.tileColor }}
            aria-label={m.name}>
            <span className={s.tabName}>{m.short}</span>
            <span className={s.tabDot} style={{ background: m.accent }} aria-hidden />
          </NavLink>
        ))}
      </div>
      <div className={s.spacer} />
      <div className={s.tabs}>
        {plain('/notes', 'Notes', 'ink')}
        {plain('/review', 'Review', '?')}
        {plain('/settings', 'Settings', '')}
      </div>
    </nav>
  )
}
