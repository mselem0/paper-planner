import type { CSSProperties, ReactNode } from 'react'
import s from './paper.module.css'

/** Red hand-written title (the "AGENDA" / "Planner" look). */
export function ScriptTitle({ children, size, rotate = -4, className = '', style }: {
  children: ReactNode; size?: string; rotate?: number; className?: string; style?: CSSProperties
}) {
  return <span className={`${s.script} ${className}`} style={{ '--size': size, '--rot': `${rotate}deg`, ...style } as CSSProperties}>{children}</span>
}
