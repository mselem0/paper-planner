import { useEffect, useId, useRef, useState, type KeyboardEvent, type RefObject } from 'react'
import { ILLUSTRATIVE_LABEL, PAGES_ARE_ILLUSTRATIVE, THUMB_HEIGHT, THUMB_WIDTH, WHATSAPP_NUMBER, type ShopPageDef } from './config'
import { WhatsAppIcon } from './icons'
import { buildWhatsAppMessage } from './message'
import { useOnline } from './useOnline'
import s from './shop.module.css'

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

interface Props { page: ShopPageDef; onClose: () => void; returnFocusRef: RefObject<HTMLElement | null> }

/** Accessible bottom-sheet: focus is moved in, Tab is trapped, Esc / backdrop close it, focus returns to the Buy button. */
export function BuyDialog({ page, onClose, returnFocusRef }: Props) {
  const titleId = useId(), nameId = useId(), noteId = useId()
  const sheet = useRef<HTMLDivElement>(null)
  const [name, setName] = useState('')
  const [note, setNote] = useState('')
  const [notice, setNotice] = useState(false)
  const online = useOnline()
  const { url } = buildWhatsAppMessage({ name, note, pageLabel: page.label }, WHATSAPP_NUMBER)

  useEffect(() => {
    const back = returnFocusRef.current
    sheet.current?.focus()
    return () => { back?.focus() }
  }, [returnFocusRef])

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') { e.stopPropagation(); onClose(); return }
    if (e.key !== 'Tab' || !sheet.current) return
    const items = Array.from(sheet.current.querySelectorAll<HTMLElement>(FOCUSABLE))
    if (items.length === 0) return
    const first = items[0], last = items[items.length - 1], active = document.activeElement
    if (e.shiftKey && (active === first || active === sheet.current)) { e.preventDefault(); last.focus() }
    else if (!e.shiftKey && active === last) { e.preventDefault(); first.focus() }
  }

  return (
    <div className={s.backdrop} onClick={(e) => { if (e.target === e.currentTarget) onClose() }} onKeyDown={onKeyDown}>
      <div ref={sheet} className={s.sheet} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1}>
        <button type="button" className={s.close} onClick={onClose} aria-label="إغلاق">&times;</button>
        <div className={s.sheetHead}>
          <img className={s.mini} src={page.thumb} alt="" width={THUMB_WIDTH} height={THUMB_HEIGHT} decoding="async" />
          <div>
            <h2 id={titleId} className={s.sheetTitle} dir="ltr" lang="en">2027 <em>Planner</em></h2>
            <p className={s.sheetText}>ابعت طلبك على واتساب وهنكمّل معاك التفاصيل هناك.</p>
          </div>
        </div>

        <label className={s.fieldLabel} htmlFor={nameId}>الاسم (اختياري)</label>
        <input id={nameId} className={s.input} value={name} onChange={(e) => setName(e.target.value)} placeholder="اسمك" autoComplete="name" maxLength={60} />
        <label className={s.fieldLabel} htmlFor={noteId}>ملاحظة (اختياري)</label>
        <textarea id={noteId} className={s.input} rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="مثلًا: عدد النسخ أو اسم يتكتب على الغلاف" maxLength={300} />

        {!online ? (
          <button type="button" className={s.go} disabled>محتاج إنترنت</button>
        ) : url ? (
          <a className={s.go} href={url} target="_blank" rel="noopener noreferrer"><WhatsAppIcon />كمّل على واتساب</a>
        ) : (
          <button type="button" className={s.go} onClick={() => setNotice(true)}><WhatsAppIcon />كمّل على واتساب</button>
        )}
        {notice && !url && <p className={s.warn} role="alert">رقم واتساب لسه مش متحدد، فمش هنقدر نكمّل دلوقتي. جرّب تاني بعد شوية.</p>}

        {PAGES_ARE_ILLUSTRATIVE && <p className={`${s.sheetNote} ${s.sheetNoteWarn}`}>{ILLUSTRATIVE_LABEL}</p>}
        <p className={s.sheetNote}>السعر والشحن والتوفر بيتأكدوا في المحادثة</p>
      </div>
    </div>
  )
}
