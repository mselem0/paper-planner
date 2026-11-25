import type { CSSProperties, ReactNode } from 'react'
import s from './paper.module.css'

export function Stamp({ children = 'TRACKER', rotate = 8 }: { children?: ReactNode; rotate?: number }) {
  return <span className={s.stamp} style={{ '--rot': `${rotate}deg` } as CSSProperties}>{children}</span>
}
