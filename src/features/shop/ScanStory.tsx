import { useEffect, useRef, useState } from 'react'
import { PAGES, PRODUCT_NAME } from './config'
import styles from './scan-story.module.css'

type ScanStoryProps = { paused?: boolean }

/** A finite, illustrative story: paper pages turn first, then the app receives the notes. */
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

  const page = (key: string) => PAGES.find((item) => item.key === key)!
  const storyPages = [page('cover'), page('today'), page('week'), page('notes')]

  return (
    <section ref={root} className={styles.story} aria-label="تصور توضيحي لمسح صفحة البلانر">
      <div className={`${styles.scene} ${stopped ? styles.paused : ''}`} key={run}>
        <div className={styles.book} aria-label="صفحات من البلانر الورقي">
          <div className={styles.bookPages}>
            <div className={styles.pageStack} />
            {storyPages.map((item, index) => (
              <div className={`${styles.page} ${styles[`page${index}`]}`} key={item.key} data-page={item.key}>
                <img src={item.img} alt={item.label} width={item.width} height={item.height} draggable={false} />
              </div>
            ))}
            <span className={styles.spine} aria-hidden="true" />
          </div>
          <span className={styles.bookShadow} aria-hidden="true" />
        </div>

        <div className={styles.phone} aria-label="تصور توضيحي للتطبيق">
          <span className={styles.phoneButton} aria-hidden="true" />
          <div className={styles.phoneScreen}>
            <div className={styles.statusBar} dir="ltr"><span>9:41</span><span className={styles.statusMarks} aria-hidden="true"><i /><i /><i /></span></div>
            <div className={styles.island} aria-hidden="true"><i /></div>
            <header className={styles.appHeader}>
              <span className={styles.appName} dir="ltr">{PRODUCT_NAME}</span>
              <b>ملاحظاتي</b>
              <small>من صفحات البلانر</small>
            </header>
            <div className={styles.notes}>
              <article className={`${styles.note} ${styles.noteOne}`}>
                <span>أفكار مشروع التخرج</span>
                <p>ترتيب المراجع ومراجعة المقدمة</p>
              </article>
              <article className={`${styles.note} ${styles.noteTwo}`}>
                <span>تجهيز المسودة الأولى</span>
                <p>إنهاء الفصل الأول قبل الخميس</p>
              </article>
            </div>
            <div className={styles.homeIndicator} aria-hidden="true" />
          </div>
          <span className={styles.phoneEdge} aria-hidden="true" />
        </div>

        <div className={styles.scan} aria-hidden="true"><span /></div>
      </div>
      <div className={styles.caption}>
        <span className={styles.status} aria-live="polite">{run === 0 ? 'من صفحات البلانر إلى ملاحظاتك' : 'أُعيد العرض'}</span>
        <button type="button" className={styles.replay} onClick={() => setRun((n) => n + 1)} aria-label="إعادة عرض التصور">إعادة العرض</button>
      </div>
      <p className={styles.disclaimer}>تصور توضيحي لميزة الاسكان — قيد التطوير</p>
    </section>
  )
}
