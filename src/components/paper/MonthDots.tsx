import type { CSSProperties } from 'react'
import { MONTH_NUMBERS, type Month } from '../../lib/dates'
import { monthInfo } from '../../lib/months'
import s from './paper.module.css'

/** 12 circles; the current month is filled with its accent colour. Pass onSelect to make them tappable. */
export function MonthDots({ current, accent, onSelect }: { current: Month; accent?: string; onSelect?: (m: Month) => void }) {
  const on = accent ?? monthInfo(current).accent
  return (
    <div className={s.dots} role="img" aria-label={`Month ${current} of 12`}>
      {MONTH_NUMBERS.map((m) => {
        const cls = `${s.dot} ${m === current ? s.dotOn : ''}`
        const style = { '--on': on, borderColor: m === current ? on : undefined } as CSSProperties
        return onSelect ? (
          <button key={m} type="button" className={cls} style={style} onClick={() => onSelect(m)} aria-label={monthInfo(m).name} />
        ) : (
          <span key={m} className={cls} style={style} />
        )
      })}
    </div>
  )
}
