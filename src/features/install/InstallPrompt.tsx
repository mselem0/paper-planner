import { AnimatePresence, motion } from 'framer-motion'
import { useCallback, useEffect, useLayoutEffect, useState } from 'react'
import { Sticker } from '../../components/paper'
import {
  detectPlatform, readInstallState, shouldShowInstall, writeInstallState, type Platform,
} from '../../lib/install'
import s from './install.module.css'
import { useOverlayCoordinator } from '../../app/OverlayCoordinator'

interface BIPEvent extends Event { prompt: () => Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> }

const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true
const isMobile = () => window.matchMedia('(pointer: coarse)').matches && window.matchMedia('(max-width: 820px)').matches

/** Friendly "keep this planner on your home screen" sheet, shown once per 30 days on phones, never inside the installed app. */
export function InstallPrompt() {
  const { previewPending, previewOpen, setInstallOpen } = useOverlayCoordinator()
  const [platform] = useState<Platform>(() => detectPlatform({ ua: navigator.userAgent, maxTouchPoints: navigator.maxTouchPoints, platform: navigator.platform }))
  const [bip, setBip] = useState<BIPEvent | null>(null)
  const [eligible, setEligible] = useState(false)
  const [open, setOpen] = useState(false)
  const eligibleNow = useCallback(() => shouldShowInstall({ platform, standalone: isStandalone(), mobile: isMobile(), hasNativePrompt: bip !== null }, readInstallState()), [platform, bip])

  useEffect(() => {
    const onBip = (e: Event) => { e.preventDefault(); setBip(e as BIPEvent) }
    const onInstalled = () => { writeInstallState({ dismissedAt: null, installed: true }); setEligible(false); setOpen(false) }
    window.addEventListener('beforeinstallprompt', onBip)
    window.addEventListener('appinstalled', onInstalled)
    return () => { window.removeEventListener('beforeinstallprompt', onBip); window.removeEventListener('appinstalled', onInstalled) }
  }, [])

  useEffect(() => {
    const t = setTimeout(() => {
      setEligible(eligibleNow())
    }, 1800)
    return () => clearTimeout(t)
  }, [eligibleNow])

  useEffect(() => {
    const update = () => setOpen(eligible && !document.hidden && !previewPending && !previewOpen && eligibleNow())
    update()
    document.addEventListener('visibilitychange', update)
    return () => document.removeEventListener('visibilitychange', update)
  }, [eligible, previewPending, previewOpen, eligibleNow])
  useLayoutEffect(() => { if (open) setInstallOpen(true) }, [open, setInstallOpen])

  const snooze = () => { writeInstallState({ dismissedAt: Date.now(), installed: false }); setEligible(false); setOpen(false) }
  const install = async () => {
    if (!bip) return
    try {
      await bip.prompt()
      const { outcome } = await bip.userChoice
      if (outcome === 'accepted') writeInstallState({ dismissedAt: null, installed: true }); else writeInstallState({ dismissedAt: Date.now(), installed: false })
    } catch { /* prompt already used or blocked: fall through to close */ }
    setEligible(false); setOpen(false)
  }

  return (
    <AnimatePresence onExitComplete={() => setInstallOpen(false)}>
    {open && (
        <motion.section
          className={s.sheet} role="dialog" aria-labelledby="install-title" aria-modal="false"
          initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }} transition={{ duration: 0.3 }}
        >
          <div className={s.sticker} aria-hidden><Sticker size={54} rotate={8} /></div>
          <div className={s.body}>
            <h2 id="install-title" className={s.title}>Keep your planner close</h2>
            {platform === 'android' && <p className={s.text}>Add it to your home screen to open it like an app, in one tap.</p>}
            {platform === 'ios-safari' && <p className={s.text}>Tap the <b>Share</b> button in Safari, then choose <b>Add to Home Screen</b>.</p>}
            {platform === 'ios-other' && <p className={s.text}>Open the browser&apos;s <b>Share</b> menu and choose <b>Add to Home Screen</b>. If you do not see it, open this page in Safari.</p>}
            {platform === 'ios-inapp' && <p className={s.text}>To add it to your home screen, open this page in <b>Safari</b>, tap <b>Share</b>, then <b>Add to Home Screen</b>.</p>}
            <div className={s.actions}>
              {platform === 'android' && <button type="button" className={s.primary} onClick={() => void install()}>Add to home screen</button>}
              <button type="button" className={platform === 'android' ? s.ghost : s.primary} onClick={snooze}>{platform === 'android' ? 'Not now' : 'Got it'}</button>
            </div>
          </div>
        </motion.section>
      )}
    </AnimatePresence>
  )
}
