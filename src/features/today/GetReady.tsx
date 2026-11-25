import { useState } from 'react'
import { Link } from 'react-router-dom'
import { readBackupMeta } from '../../lib/backup'
import { budgetTotals } from '../../lib/budget'
import { useStore } from '../../store'
import s from './today.module.css'

/** First-run checklist: shows until the basics are filled in, each item links to where it is done. */
export function GetReady() {
  const [open, setOpen] = useState(false)
  const name = useStore((st) => st.profile.name)
  const goals = useStore((st) => st.quarters[1]?.goals)
  const weeks = useStore((st) => st.weeks)
  const jan = useStore((st) => st.budgets[1])
  const habitNamed = Object.values(weeks).some((w) => w.habits.some((h) => h.name.trim()))
  const items = [
    { done: name.trim() !== '', label: 'Write your name', to: '/' },
    { done: !!goals?.some((g) => g.trim()), label: 'Set a goal for the first quarter', to: '/q/1' },
    { done: habitNamed, label: 'Name a habit to track', to: null },
    { done: !!jan && (budgetTotals(jan).income > 0 || budgetTotals(jan).expenses > 0), label: 'Fill in January budget', to: '/m/1/budget' },
    { done: readBackupMeta().lastBackupAt !== null, label: 'Save your first backup', to: '/settings' },
  ]
  if (items.every((i) => i.done)) return null
  const doneCount = items.filter((i) => i.done).length
  return (
    <section className={`${s.card} ${s.ready}`} aria-label="Get ready checklist">
      <button type="button" className={s.readyToggle} aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        <span className={s.h2}>Get ready</span>
        <span>{doneCount} of {items.length} done {open ? '▴' : '▾'}</span>
      </button>
      {open && (
        <ul>
          {items.map((i) => (
            <li key={i.label} className={i.done ? s.readyDone : undefined}>
              <span aria-hidden>{i.done ? '✓' : '○'}</span>
              {i.done || !i.to ? <span>{i.label}{i.done ? ' (done)' : ' (below, under Habits)'}</span> : <Link to={i.to}>{i.label}</Link>}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
