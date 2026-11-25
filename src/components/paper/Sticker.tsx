import s from './paper.module.css'

/** Jagged 8-point star sticker: red fill, hand-drawn blue outline, white die-cut border. */
const outer = [1, .78, 1.08, .74, 1, .8, 1.1, .76]
function starPoints(cx: number, cy: number, r: number, k = 1): string {
  const pts: string[] = []
  for (let i = 0; i < 16; i++) {
    const long = i % 2 === 0
    const rad = long ? r * outer[(i / 2) % 8] : r * 0.38 * k
    const a = (Math.PI * 2 * i) / 16 - Math.PI / 2 + (long ? 0 : 0.02)
    pts.push(`${(cx + rad * Math.cos(a)).toFixed(1)},${(cy + rad * Math.sin(a)).toFixed(1)}`)
  }
  return pts.join(' ')
}

export function Sticker({ size = 88, rotate = 12, title }: { size?: number; rotate?: number; title?: string }) {
  return (
    <svg className={s.sticker} width={size} height={size} viewBox="0 0 100 100" style={{ transform: `rotate(${rotate}deg)` }} role={title ? 'img' : undefined} aria-hidden={title ? undefined : true} aria-label={title}>
      <polygon points={starPoints(50, 50, 47, 1.2)} fill="#fff" stroke="#fff" strokeWidth="6" strokeLinejoin="round" />
      <polygon points={starPoints(50, 50, 45, 1.2)} fill="none" stroke="#3e599d" strokeWidth="1.8" strokeLinejoin="round" />
      <polygon points={starPoints(51, 50, 33, 1.5)} fill="#e42321" stroke="#e42321" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  )
}
