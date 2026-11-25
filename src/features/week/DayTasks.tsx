import { AnimatePresence, motion } from 'framer-motion'
import { useLayoutEffect, useRef } from 'react'
import { allWeeks, type DayIndex, type ISODate } from '../../lib/dates'
import { uid } from '../../lib/id'
import { AutoTextarea } from '../../components/paper'
import { useStore } from '../../store'
import type { Task, TaskStatus } from '../../store/types'
import s from './week.module.css'

const EMPTY: Task[] = []
export const STATUS_LABEL: Record<Exclude<TaskStatus, null>, string> = { ok: 'OK', delay: 'Delay', stuck: 'Stuck', cancel: 'Cancel' }

/** Screen-reader label for a status button: current state plus what a tap does next. */
export function statusAriaLabel(status: TaskStatus): string {
  const now = status ? STATUS_LABEL[status] : 'none'
  const next = status === null ? 'Tap to mark OK' : status === 'ok' ? 'Tap for Delay' : status === 'delay' ? 'Tap for Stuck' : status === 'stuck' ? 'Tap for Cancel' : 'Tap to clear'
  return `Task status: ${now}. ${next}`
}

export function StatusGlyph({ status }: { status: TaskStatus }) {
  const p = { width: 20, height: 20, viewBox: '0 0 20 20', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
  if (status === 'ok') return <svg {...p}><circle cx="10" cy="10" r="8" /><motion.path d="M6 10.5l3 3 5-6" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.28 }} /></svg>
  if (status === 'delay') return <svg {...p}><path d="M4 10h11M11 5l5 5-5 5" /></svg>
  if (status === 'stuck') return <svg {...p}><path d="M13 3L7 17" /></svg>
  if (status === 'cancel') return <svg {...p}><path d="M5 5l10 10M15 5L5 15" /></svg>
  return <svg {...p} strokeWidth={1.8}><circle cx="10" cy="10" r="8" /></svg>
}

interface Props { week: ISODate; day: DayIndex; minRows?: number; label: string }

/** Task lines for one day: bullet, text on a ruled line, status cell. Grows with Enter. */
export function DayTasks({ week, day, minRows = 5, label }: Props) {
  const tasks = useStore((st) => st.weeks[week]?.days[day]) ?? EMPTY
  const setDayTasks = useStore((st) => st.setDayTasks)
  const cycle = useStore((st) => st.cycleTaskStatus)
  const move = useStore((st) => st.moveTaskToTomorrow)
  const refs = useRef<(HTMLTextAreaElement | null)[]>([])
  const pending = useRef<number | null>(null)
  const count = Math.max(tasks.length, minRows)
  const weeks = allWeeks()
  const canMove = !(day === 6 && week === weeks[weeks.length - 1])

  useLayoutEffect(() => {
    if (pending.current === null) return
    const el = refs.current[pending.current]
    pending.current = null
    el?.focus()
  })

  const blank = (): Task => ({ id: uid(), text: '', status: null })
  const padTo = (n: number): Task[] => {
    const next = tasks.slice()
    while (next.length < n) next.push(blank())
    return next
  }
  const setText = (i: number, text: string) => {
    const next = padTo(i + 1)
    next[i] = { ...next[i], text }
    setDayTasks(week, day, next)
  }
  const enter = (i: number) => {
    const next = padTo(count)
    next.splice(i + 1, 0, blank())
    pending.current = i + 1
    setDayTasks(week, day, next)
  }
  const back = (i: number) => {
    if (i === 0) return
    const next = padTo(count)
    if (next[i].status) return
    next.splice(i, 1)
    pending.current = i - 1
    setDayTasks(week, day, next)
  }

  return (
    <div className={s.tasks} role="group" aria-label={label}>
      {Array.from({ length: count }, (_, i) => {
        const t = tasks[i]
        const status = t?.status ?? null
        const empty = !t || t.text.trim() === ''
        return (
          <div key={i} className={`${s.task} ${status === 'cancel' ? s.cancelled : ''} ${status === 'ok' ? s.done : ''}`}>
            <span className={s.dot} aria-hidden />
            <AutoTextarea
              ref={(el) => { refs.current[i] = el }}
              className={s.taskInput}
              value={t?.text ?? ''}
              onChange={(v) => setText(i, v)}
              onKeyDown={(e) => {
                if (e.nativeEvent.isComposing) return
                if (e.key === 'Enter') { e.preventDefault(); enter(i) }
                else if (e.key === 'Backspace' && (t?.text ?? '') === '') { e.preventDefault(); back(i) }
                else if (e.key === 'ArrowUp' && e.currentTarget.selectionStart === 0 && e.currentTarget.selectionEnd === 0) { e.preventDefault(); refs.current[i - 1]?.focus() }
                else if (e.key === 'ArrowDown' && e.currentTarget.selectionStart === e.currentTarget.value.length) { e.preventDefault(); refs.current[i + 1]?.focus() }
              }}
              aria-label={`${label}, line ${i + 1}`}
              autoComplete="off"
              enterKeyHint="next"
            />
            <AnimatePresence>
              {t && status === 'delay' && t.text.trim() && canMove && (
                <motion.button
                  type="button" className={s.moveBtn}
                  initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
                  onClick={() => move(week, day, t.id)}
                  title="Move to tomorrow" aria-label={`Move "${t.text}" to tomorrow`}
                >
                  tomorrow &rarr;
                </motion.button>
              )}
            </AnimatePresence>
            <button
              type="button" className={`${s.status} ${status ? s[`st_${status}`] : ''} ${empty ? s.statusEmpty : ''}`}
              onClick={() => { if (t && !empty) cycle(week, day, t.id); else refs.current[i]?.focus() }}
              title={empty ? 'Write a task first' : undefined}
              aria-label={empty ? 'Task status: write a task first' : statusAriaLabel(status)}
            >
              <motion.span key={status ?? 'none'} initial={{ scale: 0.4, rotate: -20 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 520, damping: 14 }} className={s.glyph}>
                <StatusGlyph status={status} />
              </motion.span>
            </button>
          </div>
        )
      })}
    </div>
  )
}

/** Plain, non-interactive explanation of the task status circles. */
export function StatusLegend() {
  return (
    <div className={s.legendBox} aria-label="Task status legend" role="group">
      <h3 className={s.legendTitle}>Task status</h3>
      <p className={s.legendHint}>Write a task, then tap its circle to change status. Tap again to cycle; after Cancel it clears.</p>
      <div className={s.legend}>
        {(['ok', 'delay', 'stuck', 'cancel'] as const).map((k) => (
          <span key={k}><span className={s.legendIcon}><StatusGlyph status={k} /></span>{k === 'ok' ? 'OK' : k.toUpperCase()}</span>
        ))}
      </div>
    </div>
  )
}
