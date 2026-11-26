export const PREVIEW_SEEN_KEY = 'rodaina-planner:preview-seen'
const DAY_MS = 86400000
let memorySeenAt = 0

function browserStorage(kind: 'localStorage' | 'sessionStorage'): Storage | null {
  try { return typeof window === 'undefined' ? null : window[kind] } catch { return null }
}

export function readPreviewSeen(local: Storage | null = browserStorage('localStorage'), session: Storage | null = browserStorage('sessionStorage')): number {
  try {
    const value = Number(local?.getItem(PREVIEW_SEEN_KEY))
    if (value > 0) return value
  } catch { /* private mode or disabled storage */ }
  try {
    const value = Number(session?.getItem(PREVIEW_SEEN_KEY))
    if (value > 0) return value
  } catch { /* private mode or disabled storage */ }
  return memorySeenAt
}

export function markPreviewSeen(now = Date.now(), local: Storage | null = browserStorage('localStorage'), session: Storage | null = browserStorage('sessionStorage')): void {
  let saved = false
  try { if (local) { local.setItem(PREVIEW_SEEN_KEY, String(now)); saved = true } } catch { /* try session storage */ }
  if (!saved) {
    try { if (session) { session.setItem(PREVIEW_SEEN_KEY, String(now)); saved = true } } catch { /* use memory below */ }
  }
  if (!saved) memorySeenAt = now
}

export function shouldAutoOpenPreview(pathname: string, seenAt: number, now = Date.now(), repeatDays = 0): boolean {
  if (pathname === '/shop') return false
  if (!seenAt) return true
  return repeatDays > 0 && now - seenAt >= repeatDays * DAY_MS
}
