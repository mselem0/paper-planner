/**
 * Backup bookkeeping. Kept in its own localStorage key so the planner data model and the
 * export JSON format stay exactly as they were (old backups keep importing, new ones stay readable).
 */
export const BACKUP_META_KEY = 'rodaina-planner:backup-meta'
export const BACKUP_REMIND_DAYS = 7
const DAY = 86400000

export interface BackupMeta { firstEditAt: number | null; lastBackupAt: number | null }

export function readBackupMeta(storage: Storage | null = safeStorage()): BackupMeta {
  try {
    const raw = storage?.getItem(BACKUP_META_KEY)
    if (!raw) return { firstEditAt: null, lastBackupAt: null }
    const p = JSON.parse(raw) as Partial<BackupMeta>
    const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : null)
    return { firstEditAt: num(p.firstEditAt), lastBackupAt: num(p.lastBackupAt) }
  } catch { return { firstEditAt: null, lastBackupAt: null } }
}

function writeMeta(m: BackupMeta, storage: Storage | null) {
  try { storage?.setItem(BACKUP_META_KEY, JSON.stringify(m)) } catch { /* storage full or blocked: reminders just stay off */ }
}

function safeStorage(): Storage | null {
  try { return typeof window === 'undefined' ? null : window.localStorage } catch { return null }
}

export function markFirstEdit(now = Date.now(), storage: Storage | null = safeStorage()) {
  const m = readBackupMeta(storage)
  if (m.firstEditAt === null) writeMeta({ ...m, firstEditAt: now }, storage)
}

export function markBackup(now = Date.now(), storage: Storage | null = safeStorage()) {
  const m = readBackupMeta(storage)
  writeMeta({ firstEditAt: m.firstEditAt ?? now, lastBackupAt: now }, storage)
}

/** True when there is data worth protecting and no backup in the last BACKUP_REMIND_DAYS days. */
export function backupDue(meta: BackupMeta, now = Date.now()): boolean {
  const since = meta.lastBackupAt ?? meta.firstEditAt
  if (since === null) return false
  return now - since >= BACKUP_REMIND_DAYS * DAY
}

export function daysSince(ts: number, now = Date.now()): number {
  return Math.max(0, Math.floor((now - ts) / DAY))
}
