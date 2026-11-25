import { useState } from 'react'
import { backupDue, daysSince, readBackupMeta } from '../../lib/backup'
import { useStore } from '../../store'
import s from './today.module.css'

/** Gentle reminder: data lives only in this browser, so nudge toward a backup after BACKUP_REMIND_DAYS. */
export function BackupNudge() {
  const download = useStore((st) => st.downloadExport)
  const [meta, setMeta] = useState(() => readBackupMeta())
  if (!backupDue(meta)) return null
  const last = meta.lastBackupAt
  return (
    <section className={`${s.card} ${s.nudge}`} role="status" aria-label="Backup reminder">
      <p>
        <b>Time for a backup.</b> Your planner is saved only on this phone or computer.{' '}
        {last ? `Last backup file was created ${daysSince(last)} days ago.` : 'You have not created a backup file yet.'}
      </p>
      <button type="button" className={s.nudgeBtn} onClick={() => { download(); setMeta(readBackupMeta()) }}>Create a backup file</button>
    </section>
  )
}
