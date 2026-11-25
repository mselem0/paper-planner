import type { CSSProperties, ReactNode } from 'react'
import s from './paper.module.css'

/** A block of horizontal rules (purely decorative background); children sit on the lines. */
export function RuledLines({ lines = 6, lineHeight = 34, children, className = '' }: {
  lines?: number; lineHeight?: number; children?: ReactNode; className?: string
}) {
  return (
    <div className={`${s.ruled} ${className}`} style={{ '--lh': `${lineHeight}px`, '--lines': lines } as CSSProperties}>
      {children}
    </div>
  )
}
