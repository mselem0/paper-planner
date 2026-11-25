/**
 * Anonymous usage stats. Sends at most one tiny ping per local day to a user-deployed Apps Script URL.
 * Never includes planner content (tasks, budget, notes). Disabled entirely when VITE_STATS_URL is empty.
 */
import { detectPlatform, type Platform } from './install'

export const STATS_KEY = 'rodaina-planner:stats'
export const MAX_NAME = 60

export interface StatsState {
  deviceId: string
  lastSentDay: string | null
  shareName: boolean
  optOut: boolean
  lastName: string | null
  lastInstalled: boolean | null
}

export interface Ping { v: 1; deviceId: string; day: string; name: string; installed: boolean; platform: Platform; lang: string }

export const statsUrl = (): string => {
  const v = import.meta.env.VITE_STATS_URL
  return typeof v === 'string' ? v.trim() : ''
}
export const statsEnabled = (url: string = statsUrl()): boolean => url.length > 0

export function localDay(d = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

export function newDeviceId(): string {
  try { if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID() } catch { /* fall through */ }
  return `d-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`
}

export function freshState(): StatsState {
  return { deviceId: newDeviceId(), lastSentDay: null, shareName: true, optOut: false, lastName: null, lastInstalled: null }
}

function safe(): Storage | null { try { return typeof window === 'undefined' ? null : window.localStorage } catch { return null } }

export function readStats(storage: Storage | null = safe()): StatsState {
  try {
    const p = JSON.parse(storage?.getItem(STATS_KEY) ?? 'null') as Partial<StatsState> | null
    if (p && typeof p.deviceId === 'string' && p.deviceId) {
      return {
        deviceId: p.deviceId.slice(0, 64),
        lastSentDay: typeof p.lastSentDay === 'string' ? p.lastSentDay : null,
        shareName: p.shareName !== false,
        optOut: p.optOut === true,
        lastName: typeof p.lastName === 'string' ? p.lastName : null,
        lastInstalled: typeof p.lastInstalled === 'boolean' ? p.lastInstalled : null,
      }
    }
  } catch { /* corrupt: start fresh */ }
  const f = freshState()
  writeStats(f, storage)
  return f
}
export function writeStats(s: StatsState, storage: Storage | null = safe()) {
  try { storage?.setItem(STATS_KEY, JSON.stringify(s)) } catch { /* private mode: ping may repeat, acceptable */ }
}

const listeners = new Set<() => void>()
let cache: StatsState | null = null
export const subscribeStats = (fn: () => void) => { listeners.add(fn); return () => { listeners.delete(fn) } }
export const getStats = (): StatsState => (cache ??= readStats())
export function updateStats(patch: Partial<StatsState>) {
  cache = { ...getStats(), ...patch }
  writeStats(cache)
  listeners.forEach((l) => l())
}

export interface PingInput { state: StatsState; name: string; day: string; installed: boolean; platform: Platform; lang: string }

export function buildPing({ state, name, day, installed, platform, lang }: PingInput): Ping {
  return {
    v: 1, deviceId: state.deviceId, day,
    name: state.shareName ? name.trim().slice(0, MAX_NAME).trim() : '',
    installed, platform, lang,
  }
}

/** Once per local day, unless disabled or opted out. */
export function shouldSend(state: Pick<StatsState, 'optOut' | 'lastSentDay'>, today: string, enabled: boolean): boolean {
  return enabled && !state.optOut && state.lastSentDay !== today
}

/** True when what we would report differs from the last successful send (so we resend even on the same day). */
export function changedSinceSend(state: StatsState, ping: Ping): boolean {
  return state.lastSentDay === ping.day && (state.lastName !== ping.name || state.lastInstalled !== ping.installed)
}

export function isInstalled(): boolean {
  try {
    return window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true
  } catch { return false }
}

let inflight = false
/** Send a ping if due. Errors are swallowed; lastSentDay is only stored after fetch resolves. */
export async function maybeSend(profileName: string, url: string = statsUrl()): Promise<void> {
  const state = getStats()
  const today = localDay()
  if (inflight || !statsEnabled(url) || state.optOut) return
  const ping = buildPing({
    state, name: profileName, day: today, installed: isInstalled(),
    platform: detectPlatform({ ua: navigator.userAgent, maxTouchPoints: navigator.maxTouchPoints, platform: navigator.platform }),
    lang: (navigator.language || '').slice(0, 16),
  })
  if (!shouldSend(state, today, true) && !changedSinceSend(state, ping)) return
  inflight = true
  try {
    await fetch(url, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(ping), keepalive: true })
    updateStats({ lastSentDay: today, lastName: ping.name, lastInstalled: ping.installed })
  } catch { /* offline or blocked: try again next time */ } finally { inflight = false }
}
