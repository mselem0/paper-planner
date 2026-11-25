import { describe, expect, it } from 'vitest'
import { buildPing, changedSinceSend, freshState, localDay, shouldSend, statsEnabled, type StatsState } from './stats'

const base = (o: Partial<StatsState> = {}): StatsState => ({ ...freshState(), deviceId: 'dev-1', ...o })
const input = (state: StatsState, name = 'Rodaina') => ({ state, name, day: '2027-03-04', installed: true, platform: 'android' as const, lang: 'en-US' })

describe('shouldSend', () => {
  it('sends when enabled, not opted out, new day', () => {
    expect(shouldSend({ optOut: false, lastSentDay: null }, '2027-03-04', true)).toBe(true)
    expect(shouldSend({ optOut: false, lastSentDay: '2027-03-03' }, '2027-03-04', true)).toBe(true)
  })
  it('does not send twice the same day', () => expect(shouldSend({ optOut: false, lastSentDay: '2027-03-04' }, '2027-03-04', true)).toBe(false))
  it('does not send when opted out', () => expect(shouldSend({ optOut: true, lastSentDay: null }, '2027-03-04', true)).toBe(false))
  it('does not send when disabled', () => expect(shouldSend({ optOut: false, lastSentDay: null }, '2027-03-04', false)).toBe(false))
})

describe('buildPing', () => {
  it('contains only the allowed fields', () => {
    const p = buildPing(input(base()))
    expect(Object.keys(p).sort()).toEqual(['day', 'deviceId', 'installed', 'lang', 'name', 'platform', 'v'])
    expect(p).toMatchObject({ v: 1, deviceId: 'dev-1', day: '2027-03-04', name: 'Rodaina', installed: true, platform: 'android', lang: 'en-US' })
  })
  it('trims and caps the name', () => {
    expect(buildPing(input(base(), '  Roro  ')).name).toBe('Roro')
    expect(buildPing(input(base(), 'x'.repeat(100))).name).toHaveLength(60)
  })
  it('sends an empty name without consent', () => expect(buildPing(input(base({ shareName: false }))).name).toBe(''))
})

describe('changedSinceSend', () => {
  const st = base({ lastSentDay: '2027-03-04', lastName: 'Roro', lastInstalled: false })
  it('detects name or install change on the same day', () => {
    expect(changedSinceSend(st, buildPing(input(st, 'Rodaina')))).toBe(true)
    expect(changedSinceSend(st, buildPing(input(st, 'Roro')))).toBe(true) // installed false -> true
    expect(changedSinceSend({ ...st, lastInstalled: true }, buildPing(input(st, 'Roro')))).toBe(false)
  })
})

describe('config and dates', () => {
  it('is disabled for an empty url', () => { expect(statsEnabled('')).toBe(false); expect(statsEnabled('https://x/y')).toBe(true) })
  it('formats the local day', () => expect(localDay(new Date(2027, 0, 5))).toBe('2027-01-05'))
})
