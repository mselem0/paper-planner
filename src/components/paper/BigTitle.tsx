import type { CSSProperties, ReactNode } from 'react'
import s from './paper.module.css'

export function BigTitle({ children, color, size, as: Tag = 'h1', className = '' }: {
  children: ReactNode; color?: string; size?: string; as?: 'h1' | 'h2' | 'div'; className?: string
}) {
  return <Tag className={`${s.bigTitle} ${className}`} style={{ '--color': color, '--size': size } as CSSProperties}>{children}</Tag>
}
