import { useMemo } from 'react'
import { WEEKDAY_LETTERS, type ISODate } from '../../lib/dates'
import { celebrate } from '../../lib/confetti'
import { weekMonth } from '../../lib/dates'
import { wouldCompleteHabit } from '../../lib/week'
import { getWeek, resolveHabits, useStore } from '../../store'
import { AutoTextarea, BigTitle, Stamp } from '../../components/paper'
import s from './week.module.css'

export function HabitDot({ on, onClick, label, highlight }: { on: boolean; onClick: () => void; label: string; highlight?: boolean }) {
  return (
    <button type="button" className={`${s.hdot} ${on ? s.hdotOn : ''} ${highlight ? s.hdotNow : ''}`} onClick={onClick} aria-pressed={on} aria-label={label}>
      <span className={s.hdotInner} aria-hidden>
        {on && <svg viewBox="0 0 20 20" width="62%" height="62%" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M4.5 10.5l3.5 3.5 7.5-8" /></svg>}
      </span>
    </button>
  )
}

/** Toggle a habit day and celebrate when the row reaches 7/7. */
export function useHabitToggle(week: ISODate) {
  const toggle = useStore((st) => st.toggleHabit)
  return (index: number, day: number) => {
    const done = getWeek(useStore.getState(), week).habits[index]?.done ?? []
    if (wouldCompleteHabit(done, day)) celebrate(weekMonth(week))
    toggle(week, index, day)
  }
}

/** Habits for a week with names inherited from the latest earlier week that has names. */
export function useHabits(week: ISODate) {
  const weeks = useStore((st) => st.weeks)
  return useMemo(() => resolveHabits(weeks, week), [weeks, week])
}

export function HabitTracker({ week }: { week: ISODate }) {
  const habits = useHabits(week)
  const setName = useStore((st) => st.setHabitName)
  const toggle = useHabitToggle(week)

  return (
    <section className={s.habits} aria-label="Habit tracker">
      <div className={s.habitTitle}>
        <BigTitle as="h2" color="var(--accent)" size="clamp(40px, 7vw, 56px)">HABIT</BigTitle>
        <span className={s.stampPos}><Stamp rotate={12}>TRACKER</Stamp></span>
      </div>
      <div className={s.habitGrid}>
        <div className={s.habitHeadRow} aria-hidden>
          <span className={s.habitHeadGap} />
          {WEEKDAY_LETTERS.map((l, i) => <span key={i} className={s.habitHead}>{l}</span>)}
        </div>
        {habits.map((h, i) => (
          <HabitRow key={i}>
            <AutoTextarea
              className={s.habitName} value={h.name} onChange={(v) => setName(week, i, v)}
              onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault() }}
              aria-label={`Habit ${i + 1} name`} placeholder={`habit ${i + 1}`} autoComplete="off"
            />
            {h.done.map((on, d) => (
              <HabitDot key={d} on={on} onClick={() => toggle(i, d)} label={`${h.name || `Habit ${i + 1}`}, ${['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][d]}: ${on ? 'done' : 'not done'}`} />
            ))}
          </HabitRow>
        ))}
      </div>
    </section>
  )
}

function HabitRow({ children }: { children: React.ReactNode }) {
  return <div className={s.habitRow}>{children}</div>
}
