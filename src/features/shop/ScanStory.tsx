import { useEffect, useRef, useState } from 'react'
import { AgendaLogo, PaperPage, ScriptTitle } from '../../components/paper'
import { IconMonths, IconMore, IconNotes, IconToday, IconYear } from '../../components/shell/icons'
import notes from '../notes/notes.module.css'
import shell from '../../components/shell/shell.module.css'
import styles from './scan-story.module.css'

type ScanStoryProps = { paused?: boolean }

/** A finite paper-to-phone story: a bound planner opens, then its notes are captured. */
export default function ScanStory({ paused = false }: ScanStoryProps) {
  const root = useRef<HTMLElement>(null)
  const [inView, setInView] = useState(true)
  const [documentVisible, setDocumentVisible] = useState(() => typeof document === 'undefined' || !document.hidden)
  const [run, setRun] = useState(0)
  const stopped = paused || !inView || !documentVisible

  useEffect(() => {
    const node = root.current
    if (!node || typeof IntersectionObserver === 'undefined') return
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { threshold: 0.15 })
    observer.observe(node)
    return () => observer.disconnect()
  }, [])
  useEffect(() => {
    const update = () => setDocumentVisible(!document.hidden)
    document.addEventListener('visibilitychange', update)
    return () => document.removeEventListener('visibilitychange', update)
  }, [])

  return (
    <section ref={root} className={styles.story} aria-label="تصور توضيحي لمسح صفحة البلانر">
      <div className={`${styles.scene} ${stopped ? styles.paused : ''}`} key={run}>
        <div className={styles.planner} aria-label="دفتر بلانر ورقي مفتوح">
          <div className={styles.block} aria-hidden="true" />
          <div className={styles.spread}>
            <article className={`${styles.leaf} ${styles.leftLeaf}`}>
              <div className={styles.paperContent}>
                <span className={styles.paperDate}>الأسبوع · ١٢ — ١٨ يناير</span>
                <h3>أولوياتي</h3>
                <p>ترتيب المراجع</p><p>مراجعة المقدمة</p><p>مكالمة مع الفريق</p>
                <span className={styles.checkline}>□ تسليم المسودة</span>
              </div>
            </article>
            <article className={`${styles.leaf} ${styles.rightLeaf}`}>
              <div className={styles.paperContent}>
                <span className={styles.paperDate}>الثلاثاء · ١٣ يناير</span>
                <h3>ملاحظات اليوم</h3>
                <p>أفكار مشروع التخرج</p>
                <p>ترتيب المراجع ومراجعة المقدمة</p>
                <p>تجهيز المسودة الأولى</p>
                <p>إنهاء الفصل الأول قبل الخميس</p>
              </div>
            </article>
            <div className={styles.paperStack} aria-hidden="true" />
            <span className={styles.spine} aria-hidden="true" />
            <div className={styles.rings} aria-hidden="true">{Array.from({ length: 6 }, (_, i) => <i key={i} />)}</div>
            <div className={styles.coverLeaf}>
              <div className={styles.cover} data-page="cover" aria-label="غلاف البلانر 2027">
                <img src={`${import.meta.env.BASE_URL}shop/cover.webp`} alt="" draggable={false} />
              </div>
              <div className={styles.coverInside} aria-hidden="true" />
            </div>
          </div>
          <span className={styles.groundShadow} aria-hidden="true" />
        </div>

        <div className={styles.phone} role="img" aria-label="تصور توضيحي لشاشة الملاحظات في التطبيق">
          <span className={styles.phoneButton} aria-hidden="true" />
          <div className={styles.phoneScreen} aria-hidden="true">
            <div className={styles.statusBar} dir="ltr"><span>9:41</span><span className={styles.statusMarks} aria-hidden="true"><i /><i /><i /></span></div>
            <div className={styles.island} aria-hidden="true"><i /></div>
            <div className={styles.camera} data-camera-preview="true" aria-hidden="true">
              <span className={styles.cameraLabel}>مسح صفحة</span>
              <span className={styles.paperInCamera}><i>ملاحظات اليوم</i><b>أفكار مشروع التخرج</b><small>ترتيب المراجع ومراجعة المقدمة</small><small>تجهيز المسودة الأولى</small></span>
              <span className={styles.corner} />
              <span className={styles.captureFlash} data-capture-flash="true" />
              <span className={styles.shutter} />
            </div>
            <div className={styles.appView}>
              <div className={styles.appViewport} dir="ltr">
                <main className={styles.appMain}>
                  <PaperPage label="Notes" className={styles.demoPaper}>
                    <div className={styles.demoTop}><AgendaLogo /></div>
                    <h1 className={`${notes.h1} ${styles.demoTitle}`}>Notes</h1>
                    <div className={`${notes.bar} ${styles.demoBar}`}>
                      <ScriptTitle size="28px" rotate={-3}>my notebook</ScriptTitle>
                      <span className={`${notes.new} ${styles.demoNew}`}>+ New page</span>
                    </div>
                    <ul className={`${notes.grid} ${styles.demoGrid}`}>
                      <li><article className={`${notes.card} ${styles.demoCard} ${styles.demoCardOne}`}>
                        <strong className={notes.cardTitle}>أفكار مشروع التخرج</strong>
                        <span className={notes.snip}>ترتيب المراجع ومراجعة المقدمة</span>
                        <span className={notes.date}>13 Jan 2027</span>
                      </article></li>
                      <li><article className={`${notes.card} ${styles.demoCard} ${styles.demoCardTwo}`}>
                        <strong className={notes.cardTitle}>تجهيز المسودة الأولى</strong>
                        <span className={notes.snip}>إنهاء الفصل الأول قبل الخميس</span>
                        <span className={notes.date}>13 Jan 2027</span>
                      </article></li>
                    </ul>
                  </PaperPage>
                </main>
                <nav className={`${shell.bar} ${styles.demoNav}`} aria-label="Planner sections">
                  <span className={styles.demoNavButton}><IconToday />Today</span>
                  <span className={styles.demoNavButton}><IconYear />Year</span>
                  <span className={styles.demoNavButton}><IconMonths />Months</span>
                  <span className={styles.demoNavButton} aria-current="page"><IconNotes />Notes</span>
                  <span className={styles.demoNavButton}><IconMore />More</span>
                </nav>
              </div>
            </div>
            <div className={styles.homeIndicator} aria-hidden="true" />
          </div>
          <span className={styles.phoneEdge} aria-hidden="true" />
        </div>
      </div>
      <div className={styles.caption}>
        <span className={styles.status} aria-live="polite">{run === 0 ? 'من صفحات البلانر إلى ملاحظاتك' : 'أُعيد العرض'}</span>
        <button type="button" className={styles.replay} onClick={() => setRun((n) => n + 1)} aria-label="إعادة عرض التصور">إعادة العرض</button>
      </div>
      <p className={styles.disclaimer}>تصور توضيحي لميزة الاسكان — قيد التطوير</p>
    </section>
  )
}
