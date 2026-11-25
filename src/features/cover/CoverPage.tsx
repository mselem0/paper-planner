import confetti from 'canvas-confetti'
import { motion } from 'framer-motion'
import { useId, useRef, type KeyboardEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Sticker, WavyStripes } from '../../components/paper'
import { useStore } from '../../store'
import s from './cover.module.css'

export function CoverPage() {
  const name = useStore((st) => st.profile.name)
  const setName = useStore((st) => st.setName)
  const navigate = useNavigate()
  const id = useId()
  const star = useRef<HTMLButtonElement>(null)
  const trimmed = name.trim()

  const open = () => navigate('/today')
  const onKey = (e: KeyboardEvent<HTMLInputElement>) => { if (e.key === 'Enter') open() }
  const pop = () => {
    const r = star.current?.getBoundingClientRect()
    if (!r || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    void confetti({
      particleCount: 38, spread: 70, startVelocity: 28, scalar: .8, ticks: 120,
      origin: { x: (r.left + r.width / 2) / window.innerWidth, y: (r.top + r.height / 2) / window.innerHeight },
      colors: ['#c0262d', '#5b78bd', '#f6efab', '#f6bdb6', '#dbead5'],
    })
  }

  return (
    <main className={s.cover}>
      <WavyStripes />
      <motion.div className={s.stage} initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .6, ease: [.22, 1, .36, 1] }}>
        <div className={s.eyebrow}>Rodaina Planner &middot; 2027</div>
        <div className={s.label}>
          <label htmlFor={id} className={s.hello}>Hello, my name is :</label>
          <input
            id={id} className={s.name} value={name} onChange={(e) => setName(e.target.value)} onKeyDown={onKey}
            placeholder="write your name" maxLength={40} autoComplete="given-name" enterKeyHint="go"
          />
          <motion.button
            ref={star} type="button" className={s.starWrap} aria-label="Pop the star sticker" onClick={pop}
            whileHover={{ rotate: 18, scale: 1.12 }} whileTap={{ scale: .9, rotate: -12 }} transition={{ type: 'spring', stiffness: 400, damping: 12 }}
          >
            <Sticker size={96} rotate={10} />
          </motion.button>
        </div>
        {trimmed ? (
          <>
            <div className={s.greeting}>Welcome back, {trimmed}!</div>
            <p className={s.sub}>Your planner is waiting right where you left it.</p>
          </>
        ) : (
          <p className={s.sub}>Write your name on the label to make this planner yours.</p>
        )}
        <button type="button" className={s.open} onClick={open}>Open my planner</button>
        <span className={s.hint}>Saved on this device only</span>
      </motion.div>
    </main>
  )
}
