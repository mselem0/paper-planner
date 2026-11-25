import { useEffect, useRef, useState } from 'react'
import { daysSince, readBackupMeta } from '../../lib/backup'
import { PaperPage, ScriptTitle } from '../../components/paper'
import { useStore } from '../../store'
import { statsEnabled, updateStats, useStatsState } from '../stats/StatsPinger'
import { STORAGE_KEY } from '../../store/defaults'
import { normalizeData } from '../../store/normalize'
import { plannerStorage } from '../../store/storage'
import { toast } from '../../store/toast'
import s from './settings.module.css'

function usedBytes(): number {
  try { plannerStorage.flush(); const v = window.localStorage.getItem(STORAGE_KEY); return v ? new Blob([v]).size : 0 } catch { return 0 }
}
const QUOTA = 5 * 1024 * 1024
const human = (b: number) => (b < 1024 ? `${b} B` : b < 1048576 ? `${(b / 1024).toFixed(1)} KB` : `${(b / 1048576).toFixed(2)} MB`)

export function SettingsPage() {
  const name = useStore((st) => st.profile.name)
  const currency = useStore((st) => st.profile.currency)
  const setName = useStore((st) => st.setName)
  const setCurrency = useStore((st) => st.setCurrency)
  const download = useStore((st) => st.downloadExport)
  const importJSON = useStore((st) => st.importJSON)
  const resetAll = useStore((st) => st.resetAll)
  const data = useStore((st) => st.weeks)
  const file = useRef<HTMLInputElement>(null)
  const [bytes, setBytes] = useState(0)
  const stats = useStatsState()
  const last = readBackupMeta().lastBackupAt
  useEffect(() => { const t = setTimeout(() => setBytes(usedBytes()), 400); return () => clearTimeout(t) })

  const onFile = async (f: File | undefined) => {
    if (!f) return
    try {
      const text = await f.text()
      normalizeData(JSON.parse(text))
      if (!window.confirm('Replace ALL current planner data with this backup? This cannot be undone.')) return
      const r = importJSON(text)
      if (r.ok) toast('Backup restored', 'success'); else toast(r.error, 'error')
    } catch (e) {
      toast(e instanceof SyntaxError ? 'That file is not valid JSON.' : e instanceof Error ? e.message : 'Import failed.', 'error')
    } finally { if (file.current) file.current.value = '' }
  }
  const reset = () => {
    if (!window.confirm('Erase everything in this planner?')) return
    if (!window.confirm('Really erase ALL data? Export a backup first if unsure. This cannot be undone.')) return
    resetAll(); toast('Planner reset', 'success')
  }
  void data
  const pct = Math.min(100, (bytes / QUOTA) * 100)

  return (
    <PaperPage label="Settings">
      <h1 className={s.h1}>Settings</h1>
      <ScriptTitle size="clamp(30px,6vw,44px)" rotate={-3}>make it yours</ScriptTitle>

      <section className={s.card}>
        <h2 className={s.h2}>About me</h2>
        <label className={s.field}><span>My name</span>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Rodaina" autoComplete="off" />
        </label>
        <label className={s.field}><span>Currency</span>
          <input value={currency} onChange={(e) => setCurrency(e.target.value)} placeholder="EGP" maxLength={8} autoComplete="off" />
        </label>
      </section>

      {statsEnabled() && (
        <section className={s.card}>
          <h2 className={s.h2}>Privacy</h2>
          <p className={s.note}>The planner sends a tiny note once a day: an anonymous device id, the day you opened it, whether it is installed on your home screen, and your name if you allow it. Never your tasks, budget or notes.</p>
          <label className={s.check}><input type="checkbox" checked={stats.shareName} disabled={stats.optOut} onChange={(e) => updateStats({ shareName: e.target.checked })} /> Share my name</label>
          <label className={s.check}><input type="checkbox" checked={!stats.optOut} onChange={(e) => updateStats({ optOut: !e.target.checked })} /> Send anonymous usage stats</label>
        </section>
      )}

      <section className={s.card}>
        <h2 className={s.h2}>Backup</h2>
        <p className={s.note}>Everything lives in this browser on this device only. Clearing browser data, switching phones or using a private window loses it. Save a copy now and then, and keep the file somewhere safe.</p>
        <p className={s.note} role="status">{last ? `Last backup file created: ${daysSince(last) === 0 ? 'today' : `${daysSince(last)} days ago`}.` : 'No backup file created yet.'}</p>
        <div className={s.btns}>
          <button type="button" className={s.btn} onClick={download}>Export backup</button>
          <button type="button" className={s.btn} onClick={() => file.current?.click()}>Import backup</button>
          <input ref={file} type="file" accept="application/json,.json" hidden aria-label="Backup file" onChange={(e) => void onFile(e.target.files?.[0])} />
        </div>
      </section>

      <section className={s.card}>
        <h2 className={s.h2}>Storage</h2>
        <div className={s.meter} role="meter" aria-valuemin={0} aria-valuemax={QUOTA} aria-valuenow={bytes} aria-label="Storage used">
          <span style={{ width: `${Math.max(pct, 1)}%` }} />
        </div>
        <p className={s.note}>{human(bytes)} used of about 5 MB</p>
      </section>

      <section className={`${s.card} ${s.danger}`}>
        <h2 className={s.h2}>Danger zone</h2>
        <button type="button" className={`${s.btn} ${s.red}`} onClick={reset}>Reset all data</button>
      </section>
    </PaperPage>
  )
}
