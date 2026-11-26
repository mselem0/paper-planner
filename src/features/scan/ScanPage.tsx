import { useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { PaperPage, ScriptTitle } from '../../components/paper'
import { allWeeks } from '../../lib/dates'
import { weekRangeTitle } from '../../lib/week'
import { getWeek, resolveHabits, useStore } from '../../store'
import { toast } from '../../store/toast'
import type { WeekData } from '../../store/types'
import { decodeImage } from './decode'
import { cropToDataUrl, scanPage, type ScanCell, type ScanErrorCode, type ScanOk } from './engine'
import {
  STATUSES, applyProposal, buildProposal, initialStatus, parseMapsTo, taskAt,
  type Change, type Edits, type Resolutions, type StatusValue,
} from './proposal'
import s from './scan.module.css'

const DAYS_AR = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']
const DAYS_SHORT = ['ح', 'ن', 'ث', 'ر', 'خ', 'ج', 'س']
const STATUS_AR: Record<StatusValue, string> = { ok: 'تم', delay: 'تأجيل', stuck: 'متعطل', cancel: 'إلغاء' }

const ERRORS: Record<ScanErrorCode | 'week_unknown', { title: string; hint: string }> = {
  bad_image: { title: 'تعذّر فتح الصورة', hint: 'جرّب صورة أخرى أو التقط الصورة من جديد.' },
  markers_missing: { title: 'لم نرَ الصفحة كاملة', hint: 'صوّر الصفحة كلها بحيث تظهر المربعات السوداء الأربعة في الأركان، من غير قصّ ولا ظلال فوقها.' },
  qr_unreadable: { title: 'تعذّرت قراءة رمز الصفحة', hint: 'قرّب قليلًا من الرمز في الركن، وتأكد من الإضاءة وأن الصورة غير مهزوزة.' },
  template_unsupported: { title: 'هذه النسخة من الصفحة غير مدعومة بعد', hint: 'المسح متاح حاليًا لصفحة الأسبوع فقط.' },
  week_unknown: { title: 'أسبوع هذه الصفحة غير موجود في البلانر', hint: 'تأكد أنها صفحة من بلانر 2027.' },
}

type Stage = { name: 'idle' } | { name: 'processing' } | { name: 'error'; code: keyof typeof ERRORS } | { name: 'review'; scan: ScanOk }

const nextFrame = () => new Promise<void>((r) => setTimeout(r, 50))

export function ScanPage() {
  const [stage, setStage] = useState<Stage>({ name: 'idle' })
  const camera = useRef<HTMLInputElement>(null)
  const gallery = useRef<HTMLInputElement>(null)

  const onFile = async (f: File | undefined) => {
    if (camera.current) camera.current.value = ''
    if (gallery.current) gallery.current.value = ''
    if (!f) return
    setStage({ name: 'processing' })
    await nextFrame() // let the spinner paint before the (synchronous) heavy work
    try {
      const res = await scanPage(await decodeImage(f))
      if (!res.ok) setStage({ name: 'error', code: res.error.code })
      else if (!allWeeks().includes(res.page.key)) setStage({ name: 'error', code: 'week_unknown' })
      else setStage({ name: 'review', scan: res })
    } catch {
      setStage({ name: 'error', code: 'bad_image' })
    }
  }

  return (
    <PaperPage tint="var(--paper)" accent="var(--blue)" className={s.root} label="مسح صفحة">
      <div className={s.wrap} dir="rtl" lang="ar">
        <ScriptTitle>مسح صفحة ورقية</ScriptTitle>
        {stage.name === 'review' ? (
          <Review scan={stage.scan} onCancel={() => setStage({ name: 'idle' })} />
        ) : (
          <>
            {stage.name === 'processing' ? (
              <div className={s.processing} role="status"><span className={s.spinner} aria-hidden />جارٍ قراءة الصفحة…</div>
            ) : (
              <>
                {stage.name === 'error' && (
                  <div className={s.error} role="alert">
                    <strong>{ERRORS[stage.code].title}</strong>
                    <p>{ERRORS[stage.code].hint}</p>
                  </div>
                )}
                <ul className={s.tips}>
                  <li>الصفحة كاملة داخل الصورة، والمربعات الأربعة في الأركان ظاهرة.</li>
                  <li>اكتب بقلم داكن (أسود أو أزرق غامق).</li>
                  <li>إضاءة جيدة من غير ظل على الورقة.</li>
                </ul>
                <div className={s.actions}>
                  <button type="button" className={s.primary} onClick={() => camera.current?.click()}>
                    {stage.name === 'error' ? 'حاول مرة أخرى بالكاميرا' : 'التقط صورة للصفحة'}
                  </button>
                  <button type="button" className={s.secondary} onClick={() => gallery.current?.click()}>اختر من المعرض</button>
                </div>
              </>
            )}
            <input ref={camera} type="file" accept="image/*" capture="environment" hidden data-testid="scan-camera" onChange={(e) => void onFile(e.target.files?.[0])} />
            <input ref={gallery} type="file" accept="image/*" hidden data-testid="scan-gallery" onChange={(e) => void onFile(e.target.files?.[0])} />
          </>
        )}
      </div>
    </PaperPage>
  )
}

const show = (v: Change['existing'] | Change['next']): string => (typeof v === 'string' ? (v in STATUS_AR ? STATUS_AR[v as StatusValue] : v) : v ? 'نعم' : 'لا')
const fieldName = (c: Change): string => {
  const r = c.ref
  if (r.kind === 'habit-done') return `عادة ${r.habit + 1} - ${DAYS_AR[r.day]}`
  if (r.kind === 'habit-name') return `اسم العادة ${r.habit + 1}`
  return `${DAYS_AR[r.day]} - مهمة ${r.index + 1} (${r.kind === 'task-text' ? 'النص' : 'الحالة'})`
}

interface TaskRow { day: number; index: number; text?: ScanCell; status?: ScanCell }

function Review({ scan, onCancel }: { scan: ScanOk; onCancel: () => void }) {
  const navigate = useNavigate()
  const weeks = useStore((st) => st.weeks)
  const { toggleHabit, setHabitName, setDayTasks } = useStore.getState()
  const key = scan.page.key
  const week: WeekData = useMemo(() => ({ ...getWeek({ weeks } as never, key), habits: resolveHabits(weeks, key) }), [weeks, key])
  const [edits, setEdits] = useState<Edits>({})
  const [res, setRes] = useState<Resolutions>({})
  const [showEmpty, setShowEmpty] = useState(false)
  const urls = useMemo(() => {
    const m: Record<string, string> = {}
    for (const c of scan.cells) if (c.crop) { try { m[c.id] = cropToDataUrl(c.crop) } catch { /* no thumbnail */ } }
    return m
  }, [scan])
  const set = (id: string, v: boolean | string | null) => setEdits((e) => ({ ...e, [id]: v }))

  const { habitDots, habitNames, rows } = useMemo(() => {
    const dots = new Map<number, { cell: ScanCell; day: number }[]>()
    const names = new Map<number, ScanCell>()
    const tasks = new Map<string, TaskRow>()
    for (const cell of scan.cells) {
      const r = parseMapsTo(cell.mapsTo)
      if (!r) continue
      if (r.kind === 'habit-done') dots.set(r.habit, [...(dots.get(r.habit) ?? []), { cell, day: r.day }])
      else if (r.kind === 'habit-name') names.set(r.habit, cell)
      else {
        const k = `${r.day}.${r.index}`
        const row = tasks.get(k) ?? { day: r.day, index: r.index }
        if (r.kind === 'task-text') row.text = cell; else row.status = cell
        tasks.set(k, row)
      }
    }
    return { habitDots: dots, habitNames: names, rows: [...tasks.values()].sort((a, b) => a.day - b.day || a.index - b.index) }
  }, [scan])

  const proposal = useMemo(() => buildProposal(scan, week, edits), [scan, week, edits])
  const total = proposal.changes.length + proposal.conflicts.filter((c) => res[c.id] === 'replace').length

  const statusOf = (c: ScanCell): StatusValue | null => {
    const e = edits[c.id]
    return e !== undefined ? ((e as StatusValue | null)) : initialStatus(c)
  }
  const textOf = (c: ScanCell, existing: string) => (typeof edits[c.id] === 'string' ? (edits[c.id] as string) : existing)

  const visible = (r: TaskRow) => {
    const t = taskAt(week, r.day, r.index)
    return !!(r.text?.value || r.status?.value || r.text?.needsReview || r.status?.needsReview || t?.text.trim() || t?.status)
  }
  const shown = rows.filter(visible)
  const hidden = rows.length - shown.length
  const list = showEmpty ? rows : shown

  const save = () => {
    const n = applyProposal(proposal, res, week, { toggleHabit, setHabitName, setDayTasks })
    toast(n ? `تم حفظ ${n} تغيير` : 'لا توجد تغييرات للحفظ', n ? 'success' : 'info')
    navigate(`/w/${key}`, { state: { tab: 'planner' } })
  }

  return (
    <div className={s.review}>
      <h2 className={s.reviewTitle}>راجع قبل الحفظ</h2>
      <p className={s.weekLine}>صفحة الأسبوع: <bdi>{weekRangeTitle(key)}</bdi></p>
      <p className={s.note}>القراءة الآلية قد تخطئ، والنصوص المكتوبة بخط اليد لا تُقرأ تلقائيًا — اكتبها بنفسك. لن يُمسح أي شيء موجود عندك.</p>

      <section aria-label="العادات" className={s.group}>
        <h3>العادات</h3>
        {[...habitDots.keys()].sort((a, b) => a - b).map((h) => {
          const nameCell = habitNames.get(h)
          const name = week.habits[h]?.name ?? ''
          return (
            <div key={h} className={s.habit}>
              {nameCell && (
                <div className={`${s.line} ${nameCell.needsReview && typeof edits[nameCell.id] !== 'string' && !name ? s.flag : ''}`}>
                  {urls[nameCell.id] && <img src={urls[nameCell.id]} alt="" className={s.crop} />}
                  <input
                    className={s.input} dir="auto" aria-label={`اسم العادة ${h + 1}`} placeholder={nameCell.value ? 'اكتب اسم العادة كما هو مكتوب' : 'اسم العادة'}
                    value={textOf(nameCell, name)} onChange={(e) => set(nameCell.id, e.target.value)}
                  />
                </div>
              )}
              <div className={s.dots}>
                {habitDots.get(h)!.sort((a, b) => a.day - b.day).map(({ cell, day }) => {
                  const on = edits[cell.id] !== undefined ? edits[cell.id] === true : cell.value === true
                  return (
                    <button
                      key={cell.id} type="button" aria-pressed={on} aria-label={`عادة ${h + 1} - ${DAYS_AR[day]}`}
                      className={`${s.dot} ${on ? s.dotOn : ''} ${cell.uncertain ? s.flag : ''}`}
                      onClick={() => set(cell.id, !on)}
                    >{DAYS_SHORT[day]}</button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </section>

      <section aria-label="المهام" className={s.group}>
        <h3>مهام الأسبوع</h3>
        {list.length === 0 && <p className={s.note}>لم نجد مهام مكتوبة أو علامات في هذه الصفحة.</p>}
        {DAYS_AR.map((dayName, d) => {
          const dayRows = list.filter((r) => r.day === d)
          if (!dayRows.length) return null
          return (
            <div key={d} className={s.day} role="group" aria-label={dayName}>
              <h4>{dayName}</h4>
              {dayRows.map((r) => {
                const existing = taskAt(week, r.day, r.index)
                const st = r.status ? statusOf(r.status) : null
                const needsPick = r.status?.kind === 'symbol-circle' && r.status.value === true && st === null
                const writing = !!r.text?.value
                const textFlag = writing && !existing?.text.trim() && typeof edits[r.text!.id] !== 'string'
                return (
                  <div key={r.index} className={s.task}>
                    <div className={`${s.line} ${textFlag || r.text?.uncertain ? s.flag : ''}`}>
                      {r.text && urls[r.text.id] && <img src={urls[r.text.id]} alt={`خط يد - ${dayName} مهمة ${r.index + 1}`} className={s.crop} />}
                      {r.text && (
                        <input
                          className={s.input} dir="auto" aria-label={`${dayName} - مهمة ${r.index + 1}`}
                          placeholder={writing ? 'اكتب ما هو مكتوب بالصفحة' : 'فارغ'}
                          value={textOf(r.text, existing?.text ?? '')} onChange={(e) => set(r.text!.id, e.target.value)}
                        />
                      )}
                    </div>
                    {r.status && (
                      <div className={`${s.status} ${needsPick || r.status.uncertain ? s.flag : ''}`} role="radiogroup" aria-label={`حالة ${dayName} - مهمة ${r.index + 1}`}>
                        {needsPick && <span className={s.hint}>يوجد رمز في الدائرة — اختر الحالة</span>}
                        {STATUSES.map((v) => (
                          <button
                            key={v} type="button" role="radio" aria-checked={st === v} className={`${s.chip} ${st === v ? s.chipOn : ''}`}
                            onClick={() => set(r.status!.id, st === v ? null : v)}
                          >{STATUS_AR[v]}</button>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )
        })}
        {hidden > 0 && (
          <button type="button" className={s.link} onClick={() => setShowEmpty((v) => !v)}>
            {showEmpty ? 'إخفاء الأسطر الفارغة' : `إظهار الأسطر الفارغة (${hidden})`}
          </button>
        )}
      </section>

      {proposal.conflicts.length > 0 && (
        <section aria-label="تعارضات" className={`${s.group} ${s.conflicts}`}>
          <h3>تعارضات مع ما هو محفوظ ({proposal.conflicts.length})</h3>
          <p className={s.note}>الافتراضي: الإبقاء على الموجود.</p>
          {proposal.conflicts.map((c) => {
            const choice = res[c.id] ?? 'keep'
            return (
              <div key={c.id} className={s.conflict} role="radiogroup" aria-label={`تعارض: ${fieldName(c)}`}>
                <strong>{fieldName(c)}</strong>
                <label><input type="radio" name={c.id} checked={choice === 'keep'} onChange={() => setRes((r) => ({ ...r, [c.id]: 'keep' }))} /> إبقاء الحالي: <bdi>{show(c.existing)}</bdi></label>
                <label><input type="radio" name={c.id} checked={choice === 'replace'} onChange={() => setRes((r) => ({ ...r, [c.id]: 'replace' }))} /> استبدال بالجديد: <bdi>{show(c.next)}</bdi></label>
              </div>
            )
          })}
        </section>
      )}

      <div className={s.actions}>
        <button type="button" className={s.primary} onClick={save}>
          {total ? `حفظ ${total} تغيير` : 'لا توجد تغييرات — العودة للأسبوع'}
        </button>
        <button type="button" className={s.secondary} onClick={onCancel}>إلغاء</button>
        <Link to={`/w/${key}`} className={s.link}>العودة للأسبوع بدون حفظ</Link>
      </div>
    </div>
  )
}
