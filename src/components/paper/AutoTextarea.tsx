import { forwardRef, useCallback, useEffect, useImperativeHandle, useLayoutEffect, useRef, type TextareaHTMLAttributes } from 'react'

type Props = Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'rows' | 'dir' | 'onChange' | 'value'> & {
  value: string
  onChange: (v: string) => void
}

/**
 * A single-"line" text field that wraps and grows with its content (a textarea with rows=1).
 * Newlines are never inserted: Enter is left to the caller and pasted line breaks become spaces.
 */
export const AutoTextarea = forwardRef<HTMLTextAreaElement, Props>(function AutoTextarea({ value, onChange, ...rest }, ref) {
  const el = useRef<HTMLTextAreaElement>(null)
  useImperativeHandle(ref, () => el.current as HTMLTextAreaElement)

  const fit = useCallback(() => {
    const t = el.current
    if (!t) return
    t.style.height = 'auto'
    if (t.scrollHeight > 0) t.style.height = `${t.scrollHeight + (t.offsetHeight - t.clientHeight)}px`
  }, [])

  useLayoutEffect(fit, [fit, value])
  // Refit whenever the field's width changes (window resize, fonts loading, or a sibling such as the
  // "tomorrow" button appearing), otherwise wrapped text gets clipped at the old height.
  useEffect(() => {
    const t = el.current
    if (!t) return
    let lastWidth = t.clientWidth
    const onWidth = () => { if (t.clientWidth !== lastWidth) { lastWidth = t.clientWidth; fit() } }
    if (typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver(onWidth)
      ro.observe(t)
      return () => ro.disconnect()
    }
    window.addEventListener('resize', fit)
    return () => window.removeEventListener('resize', fit)
  }, [fit])
  useEffect(() => { void document.fonts?.ready.then(fit) }, [fit])

  return (
    <textarea
      {...rest}
      ref={el}
      rows={1}
      dir="auto"
      value={value}
      onChange={(e) => onChange(e.target.value.replace(/\r?\n/g, ' '))}
    />
  )
})
