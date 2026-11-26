import { describe, expect, it, vi } from 'vitest'
import { markPreviewSeen, PREVIEW_SEEN_KEY, readPreviewSeen, shouldAutoOpenPreview } from './previewState'

function storage() {
  const values = new Map<string, string>()
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value) },
    removeItem: (key: string) => { values.delete(key) }, clear: () => values.clear(), key: () => null,
    get length() { return values.size },
  } as Storage
}

describe('first visit preview state', () => {
  it('opens on the first visit after scheduling, except on /shop', () => {
    expect(shouldAutoOpenPreview('/', 0)).toBe(true)
    expect(shouldAutoOpenPreview('/today', 0)).toBe(true)
    expect(shouldAutoOpenPreview('/shop', 0)).toBe(false)
  })

  it('uses the configured repeat interval, which defaults to no repeat', () => {
    const now = 10_000_000_000
    const seen = now - 3 * 86400000
    expect(shouldAutoOpenPreview('/today', seen, now, 0)).toBe(false)
    expect(shouldAutoOpenPreview('/today', seen, now, 3)).toBe(true)
    expect(shouldAutoOpenPreview('/today', seen, now, 4)).toBe(false)
  })

  it('stores the timestamp under a namespaced path-free key', () => {
    const local = storage()
    markPreviewSeen(1234, local, null)
    expect(PREVIEW_SEEN_KEY).toMatch(/^rodaina-planner:/)
    expect(PREVIEW_SEEN_KEY).not.toContain('/')
    expect(readPreviewSeen(local, null)).toBe(1234)
  })

  it('falls back to session storage when persistent storage throws', () => {
    const blocked = storage()
    vi.spyOn(blocked, 'setItem').mockImplementation(() => { throw new Error('blocked') })
    vi.spyOn(blocked, 'getItem').mockImplementation(() => { throw new Error('blocked') })
    const session = storage()
    markPreviewSeen(9876, blocked, session)
    expect(readPreviewSeen(blocked, session)).toBe(9876)
  })

  it('falls back to session storage when local storage is missing', () => {
    const session = storage()
    markPreviewSeen(12000, null, session)
    expect(readPreviewSeen(null, session)).toBe(12000)
  })

  it('remembers a dismissal in memory when both storage APIs are blocked', () => {
    const blockedLocal = storage(), blockedSession = storage()
    vi.spyOn(blockedLocal, 'setItem').mockImplementation(() => { throw new Error('blocked') })
    vi.spyOn(blockedLocal, 'getItem').mockImplementation(() => { throw new Error('blocked') })
    vi.spyOn(blockedSession, 'setItem').mockImplementation(() => { throw new Error('blocked') })
    vi.spyOn(blockedSession, 'getItem').mockImplementation(() => { throw new Error('blocked') })
    markPreviewSeen(15000, blockedLocal, blockedSession)
    expect(readPreviewSeen(blockedLocal, blockedSession)).toBe(15000)
    expect(shouldAutoOpenPreview('/week', readPreviewSeen(blockedLocal, blockedSession), 16000, 0)).toBe(false)
  })
})
