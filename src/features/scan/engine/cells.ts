/** Per-field reading on the flat page (port of read_scan.py). All geometry in template mm, 8 px/mm. */
import { makeImageData } from './homography'
import type { PageTemplate, ScanCell, TemplateField } from './types'

export const PX_PER_MM = 8
const SYMBOL_MIN_RATIO = 0.06
const LINE_MIN_RATIO = 0.01
const clamp01 = (v: number) => Math.max(0, Math.min(1, v))

/** 0.5 right at the threshold, 1 when >= 40% of the threshold away from it; below 1 is "uncertain". */
function margin(ratio: number, threshold: number): { confidence: number; uncertain: boolean } {
  const d = clamp01(Math.abs(ratio - threshold) / (0.4 * threshold))
  return { confidence: 0.5 + 0.5 * d, uncertain: d < 1 }
}

export function crop(flat: ImageData, x: number, y: number, w: number, h: number): ImageData {
  const x0 = Math.max(0, Math.round(x * PX_PER_MM)), y0 = Math.max(0, Math.round(y * PX_PER_MM))
  const x1 = Math.min(flat.width, Math.round((x + w) * PX_PER_MM)), y1 = Math.min(flat.height, Math.round((y + h) * PX_PER_MM))
  const cw = Math.max(1, x1 - x0), ch = Math.max(1, y1 - y0)
  const out = new Uint8ClampedArray(cw * ch * 4)
  for (let r = 0; r < ch; r++) {
    const s = ((y0 + r) * flat.width + x0) * 4
    out.set(flat.data.subarray(s, s + cw * 4), r * cw * 4)
  }
  return makeImageData(out, cw, ch)
}

export function readCells(
  flat: ImageData, ink: Uint8Array, tpl: PageTemplate, opts: { cropAll?: boolean } = {},
): ScanCell[] {
  const W = flat.width, H = flat.height
  const th = tpl.thresholds

  const ratioCircle = (cx: number, cy: number, r: number) => {
    const ccx = Math.trunc(cx * PX_PER_MM), ccy = Math.trunc(cy * PX_PER_MM), rad = Math.trunc(r * PX_PER_MM * 0.8)
    let on = 0, n = 0
    for (let y = Math.max(0, ccy - rad); y <= Math.min(H - 1, ccy + rad); y++)
      for (let x = Math.max(0, ccx - rad); x <= Math.min(W - 1, ccx + rad); x++)
        if ((x - ccx) ** 2 + (y - ccy) ** 2 <= rad * rad) { n++; on += ink[y * W + x] }
    return n ? on / n : 0
  }
  const ratioRect = (x: number, y: number, w: number, h: number, shrink = 0.15) => {
    const x0 = Math.trunc((x + w * shrink) * PX_PER_MM), x1 = Math.trunc((x + w - w * shrink) * PX_PER_MM)
    const y0 = Math.trunc((y + h * shrink) * PX_PER_MM), y1 = Math.trunc((y + h - h * shrink) * PX_PER_MM)
    let on = 0, n = 0
    for (let yy = Math.max(0, y0); yy < Math.min(H, y1); yy++)
      for (let xx = Math.max(0, x0); xx < Math.min(W, x1); xx++) { n++; on += ink[yy * W + xx] }
    return n ? on / n : 0
  }
  const round = (v: number, d: number) => Math.round(v * 10 ** d) / 10 ** d

  return tpl.fields.map((f: TemplateField): ScanCell => {
    const base = { id: f.id, kind: f.kind, mapsTo: f.maps_to }
    switch (f.kind) {
      case 'dot': {
        const r = ratioCircle(f.cx, f.cy, f.r)
        const m = margin(r, th.dot_filled_min_ratio)
        return { ...base, value: r >= th.dot_filled_min_ratio, ratio: round(r, 3), ...m, needsReview: m.uncertain }
      }
      case 'choice-boxes': {
        const ratios: Record<string, number> = {}
        for (const b of f.boxes) ratios[b.value] = ratioRect(b.x, b.y, b.s, b.s)
        const picked = Object.keys(ratios).filter((v) => ratios[v] >= th.box_filled_min_ratio)
        const ambiguous = picked.length > 1
        // closest-to-threshold box decides how sure we are
        const worst = Object.values(ratios).map((r) => margin(r, th.box_filled_min_ratio))
        const confidence = Math.min(...worst.map((m) => m.confidence)) * (ambiguous ? 0.5 : 1)
        const rounded = Object.fromEntries(Object.entries(ratios).map(([k, v]) => [k, round(v, 3)]))
        return {
          ...base, value: picked.length === 1 ? picked[0] : null, ambiguous, ratios: rounded,
          confidence, uncertain: ambiguous || worst.some((m) => m.uncertain),
          needsReview: ambiguous || worst.some((m) => m.uncertain),
        }
      }
      case 'symbol-circle': {
        const r = ratioCircle(f.cx, f.cy, f.r)
        const marked = r >= SYMBOL_MIN_RATIO
        const m = margin(r, SYMBOL_MIN_RATIO)
        const cell: ScanCell = {
          ...base, value: marked, ratio: round(r, 3), confidence: m.confidence,
          uncertain: m.uncertain,
          // which symbol was drawn is not decided on-device: a mark always needs a human look
          needsReview: marked || m.uncertain,
        }
        if (marked || opts.cropAll) cell.crop = crop(flat, f.cx - f.r - 0.5, f.cy - f.r - 0.5, 2 * f.r + 1, 2 * f.r + 1)
        return cell
      }
      default: { // text-line, amount
        const r = ratioRect(f.x, f.y, f.w, f.h, 0.05)
        const has = r >= LINE_MIN_RATIO
        const m = margin(r, LINE_MIN_RATIO)
        const cell: ScanCell = { ...base, value: has, ratio: round(r, 4), confidence: m.confidence, uncertain: m.uncertain, needsReview: has || m.uncertain }
        if (has || opts.cropAll) cell.crop = crop(flat, f.x, f.y - 1, f.w, f.h + 1)
        return cell
      }
    }
  })
}
