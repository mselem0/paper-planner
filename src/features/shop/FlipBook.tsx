import { useCallback, useEffect, useLayoutEffect, useRef, useState, type PointerEvent as RPointerEvent, type ReactNode } from 'react'
import type { ShopPageDef } from './config'
import s from './shop.module.css'

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))
const ease = (k: number) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2)
const RINGS = 9

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(() => typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const on = () => setReduced(mq.matches)
    mq.addEventListener?.('change', on)
    return () => mq.removeEventListener?.('change', on)
  }, [])
  return reduced
}

interface Props {
  pages: readonly ShopPageDef[]
  onIndexChange?: (index: number) => void
  /** disable the global ArrowLeft/ArrowRight shortcuts (e.g. while a dialog is open) */
  keysDisabled?: boolean
  /** rendered between the page label and the controls (the persistent illustrative note) */
  children?: ReactNode
}

/**
 * Single-page "spiral notebook" preview. Leaf i shows pages[i] on its front; flipping it (rotateY around the left edge)
 * reveals leaf i+1. All 3D lives inside the .book element (own stacking context); with reduced motion we cross-fade instead.
 */
export function FlipBook({ pages, onIndexChange, keysDisabled, children }: Props) {
  const n = pages.length
  const reduced = usePrefersReducedMotion()
  const bookRef = useRef<HTMLDivElement>(null)
  const leafRefs = useRef<(HTMLDivElement | null)[]>([])
  const pos = useRef(0) // continuous 0..n-1 while animating
  const raf = useRef(0)
  const idxRef = useRef(0) // page we are heading to (animation may still be running)
  const drag = useRef<{ x: number; start: number; w: number; moved: number } | null>(null)
  const [index, setIndex] = useState(0)
  const [seen, setSeen] = useState(0) // furthest page reached: images are only requested up to seen+1

  const apply = useCallback(() => {
    const p0 = pos.current
    leafRefs.current.forEach((leaf, i) => {
      if (!leaf) return
      if (reduced) {
        const o = clamp(1 - Math.abs(p0 - i), 0, 1)
        leaf.style.setProperty('--p', '0')
        leaf.style.setProperty('--sh', '0')
        leaf.style.setProperty('--o', String(o))
        leaf.style.visibility = o === 0 ? 'hidden' : 'visible'
        leaf.style.zIndex = String(Math.round(p0) === i ? n + 1 : 1)
      } else {
        const p = clamp(p0 - i, 0, 1)
        leaf.style.setProperty('--p', String(p))
        leaf.style.setProperty('--sh', String(Math.sin(p * Math.PI)))
        leaf.style.setProperty('--o', String(1 - clamp((p - 0.82) / 0.18, 0, 1))) // fully flipped leaves fade away
        leaf.style.visibility = p >= 0.999 ? 'hidden' : 'visible'
        leaf.style.zIndex = String(p > 0.5 ? i : n - i)
      }
    })
  }, [reduced, n])

  useLayoutEffect(() => { apply() }, [apply])
  useEffect(() => () => cancelAnimationFrame(raf.current), [])

  const commit = useCallback((i: number) => {
    idxRef.current = i
    setIndex(i)
    setSeen((m) => Math.max(m, i))
  }, [])
  useEffect(() => { onIndexChange?.(index) }, [index, onIndexChange])

  const go = useCallback((target: number) => {
    const t = clamp(Math.round(target), 0, n - 1)
    cancelAnimationFrame(raf.current)
    commit(t)
    const from = pos.current, d = t - from
    if (Math.abs(d) < 0.001) { pos.current = t; apply(); return }
    const t0 = performance.now()
    const dur = reduced ? 260 : clamp(Math.abs(d) * 650, 450, 1100)
    const step = (now: number) => {
      const k = clamp((now - t0) / dur, 0, 1)
      pos.current = from + d * ease(k)
      apply()
      if (k < 1) raf.current = requestAnimationFrame(step)
    }
    raf.current = requestAnimationFrame(step)
  }, [n, commit, apply, reduced])

  const cur = () => idxRef.current
  const next = () => go(cur() + 1)
  const prev = () => go(cur() - 1)

  useEffect(() => {
    if (keysDisabled) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return
      if (e.altKey || e.ctrlKey || e.metaKey) return
      const t = e.target as HTMLElement | null
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return
      e.preventDefault()
      go(cur() + (e.key === 'ArrowRight' ? 1 : -1)) // the book itself is LTR: right = forward
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [keysDisabled, go, n])

  const onDown = (e: RPointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    cancelAnimationFrame(raf.current)
    drag.current = { x: e.clientX, start: pos.current, w: bookRef.current?.clientWidth || 300, moved: 0 }
    try { e.currentTarget.setPointerCapture?.(e.pointerId) } catch { /* not supported */ }
  }
  const onMove = (e: RPointerEvent<HTMLDivElement>) => {
    const d = drag.current
    if (!d) return
    const dx = e.clientX - d.x
    d.moved = Math.max(d.moved, Math.abs(dx))
    if (reduced) return // no follow-the-finger fade; decide on release
    pos.current = clamp(d.start - (dx / d.w) * 1.4, 0, n - 1)
    apply()
  }
  const onUp = (e: RPointerEvent<HTMLDivElement>) => {
    const d = drag.current
    if (!d) return
    drag.current = null
    const startIdx = Math.round(d.start)
    if (d.moved < 6) { go(startIdx + 1); return } // tap = next
    const dx = e.clientX - d.x
    const travelled = reduced ? -dx / d.w : pos.current - d.start
    go(travelled > 0.18 ? startIdx + 1 : travelled < -0.18 ? startIdx - 1 : startIdx)
  }
  const onCancel = () => {
    const d = drag.current
    if (!d) return
    drag.current = null
    go(Math.round(d.start))
  }

  return (
    <div className={s.bookArea}>
      <div
        ref={bookRef}
        className={`${s.book} ${reduced ? s.flat : ''}`}
        role="group"
        aria-roledescription="carousel"
        aria-label="معاينة صفحات البلانر"
        onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onCancel}
        dir="ltr"
      >
        <div className={s.spine} aria-hidden />
        {pages.map((pg, i) => (
          <div key={pg.key} ref={(el) => { leafRefs.current[i] = el }} className={s.leaf} aria-hidden={i !== index} data-page={pg.key}>
            <div className={`${s.face} ${s.front}`}>
              <img
                src={i <= seen + 1 ? pg.img : undefined} alt={pg.label} width={pg.width} height={pg.height}
                loading={i === 0 ? 'eager' : 'lazy'} decoding="async" draggable={false}
              />
              <div className={s.shade} />
            </div>
            <div className={`${s.face} ${s.back}`}>
              {i <= seen + 1 && <img src={pg.thumb} alt="" width={pg.width} height={pg.height} loading="lazy" decoding="async" draggable={false} />}
              <div className={s.shade} />
            </div>
          </div>
        ))}
        <div className={s.rings} aria-hidden>{Array.from({ length: RINGS }, (_, i) => <i key={i} />)}</div>
      </div>

      <div className={s.label} aria-live="polite" data-testid="page-label">{pages[index].label}</div>
      {children}
      <div className={s.nav}>
        <button type="button" className={s.navBtn} onClick={prev} disabled={index <= 0} aria-label="الصفحة السابقة">
          <svg viewBox="0 0 24 24" aria-hidden><path d="M15 5l-7 7 7 7" /></svg>
        </button>
        <div className={s.dots}>
          {pages.map((pg, i) => (
            <button key={pg.key} type="button" className={s.dotBtn} aria-label={pg.label} aria-current={i === index ? 'true' : undefined} onClick={() => go(i)}>
              <i className={i === index ? s.on : undefined} />
            </button>
          ))}
        </div>
        <button type="button" className={s.navBtn} onClick={next} disabled={index >= n - 1} aria-label="الصفحة التالية">
          <svg viewBox="0 0 24 24" aria-hidden><path d="M9 5l7 7-7 7" /></svg>
        </button>
      </div>
    </div>
  )
}
