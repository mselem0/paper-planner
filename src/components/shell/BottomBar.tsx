import { useEffect, useLayoutEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { MONTH_LINKS, QUARTER_LINKS } from './nav'
import { IconMonths, IconMore, IconNotes, IconToday, IconYear } from './icons'
import { useOverlayCoordinator } from '../../app/OverlayCoordinator'
import s from './shell.module.css'

type SheetKind = 'months' | 'more' | null

export function BottomBar() {
  const [sheet, setSheet] = useState<SheetKind>(null)
  const { setMoreOpen } = useOverlayCoordinator()
  const { pathname } = useLocation()
  const [lastPath, setLastPath] = useState(pathname)
  if (lastPath !== pathname) { setLastPath(pathname); if (sheet) setSheet(null) }
  useLayoutEffect(() => { if (sheet === 'more') setMoreOpen(true) }, [sheet, setMoreOpen])
  useEffect(() => () => setMoreOpen(false), [setMoreOpen])
  const onMonth = pathname.startsWith('/m/')

  return (
    <div className={s.sheetWrap}>
      <nav className={s.bar} aria-label="Planner sections">
        <NavLink to="/today" className={s.barBtn}><IconToday />Today</NavLink>
        <NavLink to="/year" className={s.barBtn}><IconYear />Year</NavLink>
        <button type="button" className={s.barBtn} data-open={sheet === 'months' || onMonth} aria-expanded={sheet === 'months'} onClick={() => setSheet(sheet === 'months' ? null : 'months')}><IconMonths />Months</button>
        <NavLink to="/notes" className={s.barBtn}><IconNotes />Notes</NavLink>
        <button type="button" className={s.barBtn} data-open={sheet === 'more'} aria-expanded={sheet === 'more'} onClick={() => setSheet(sheet === 'more' ? null : 'more')}><IconMore />More</button>
      </nav>
      <AnimatePresence onExitComplete={() => { if (sheet !== 'more') setMoreOpen(false) }}>
        {sheet && (
          <>
            <motion.div key="scrim" className={s.scrim} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSheet(null)} />
            <motion.div key="sheet" className={s.sheet} role="dialog" aria-label={sheet === 'months' ? 'Months' : 'More'}
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 30, stiffness: 320 }}
              drag="y" dragConstraints={{ top: 0, bottom: 0 }} dragElastic={{ top: 0, bottom: 0.5 }} onDragEnd={(_, i) => { if (i.offset.y > 80) setSheet(null) }}>
              <div className={s.grab} />
              {sheet === 'months' ? (
                <>
                  <div className={s.sheetTitle}>pick a month</div>
                  <div className={s.monthGrid}>
                    {MONTH_LINKS.map((m) => (
                      <NavLink key={m.n} to={m.to} className={s.monthTile} style={{ background: m.tileColor, color: m.accentInk }}>{m.short}</NavLink>
                    ))}
                  </div>
                  <div className={s.qRow}>
                    {QUARTER_LINKS.map(({ to, q }) => <NavLink key={q} to={to} className={s.linkRow} style={{ justifyContent: 'center' }}>Q{q}</NavLink>)}
                  </div>
                </>
              ) : (
                <>
                  <div className={s.sheetTitle}>more pages</div>
                  <div className={s.linkList}>
                    <Link to="/" className={s.linkRow}>Cover</Link>
                    <NavLink to="/review" className={s.linkRow}>How was my year?</NavLink>
                    <NavLink to="/settings" className={s.linkRow}>Settings and backup</NavLink>
                    <Link to="/shop" className={s.linkRow}>Get the paper planner</Link>
                  </div>
                </>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
