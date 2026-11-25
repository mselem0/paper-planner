import { describe, expect, it } from 'vitest'
import { detectPlatform, shouldShowInstall, SNOOZE_DAYS, type Env } from './install'

const UA = {
  iosSafari: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1',
  iosChrome: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/124.0 Mobile/15E148 Safari/604.1',
  iosInsta: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 320.0',
  android: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Mobile Safari/537.36',
  desktop: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0 Safari/537.36',
}
const DAY = 86400000
const env = (o: Partial<Env>): Env => ({ platform: 'android', standalone: false, mobile: true, hasNativePrompt: true, ...o })
const fresh = { dismissedAt: null, installed: false }

describe('detectPlatform', () => {
  it('classifies browsers', () => {
    expect(detectPlatform({ ua: UA.iosSafari, maxTouchPoints: 5 })).toBe('ios-safari')
    expect(detectPlatform({ ua: UA.iosChrome, maxTouchPoints: 5 })).toBe('ios-other')
    expect(detectPlatform({ ua: UA.iosInsta, maxTouchPoints: 5 })).toBe('ios-inapp')
    expect(detectPlatform({ ua: UA.android, maxTouchPoints: 5 })).toBe('android')
    expect(detectPlatform({ ua: UA.desktop, maxTouchPoints: 0, platform: 'Win32' })).toBe('other')
  })
  it('detects iPadOS pretending to be a Mac', () => {
    expect(detectPlatform({ ua: UA.desktop.replace('Windows NT 10.0; Win64; x64', 'Macintosh; Intel Mac OS X 10_15_7'), maxTouchPoints: 5, platform: 'MacIntel' })).toBe('ios-safari')
  })
})

describe('shouldShowInstall', () => {
  it('shows on a fresh phone visit when it can honestly help', () => {
    expect(shouldShowInstall(env({}), fresh)).toBe(true)
    expect(shouldShowInstall(env({ platform: 'ios-safari', hasNativePrompt: false }), fresh)).toBe(true)
  })
  it('Android without a native install event shows nothing (no fake button)', () => {
    expect(shouldShowInstall(env({ hasNativePrompt: false }), fresh)).toBe(false)
  })
  it('never inside the installed app, on desktop, or once installed', () => {
    expect(shouldShowInstall(env({ standalone: true }), fresh)).toBe(false)
    expect(shouldShowInstall(env({ mobile: false }), fresh)).toBe(false)
    expect(shouldShowInstall(env({}), { dismissedAt: null, installed: true })).toBe(false)
    expect(shouldShowInstall(env({ platform: 'other' }), fresh)).toBe(false)
  })
  it('does not nag: snoozed for 30 days, then asks again', () => {
    const t = 1_700_000_000_000
    expect(shouldShowInstall(env({}), { dismissedAt: t, installed: false }, t + (SNOOZE_DAYS - 1) * DAY)).toBe(false)
    expect(shouldShowInstall(env({}), { dismissedAt: t, installed: false }, t + SNOOZE_DAYS * DAY)).toBe(true)
  })
})
