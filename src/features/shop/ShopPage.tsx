import { useCallback, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { WavyStripes } from '../../components/paper'
import { BuyDialog } from './BuyDialog'
import { FlipBook } from './FlipBook'
import { ILLUSTRATIVE_LABEL, PAGES, PAGES_ARE_ILLUSTRATIVE } from './config'
import { WhatsAppIcon } from './icons'
import s from './shop.module.css'

/** `#/shop` - flip-through preview of the paper planner with an order button that continues on WhatsApp. */
export function ShopPage() {
  const [index, setIndex] = useState(0)
  const [open, setOpen] = useState(false)
  const buyRef = useRef<HTMLButtonElement>(null)
  const navigate = useNavigate()
  const { key } = useLocation()
  const close = useCallback(() => setOpen(false), [])
  const back = () => { if (key !== 'default') navigate(-1); else navigate('/today') }

  return (
    <main className={s.shop} dir="rtl" lang="ar">
      <WavyStripes />
      <div className={s.content}>
        <header className={s.top}>
          {key !== 'default'
            ? <button type="button" className={s.backLink} onClick={back}>رجوع</button>
            : <Link className={s.backLink} to="/today">فتح البلانر</Link>}
          <h1 className={s.h1} dir="ltr" lang="en">2027 <em>Planner</em></h1>
          <span className={s.topSpacer} aria-hidden />
        </header>

        <FlipBook pages={PAGES} onIndexChange={setIndex} keysDisabled={open}>
          {PAGES_ARE_ILLUSTRATIVE && <p className={s.illus} data-testid="illustrative-label">{ILLUSTRATIVE_LABEL}</p>}
        </FlipBook>

        <footer className={s.credits} dir="ltr" lang="en">
          <span>Designed by : Rodaina</span>
          <span>Developed by Mohamed selem</span>
        </footer>
      </div>

      <div className={s.bar}>
        <button ref={buyRef} type="button" className={s.buy} onClick={() => setOpen(true)}>
          <WhatsAppIcon /><span>اطلب البلانر</span>
        </button>
      </div>

      {open && <BuyDialog page={PAGES[index]} onClose={close} returnFocusRef={buyRef} />}
    </main>
  )
}
