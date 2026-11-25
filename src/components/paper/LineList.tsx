import { useLayoutEffect, useRef, type CSSProperties } from 'react'
import { LineInput } from './LineInput'
import s from './paper.module.css'

interface Props {
  values: string[]
  onChange: (next: string[]) => void
  /** lines always shown (extra empty lines are virtual until typed into) */
  minLines?: number
  ariaLabel: string
  bullet?: boolean
  placeholder?: string
  lineHeight?: number
  maxLines?: number
}

/**
 * Editable array of strings, one per ruled line.
 * Enter -> new line below (focused). Backspace on an empty line -> remove it, focus the previous line.
 */
export function LineList({ values, onChange, minLines = 5, ariaLabel, bullet, placeholder, lineHeight = 34, maxLines = 200 }: Props) {
  const refs = useRef<(HTMLInputElement | null)[]>([])
  const pendingFocus = useRef<{ index: number; end: boolean } | null>(null)
  const count = Math.max(values.length, minLines)

  useLayoutEffect(() => {
    const p = pendingFocus.current
    if (!p) return
    pendingFocus.current = null
    const el = refs.current[p.index]
    if (el) {
      el.focus()
      if (p.end) el.setSelectionRange(el.value.length, el.value.length)
    }
  })

  const padded = (): string[] => Array.from({ length: count }, (_, i) => values[i] ?? '')

  const setAt = (i: number, v: string) => {
    const next = values.slice()
    while (next.length <= i) next.push('')
    next[i] = v
    onChange(next)
  }
  const insertAfter = (i: number) => {
    if (count >= maxLines) return
    const next = padded()
    next.splice(i + 1, 0, '')
    pendingFocus.current = { index: i + 1, end: false }
    onChange(next)
  }
  const removeAt = (i: number) => {
    if (i === 0) return
    const next = padded()
    next.splice(i, 1)
    pendingFocus.current = { index: i - 1, end: true }
    onChange(next)
  }
  const move = (i: number, dir: 'up' | 'down') => {
    const j = dir === 'up' ? i - 1 : i + 1
    refs.current[j]?.focus()
  }

  return (
    <div className={s.list} style={{ '--lh': `${lineHeight}px` } as CSSProperties} role="group" aria-label={ariaLabel}>
      {Array.from({ length: count }, (_, i) => (
        <LineInput
          key={i}
          ref={(el) => { refs.current[i] = el }}
          value={values[i] ?? ''}
          onChange={(v) => setAt(i, v)}
          onEnter={() => insertAfter(i)}
          onBackspaceEmpty={() => removeAt(i)}
          onArrow={(d) => move(i, d)}
          ariaLabel={`${ariaLabel}, line ${i + 1}`}
          bullet={bullet}
          placeholder={i === 0 ? placeholder : undefined}
        />
      ))}
    </div>
  )
}
