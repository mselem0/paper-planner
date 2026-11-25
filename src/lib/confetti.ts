import confetti from 'canvas-confetti'
import { monthInfo } from './months'

/** Burst of confetti in the month's colours. Respects reduced-motion. */
export function celebrate(month: number, big = false): void {
  try {
    if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
    const m = monthInfo(month)
    const colors = [m.accent, m.accentInk, m.tileColor, '#5b78bd', '#c0262d']
    confetti({ particleCount: big ? 160 : 80, spread: big ? 100 : 70, startVelocity: 38, origin: { y: 0.7 }, colors, disableForReducedMotion: true })
  } catch { /* confetti is decoration only */ }
}
