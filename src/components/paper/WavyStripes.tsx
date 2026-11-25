import { useMemo } from 'react'
import s from './paper.module.css'

const COLORS = ['#f5eb9a', '#f6c9bd', '#dfe7b9', '#f8e8a0', '#d9e3f1', '#f3d1c4', '#e6ecc4']

function rng(seed: number) {
  let t = seed
  return () => { t = (t + 0x6d2b79f5) | 0; let r = Math.imul(t ^ (t >>> 15), 1 | t); r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r; return ((r ^ (r >>> 14)) >>> 0) / 4294967296 }
}

/** Pastel hand-drawn wavy vertical stripes (cover background). Deterministic, pure SVG. */
export function WavyStripes({ opacity = 1, count = 22 }: { opacity?: number; count?: number }) {
  const paths = useMemo(() => {
    const r = rng(2027)
    return Array.from({ length: count }, (_, i) => {
      const x = ((i + 0.5 + (r() - 0.5) * 0.6) / count) * 1000
      const amp = 1.5 + r() * 3.5, freq = 0.012 + r() * 0.02, ph = r() * 6.28
      let d = ''
      for (let y = -10; y <= 1010; y += 20) {
        const xx = x + amp * Math.sin(y * freq + ph) + (r() - 0.5) * 0.8
        d += `${d ? ' L' : 'M'} ${xx.toFixed(1)} ${y}`
      }
      return { d, c: COLORS[Math.floor(r() * COLORS.length)], w: 2.5 + r() * 3, o: 0.3 + r() * 0.4 }
    })
  }, [count])
  return (
    <svg className={s.stripes} viewBox="0 0 1000 1000" preserveAspectRatio="none" style={{ opacity }} aria-hidden>
      {paths.map((p, i) => <path key={i} d={p.d} stroke={p.c} strokeWidth={p.w} strokeOpacity={p.o} strokeLinejoin="round" />)}
    </svg>
  )
}
