import type { ScanCell, ScanOk } from './engine'

export const WEEK = '2027-01-03'
let n = 0
export const cell = (id: string, kind: ScanCell['kind'], mapsTo: string, value: ScanCell['value'], extra: Partial<ScanCell> = {}): ScanCell =>
  ({ id, kind, mapsTo: mapsTo.replace('DATE', WEEK), value, confidence: 1, uncertain: false, needsReview: false, ...extra, ...(n++ ? {} : {}) })

export function scanOf(cells: ScanCell[]): ScanOk {
  return {
    ok: true, pageId: `P27:1:W:${WEEK}`, page: { raw: `P27:1:W:${WEEK}`, product: 'P27', layout: 1, type: 'W', key: WEEK },
    templateId: 'week.v1', cells, byId: Object.fromEntries(cells.map((c) => [c.id, c])), markers: {},
  }
}
