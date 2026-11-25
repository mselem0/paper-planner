import { useLayoutEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AgendaLogo, PaperPage } from '../../components/paper'
import { useStore } from '../../store'
import s from './notes.module.css'

export function NoteEditor({ id }: { id: string }) {
  const note = useStore((st) => st.notes.find((n) => n.id === id))
  const update = useStore((st) => st.updateNote)
  const del = useStore((st) => st.deleteNote)
  const nav = useNavigate()
  const ta = useRef<HTMLTextAreaElement>(null)
  const body = note?.body ?? ''
  useLayoutEffect(() => {
    const el = ta.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.max(el.scrollHeight, 34 * 18)}px`
  }, [body])

  if (!note) {
    return (
      <PaperPage label="Note not found">
        <div className={s.empty}>
          <p className={s.hint}>This page was torn out of the notebook.</p>
          <Link to="/notes" className={s.new}>Back to notes</Link>
        </div>
      </PaperPage>
    )
  }
  return (
    <PaperPage label="Note">
      <div className={s.top}>
        <Link to="/notes" className={s.back}>&larr; All pages</Link>
        <AgendaLogo />
      </div>
      <input
        className={s.titleInput} value={note.title} placeholder="Title..." aria-label="Note title"
        onChange={(e) => update(id, { title: e.target.value })}
      />
      <textarea
        ref={ta} className={s.body} value={note.body} aria-label="Note body" placeholder="Start writing..."
        onChange={(e) => update(id, { body: e.target.value })}
      />
      <div className={s.actions}>
        <span className={s.saved}>Saved automatically</span>
        <button
          type="button" className={s.del}
          onClick={() => { if (window.confirm('Delete this page? This cannot be undone.')) { del(id); nav('/notes', { replace: true }) } }}
        >Delete page</button>
      </div>
    </PaperPage>
  )
}
