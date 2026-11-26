import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useLocation } from 'react-router-dom'
import { useOverlayCoordinator } from '../../app/OverlayCoordinator'
import { PREVIEW_REPEAT_DAYS } from './config'
import { markPreviewSeen, readPreviewSeen, shouldAutoOpenPreview } from './previewState'
import s from './preview.module.css'

const PlannerPreview = lazy(() => import('./PlannerPreview').then((m) => ({ default: m.PlannerPreview })))
export function PreviewExperience() {
  const { pathname } = useLocation()
  const { previewPending, setPreviewPending, previewOpen, setPreviewOpen, installOpen, moreOpen } = useOverlayCoordinator()
  const [seen, setSeen] = useState(() => readPreviewSeen() > 0)
  const [show, setShow] = useState(false)
  const returnFocus = useRef<HTMLElement | null>(null)
  const seenAt = readPreviewSeen()

  useEffect(() => {
    if (pathname === '/shop') { markPreviewSeen(); setSeen(true); setPreviewPending(false); setShow(false); setPreviewOpen(false); return }
    if (!seen || shouldAutoOpenPreview(pathname, seenAt, Date.now(), PREVIEW_REPEAT_DAYS)) {
      setPreviewPending(true)
      if (installOpen) return
      const timer = window.setTimeout(() => {
        if (installOpen) return
        returnFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
        markPreviewSeen(); setSeen(true); setShow(true); setPreviewOpen(true); setPreviewPending(false)
      }, 1000)
      return () => { clearTimeout(timer) }
    }
  }, [pathname, installOpen])

  useEffect(() => { if (!show) return; const el = document.querySelector('#root') as HTMLElement | null; if (el) el.inert = true; return () => { if (el) el.inert = false } }, [show])
  const restoreAfterClose = useRef(false)
  const close = () => { restoreAfterClose.current = true; setShow(false); setPreviewOpen(false) }
  const open = () => { returnFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null; setShow(true); setPreviewOpen(true) }

  useEffect(() => {
    if (!show) return
    const onKey = (event: KeyboardEvent) => {
      if (document.querySelector('[data-buy-dialog]')) return
      if (event.key === 'Escape') { event.stopPropagation(); close(); return }
      if (event.key !== 'Tab') return
      const dialog = document.querySelector('[data-preview-dialog]') as HTMLElement | null
      if (!dialog) return
      const items = Array.from(dialog.querySelectorAll<HTMLElement>('button:not([disabled]),a[href],input:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])')).filter((el) => !el.closest('[hidden]') && !el.closest('[aria-hidden="true"]'))
      if (!items.length) { event.preventDefault(); dialog.focus(); return }
      const first = items[0], last = items[items.length - 1]
      if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog)) { event.preventDefault(); last.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [show])

  useEffect(() => {
    if (show) document.querySelector<HTMLElement>('[data-preview-dialog]')?.focus()
    else if (restoreAfterClose.current) {
      restoreAfterClose.current = false
      const target = returnFocus.current
      if (target?.isConnected) target.focus()
      else if (target?.dataset.testid === 'paper-planner-fab') document.querySelector<HTMLElement>('[data-testid="paper-planner-fab"]')?.focus()
    }
  }, [show])
  return <>
    {show && createPortal(<div className={s.backdrop} onMouseDown={(e) => { if (e.target === e.currentTarget) close() }}>
      <section className={s.dialog} role="dialog" aria-modal="true" aria-label="معاينة 2027 Planner" data-preview-dialog data-testid="planner-preview-dialog" tabIndex={-1} dir="rtl">
        <button className={s.close} type="button" aria-label="إغلاق" onClick={close}>×</button>
        <Suspense fallback={<div aria-busy="true" style={{ height: 300 }} />}><PlannerPreview dialogMode onLater={close} /></Suspense>
      </section>
    </div>, document.body)}
    {pathname !== '/shop' && !previewPending && !previewOpen && !installOpen && !moreOpen && <button className={s.fab} data-testid="paper-planner-fab" type="button" onClick={open}>اشتري Paper Planner</button>}
  </>
}
