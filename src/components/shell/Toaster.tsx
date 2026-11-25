import { AnimatePresence, motion } from 'framer-motion'
import { useToasts } from '../../store/toast'
import s from './shell.module.css'

export function Toaster() {
  const { toasts, dismiss } = useToasts()
  return (
    <div className={s.toasts} role="status" aria-live="polite">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div key={t.id} className={`${s.toast} ${t.kind === 'error' ? s.error : t.kind === 'success' ? s.success : ''}`}
            initial={{ opacity: 0, y: 20, scale: .96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10 }} layout>
            <span>{t.message}</span>
            <button className={s.toastX} onClick={() => dismiss(t.id)} aria-label="Dismiss">×</button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
