import { describe, expect, it } from 'vitest'
import { buildWhatsAppMessage } from './message'

const decode = (url: string | null) => new URL(url!).searchParams.get('text')!

describe('buildWhatsAppMessage', () => {
  it('builds an Arabic message with product, name, note and page', () => {
    const { text, url } = buildWhatsAppMessage({ name: 'رodaina', note: 'نسختين', pageLabel: 'الشهر' }, '201234567890', '2027 Planner')
    expect(text).toBe('أهلاً، عايز أطلب 2027 Planner (البلانر الورقي).\nالاسم: رodaina\nملاحظة: نسختين\n(كنت بشوف صفحة: الشهر)')
    expect(url!.startsWith('https://wa.me/201234567890?text=')).toBe(true)
    expect(decode(url)).toBe(text)
  })

  it('percent-encodes Arabic, newlines, & and # so they cannot break the query string', () => {
    const { text, url } = buildWhatsAppMessage({ note: 'A&B #1 100% = ok?', pageLabel: 'صفحة اليوم' }, '20123', '2027 Planner')
    const query = url!.split('?')[1]
    expect(query.startsWith('text=')).toBe(true)
    expect(query).not.toMatch(/[\s#]|&(?!$)/)
    expect(query).toContain('%0A')
    expect(new URL(url!).searchParams.get('text')).toBe(text)
    expect(decode(url)).toContain('ملاحظة: A&B #1 100% = ok?')
  })

  it('omits name and note lines when empty or whitespace only', () => {
    const { text } = buildWhatsAppMessage({ name: '   ', note: '\n ', pageLabel: 'الغلاف' }, '20123')
    expect(text.split('\n')).toEqual(['أهلاً، عايز أطلب 2027 Planner (البلانر الورقي).', '(كنت بشوف صفحة: الغلاف)'])
    expect(text).not.toContain('الاسم')
    expect(text).not.toContain('ملاحظة')
  })

  it('trims name and note', () => {
    expect(buildWhatsAppMessage({ name: '  منى  ', pageLabel: 'x' }, '1').text).toContain('الاسم: منى\n')
  })

  it('returns url null for an empty or whitespace/non-digit-only number', () => {
    expect(buildWhatsAppMessage({ pageLabel: 'x' }, '').url).toBeNull()
    expect(buildWhatsAppMessage({ pageLabel: 'x' }, '   ').url).toBeNull()
    expect(buildWhatsAppMessage({ pageLabel: 'x' }, '+ - ()').url).toBeNull()
    expect(buildWhatsAppMessage({ pageLabel: 'x' }, '').text).toContain('2027 Planner')
  })

  it('strips non-digit characters from the number', () => {
    const { url } = buildWhatsAppMessage({ pageLabel: 'x' }, '+20 (100) 123-4567')
    expect(url!.startsWith('https://wa.me/201001234567?text=')).toBe(true)
  })
})
