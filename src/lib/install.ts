/**
 * "Add to home screen" prompt logic. Pure helpers so every platform rule is unit-tested.
 * Browsers differ: Chrome/Edge/Samsung on Android can show a real install dialog (beforeinstallprompt);
 * iPhone/iPad have no such API, so we can only explain the Share menu steps. Never promise a one-tap install everywhere.
 */
export const INSTALL_KEY = 'rodaina-planner:install-prompt'
export const SNOOZE_DAYS = 30
const DAY = 86400000

export type Platform = 'ios-safari' | 'ios-other' | 'ios-inapp' | 'android' | 'other'

export interface NavInfo { ua: string; maxTouchPoints: number; platform?: string }

export function detectPlatform({ ua, maxTouchPoints, platform = '' }: NavInfo): Platform {
  const ipadOS = platform === 'MacIntel' && maxTouchPoints > 1
  const ios = /iPhone|iPad|iPod/i.test(ua) || ipadOS
  if (ios) {
    if (/FBAN|FBAV|Instagram|Line\/|Twitter|LinkedInApp|Snapchat|GSA\/|MicroMessenger|; wv\)/i.test(ua)) return 'ios-inapp'
    if (/CriOS|FxiOS|EdgiOS|OPiOS|DuckDuckGo/i.test(ua)) return 'ios-other'
    return 'ios-safari'
  }
  if (/Android/i.test(ua)) return 'android'
  return 'other'
}

export interface InstallState { dismissedAt: number | null; installed: boolean }

export function readInstallState(storage: Storage | null = safe()): InstallState {
  try {
    const p = JSON.parse(storage?.getItem(INSTALL_KEY) ?? 'null') as Partial<InstallState> | null
    return { dismissedAt: typeof p?.dismissedAt === 'number' ? p.dismissedAt : null, installed: p?.installed === true }
  } catch { return { dismissedAt: null, installed: false } }
}
export function writeInstallState(s: InstallState, storage: Storage | null = safe()) {
  try { storage?.setItem(INSTALL_KEY, JSON.stringify(s)) } catch { /* private mode: we may ask again next visit, acceptable */ }
}
function safe(): Storage | null { try { return typeof window === 'undefined' ? null : window.localStorage } catch { return null } }

export interface Env { platform: Platform; standalone: boolean; mobile: boolean; hasNativePrompt: boolean }

/** Whether to show the sheet now. Never when already installed/standalone, on desktop, or snoozed. */
export function shouldShowInstall(env: Env, state: InstallState, now = Date.now()): boolean {
  if (env.standalone || state.installed || !env.mobile) return false
  if (state.dismissedAt !== null && now - state.dismissedAt < SNOOZE_DAYS * DAY) return false
  if (env.platform === 'android') return env.hasNativePrompt // no native prompt: nothing honest to offer
  if (env.platform === 'ios-safari' || env.platform === 'ios-other' || env.platform === 'ios-inapp') return true
  return false
}
