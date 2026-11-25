import { AnimatePresence, motion } from 'framer-motion'
import { useEffect } from 'react'
import { useLocation, useOutlet } from 'react-router-dom'
import { BottomBar } from './BottomBar'
import { Rail } from './Rail'
import s from './shell.module.css'

/** Left rail (desktop) / bottom bar (mobile) around a page-turning outlet. */
export function Shell() {
  const outlet = useOutlet()
  const { pathname } = useLocation()
  useEffect(() => { window.scrollTo({ top: 0 }) }, [pathname])
  return (
    <div className={s.app}>
      <Rail />
      <main className={s.main} id="main">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={pathname}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0, transition: { duration: 0.32, ease: [0.22, 1, 0.36, 1] } }}
            exit={{ opacity: 0, x: -18, transition: { duration: 0.14 } }}
          >
            {outlet}
          </motion.div>
        </AnimatePresence>
      </main>
      <BottomBar />
    </div>
  )
}
