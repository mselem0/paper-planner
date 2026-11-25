import { forwardRef, type KeyboardEvent } from 'react'
import s from './paper.module.css'

export interface LineInputProps {
  value: string
  onChange: (v: string) => void
  /** Enter pressed (caret anywhere) */
  onEnter?: () => void
  /** Backspace pressed while the line is already empty */
  onBackspaceEmpty?: () => void
  onArrow?: (dir: 'up' | 'down') => void
  placeholder?: string
  ariaLabel: string
  bullet?: boolean
  inputMode?: 'text' | 'decimal' | 'numeric'
  className?: string
  maxLength?: number
}

/** A single-line text input that sits on a ruled line - no box, just ink on paper. */
export const LineInput = forwardRef<HTMLInputElement, LineInputProps>(function LineInput(
  { value, onChange, onEnter, onBackspaceEmpty, onArrow, placeholder, ariaLabel, bullet, inputMode, className = '', maxLength },
  ref,
) {
  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.nativeEvent.isComposing) return
    if (e.key === 'Enter' && onEnter) { e.preventDefault(); onEnter() }
    else if (e.key === 'Backspace' && value === '' && onBackspaceEmpty) { e.preventDefault(); onBackspaceEmpty() }
    else if (e.key === 'ArrowUp' && onArrow) { e.preventDefault(); onArrow('up') }
    else if (e.key === 'ArrowDown' && onArrow) { e.preventDefault(); onArrow('down') }
  }
  return (
    <div className={s.lineRow}>
      {bullet && <span className={s.bullet} aria-hidden />}
      <input
        ref={ref}
        className={`${s.lineInput} ${className}`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        aria-label={ariaLabel}
        inputMode={inputMode}
        maxLength={maxLength}
        spellCheck
        autoComplete="off"
        enterKeyHint="next"
      />
    </div>
  )
})
