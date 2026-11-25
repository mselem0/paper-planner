import { useNavigate, Link } from 'react-router-dom'
import { AgendaLogo, PaperPage, ScriptTitle } from '../../components/paper'
import { useStore } from '../../store'
import s from './notes.module.css'

const fmt = (t: number) => new Date(t).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })

export function NotesPage() {
  const notes = useStore((st) => st.notes)
  const add = useStore((st) => st.addNote)
  const nav = useNavigate()
  const sorted = [...notes].sort((a, b) => b.updatedAt - a.updatedAt)
  const create = () => nav(`/notes/${add()}`)
  return (
    <PaperPage label="Notes">
      <div className={s.top}><AgendaLogo /></div>
      <h1 className={s.h1}>Notes</h1>
      <div className={s.bar}>
        <ScriptTitle size="28px" rotate={-3}>my notebook</ScriptTitle>
        <button type="button" className={s.new} onClick={create}>+ New page</button>
      </div>
      {sorted.length === 0 ? (
        <div className={s.empty}>
          <span className={s.emptyStar} aria-hidden>&#9733;</span>
          <p className={s.hint}>No pages yet... a blank notebook is full of ideas!</p>
          <button type="button" className={s.new} onClick={create}>Write the first page</button>
        </div>
      ) : (
        <ul className={s.grid}>
          {sorted.map((n) => (
            <li key={n.id}>
              <Link to={`/notes/${n.id}`} className={s.card}>
                <strong className={s.cardTitle}>{n.title || 'Untitled page'}</strong>
                <span className={s.snip}>{n.body.trim().slice(0, 110) || 'Empty page'}</span>
                <span className={s.date}>{fmt(n.updatedAt)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </PaperPage>
  )
}
