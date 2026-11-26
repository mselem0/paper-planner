import { useCallback, useRef, useState } from 'react'
import { WavyStripes } from '../../components/paper'
import { BuyDialog } from './BuyDialog'
import { FlipBook } from './FlipBook'
import { ILLUSTRATIVE_LABEL, PAGES, PAGES_ARE_ILLUSTRATIVE } from './config'
import { WhatsAppIcon } from './icons'
import s from './shop.module.css'
import ScanStory from './ScanStory'

export function PlannerPreview({ standalone = false, dialogMode = false, onLater }: { standalone?: boolean; dialogMode?: boolean; onLater?: () => void }) {
  const [index, setIndex] = useState(0)
  const [open, setOpen] = useState(false)
  const [storyOpen, setStoryOpen] = useState(false)
  const buyRef = useRef<HTMLButtonElement>(null)
  const close = useCallback(() => setOpen(false), [])
  return (
    <main className={`${s.shop} ${dialogMode ? s.dialogPreview : ''}`} dir="rtl" lang="ar">
      {standalone && <WavyStripes />}
      <div className={s.content}>
        <div className={s.previewModes} role="group" aria-label="محتوى المعاينة">
          <button className={s.storyToggle} type="button" aria-pressed={!storyOpen} onClick={() => setStoryOpen(false)}>تصفح البلانر</button>
          <button className={s.storyToggle} type="button" aria-pressed={storyOpen} onClick={() => setStoryOpen(true)}>من الورق للتطبيق</button>
        </div>
        <div className={s.bookView} hidden={storyOpen}><FlipBook pages={PAGES} onIndexChange={setIndex} keysDisabled={open || storyOpen} /></div>
        <div className={s.storyView} hidden={!storyOpen}><ScanStory paused={open || !storyOpen} /></div>
        {PAGES_ARE_ILLUSTRATIVE && <p className={s.illus} data-testid="illustrative-label">{ILLUSTRATIVE_LABEL}</p>}
        {standalone && <footer className={s.credits} dir="ltr" lang="en"><span>Designed by : Rodaina</span><span>Developed by Mohamed selem</span></footer>}
      </div>
      <div className={s.bar}>
        {onLater && <button type="button" className={s.later} data-testid="preview-later" onClick={onLater}>لاحقًا</button>}
        <button ref={buyRef} type="button" className={s.buy} onClick={() => setOpen(true)}><WhatsAppIcon /><span>اطلب البلانر</span></button>
      </div>
      {open && <BuyDialog page={PAGES[index]} onClose={close} returnFocusRef={buyRef} />}
    </main>
  )
}
