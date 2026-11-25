import type { StateStorage } from 'zustand/middleware'
import { toast } from './toast'

/**
 * localStorage wrapper: writes are debounced (coalescing rapid keystrokes) and flushed on
 * page hide/unload so nothing typed is lost. Any quota/security error surfaces as a toast.
 */
export function createDebouncedStorage(delay = 250, backing: () => Storage = () => window.localStorage): StateStorage & { flush: () => void } {
  const pending = new Map<string, string>()
  let timer: ReturnType<typeof setTimeout> | null = null
  let lastErrorAt = 0

  const reportError = (e: unknown) => {
    console.error('[planner] storage error', e)
    if (Date.now() - lastErrorAt < 5000) return
    lastErrorAt = Date.now()
    const quota = e instanceof DOMException && (e.name === 'QuotaExceededError' || e.code === 22)
    toast(
      quota
        ? 'Your browser storage is full - recent changes were NOT saved. Export a backup from Settings.'
        : 'Could not save to this browser - recent changes may be lost. Export a backup from Settings.',
      'error',
    )
  }

  const flush = () => {
    if (timer) { clearTimeout(timer); timer = null }
    for (const [k, v] of [...pending]) {
      try { backing().setItem(k, v); pending.delete(k) } catch (e) { pending.delete(k); reportError(e) }
    }
  }

  if (typeof window !== 'undefined') {
    window.addEventListener('pagehide', flush)
    window.addEventListener('beforeunload', flush)
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flush() })
  }

  return {
    getItem: (name) => {
      if (pending.has(name)) return pending.get(name) ?? null
      try { return backing().getItem(name) } catch (e) { reportError(e); return null }
    },
    setItem: (name, value) => {
      pending.set(name, value)
      if (timer) clearTimeout(timer)
      timer = setTimeout(flush, delay)
    },
    removeItem: (name) => {
      pending.delete(name)
      try { backing().removeItem(name) } catch (e) { reportError(e) }
    },
    flush,
  }
}

export const plannerStorage = createDebouncedStorage()
