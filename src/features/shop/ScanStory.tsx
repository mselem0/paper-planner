import { useEffect, useRef, useState } from 'react'
import { PRODUCT_NAME } from './config'
import styles from './scan-story.module.css'

type ScanStoryProps = { paused?: boolean }

/** A short, illustrative concept sequence. It does not use the camera or save data. */
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
        <div className={styles.book} aria-label="صفحة من البلانر الورقي">
          <div className={styles.pageStack} />
          <div className={styles.spine} />
          <div className={styles.openPage}>
            <span className={styles.pageTitle}>أفكار وملاحظات</span>
            <span className={styles.rule} /><span className={styles.rule} /><span className={styles.ruleShort} />
          </div>
          <div className={styles.cover} aria-hidden="true"><i /></div>
          <span className={styles.bookShadow} />
        </div>
        <div className={styles.phone} aria-label="تصور توضيحي للتطبيق">
          <div className={styles.island} />
          <div className={styles.phoneScreen}>
            <span className={styles.appName} dir="ltr">{PRODUCT_NAME}</span>
            <span className={styles.appDate}>ملاحظات جديدة</span>
            <article className={`${styles.note} ${styles.noteOne}`}>
              <b>أفكار مشروع التخرج</b><i /><i />
            </article>
            <article className={`${styles.note} ${styles.noteTwo}`}>
              <b>تجهيز المسودة الأولى</b><i /><i />
            </article>
          </div>
          <span className={styles.phoneEdge} />
        </div>
        <span className={styles.scanLine} aria-hidden="true" />
        <span className={`${styles.corner} ${styles.cornerA}`} aria-hidden="true" />
        <span className={`${styles.corner} ${styles.cornerB}`} aria-hidden="true" />
      </div>
      <div className={styles.caption}>
        <span className={styles.status} aria-live="polite">{run === 0 ? 'من الورق إلى ملاحظاتك' : 'أُعيد العرض'}</span>
        <button type="button" className={styles.replay} onClick={() => setRun((n) => n + 1)} aria-label="إعادة عرض التصور">إعادة العرض</button>
      </div>
      <p className={styles.disclaimer}>تصور توضيحي لميزة الاسكان — قيد التطوير</p>
    </section>
  )
}
