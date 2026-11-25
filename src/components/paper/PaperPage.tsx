import type { CSSProperties, ReactNode } from 'react'
import s from './paper.module.css'

interface Props {
  children: ReactNode
  /** page background colour (defaults to paper) */
  tint?: string
  /** accent colour exposed as --accent to children */
  accent?: string
  wide?: boolean
  binding?: boolean
  className?: string
  label?: string
}

export function PaperPage({ children, tint, accent, wide, binding = true, className = '', label }: Props) {
  const style = { '--page-bg': tint, '--accent': accent } as CSSProperties
  return (
    <section className={`${s.page} ${wide ? s.wide : ''} ${className}`} style={style} aria-label={label}>
      {binding && <span className={s.binding} aria-hidden />}
      {children}
    </section>
  )
}
