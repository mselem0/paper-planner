import { Link, useLocation, useNavigate } from 'react-router-dom'
import { PlannerPreview } from './PlannerPreview'
import s from './shop.module.css'

/** `#/shop` remains an independent route using the same preview and order components as the global modal. */
export function ShopPage() {
  const navigate = useNavigate()
  const { key } = useLocation()
  const back = () => { if (key !== 'default') navigate(-1); else navigate('/today') }
  return <div className={s.route}>
    <header className={s.top}>
      {key !== 'default' ? <button type="button" className={s.backLink} onClick={back}>رجوع</button> : <Link className={s.backLink} to="/today">فتح البلانر</Link>}
      <h1 className={s.h1} dir="ltr" lang="en">2027 <em>Planner</em></h1><span className={s.topSpacer} aria-hidden />
    </header>
    <PlannerPreview standalone />
  </div>
}
