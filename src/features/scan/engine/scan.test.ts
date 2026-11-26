// @vitest-environment node
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import sharp from 'sharp'
import { describe, expect, it } from 'vitest'
import { parsePageCode, resolveTemplate, scanImageData, type ScanCell, type ScanOk } from './index'
import { makeImageData } from './homography'

const DIR = join(__dirname, '__fixtures__')

async function load(name: string): Promise<ImageData> {
  const { data, info } = await sharp(join(DIR, `${name}.jpg`)).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  return makeImageData(new Uint8ClampedArray(data.buffer, data.byteOffset, data.length), info.width, info.height)
}
const expected = (name: string) =>
  JSON.parse(readFileSync(join(DIR, `${name}.expected.json`), 'utf8')) as { pageId: string; cells: Record<string, boolean | string | null> }

/** value comparison: ground truth for choice-boxes is the picked value, for everything else a boolean. */
const mismatches = (cells: ScanCell[], truth: Record<string, boolean | string | null>) =>
  cells.filter((c) => c.value !== truth[c.id]).map((c) => `${c.id}: want ${truth[c.id]} got ${c.value} ${JSON.stringify(c.ratios ?? c.ratio)}`)

describe('scan engine on simulated photos', () => {
  for (const name of ['clean', 'bad', 'flipped', 'tilt20']) {
    it(`${name}: reads the page code and all 74 cells`, async () => {
      const truth = expected(name)
      const res = scanImageData(await load(name))
      expect(res.ok).toBe(true)
      const ok = res as ScanOk
      expect(ok.pageId).toBe(truth.pageId)
      expect(ok.templateId).toBe('week.v1')
      expect(ok.page).toMatchObject({ layout: 1, type: 'W', key: '2027-01-17' })
      expect(ok.cells).toHaveLength(74)
      expect(Object.keys(truth.cells)).toHaveLength(74)
      expect(mismatches(ok.cells, truth.cells)).toEqual([])
    })
  }

  it('exposes cell metadata, crops and mapsTo paths', async () => {
    const truth = expected('bad')
    const res = scanImageData(await load('bad')) as ScanOk
    const dot = res.byId['habit.0.0']
    expect(dot).toMatchObject({ kind: 'dot', mapsTo: 'weeks[2027-01-17].habits[0].done[0]' })
    expect(dot.confidence).toBeGreaterThan(0.5)
    const lines = res.cells.filter((c) => c.kind === 'text-line')
    expect(lines).toHaveLength(25)
    for (const c of lines) expect(!!c.crop).toBe(truth.cells[c.id] === true)
    const written = lines.find((c) => c.crop)!
    expect(written.crop!.width).toBeGreaterThan(400) // 76 mm at 8 px/mm
    expect(written.needsReview).toBe(true)
    // choice boxes: exactly the 9 groups, never ambiguous on clean ink
    const boxes = res.cells.filter((c) => c.kind === 'choice-boxes')
    expect(boxes).toHaveLength(9)
    expect(boxes.some((b) => b.ambiguous)).toBe(false)
  })

  it('returns the flat page when asked', async () => {
    const res = scanImageData(await load('clean'), { keepFlat: true }) as ScanOk
    expect(res.flat).toMatchObject({ width: 1184, height: 1680 })
  })

  it('reports missing corner markers with their ids', async () => {
    const img = await load('clean')
    const first = scanImageData(img) as ScanOk
    const [cx, cy] = first.markers[0] // paint over marker 0 (top-left)
    const r = Math.round(img.width * 0.03)
    for (let y = Math.round(cy - r); y < cy + r; y++)
      for (let x = Math.round(cx - r); x < cx + r; x++) { const i = (y * img.width + x) * 4; img.data[i] = img.data[i + 1] = img.data[i + 2] = 245 }
    const res = scanImageData(img)
    expect(res).toMatchObject({ ok: false, error: { code: 'markers_missing', missing: [0] } })
  })

  it('fails cleanly on a blank photo and a tiny image', () => {
    const blank = makeImageData(new Uint8ClampedArray(800 * 800 * 4).fill(200), 800, 800)
    expect(scanImageData(blank)).toMatchObject({ ok: false, error: { code: 'markers_missing', missing: [0, 1, 2, 3] } })
    expect(scanImageData(makeImageData(new Uint8ClampedArray(16), 2, 2))).toMatchObject({ ok: false, error: { code: 'bad_image' } })
  })
})

describe('page code / template lookup', () => {
  it('parses P27 codes', () => {
    expect(parsePageCode('P27:1:W:2027-01-17')).toMatchObject({ layout: 1, type: 'W', key: '2027-01-17' })
    expect(parsePageCode('P27:1:N:N-07')?.key).toBe('N-07')
    expect(parsePageCode('https://example.com')).toBeNull()
    expect(parsePageCode('P27:x:W:k')).toBeNull()
  })
  it('rejects unknown layouts and page types', () => {
    expect(resolveTemplate(parsePageCode('P27:1:W:2027-01-17')!)?.id).toBe('week.v1')
    expect(resolveTemplate(parsePageCode('P27:2:W:2027-01-17')!)).toBeNull()
    expect(resolveTemplate(parsePageCode('P27:1:M:2027-01')!)).toBeNull()
  })
})
