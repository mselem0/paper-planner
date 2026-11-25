import s from './paper.module.css'

/** Small "2027 AGENDA" logo (blue 2027, red script AGENDA) used on lined notes pages. */
export function AgendaLogo() {
  return (
    <span className={s.logo} aria-label="2027 Agenda">
      <span className={s.logoYear}>2027</span>
      <span className={s.logoWord}>AGENDA</span>
    </span>
  )
}
