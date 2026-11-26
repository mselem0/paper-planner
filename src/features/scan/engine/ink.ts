/** Lighting normalisation + ink thresholding (port of read_scan.py: divide by local background, keep only dark ink). */
import type { PageTemplate } from './types'

const BLOCK = 16 // px (2 mm at 8 px/mm)
const PCT = 0.85 // paper-brightness percentile inside a block
const REACH = 2 // blocks; max-filter radius -> ~10 mm window, wider than a filled dot

/** RGBA -> luma. */
export function toGray(img: ImageData): Uint8Array {
  const { data, width, height } = img
  const g = new Uint8Array(width * height)
  for (let i = 0, p = 0; i < g.length; i++, p += 4) g[i] = (data[p] * 77 + data[p + 1] * 150 + data[p + 2] * 29) >> 8
  return g
}

/** Background (paper) brightness per pixel, from block percentiles -> max filter -> box blur -> bilinear lookup. */
function backgroundField(gray: Uint8Array, w: number, h: number) {
  const bx = Math.ceil(w / BLOCK), by = Math.ceil(h / BLOCK)
  const pct = new Float32Array(bx * by)
  const hist = new Uint32Array(256)
  for (let j = 0; j < by; j++) for (let i = 0; i < bx; i++) {
    hist.fill(0)
    let n = 0
    for (let y = j * BLOCK; y < Math.min(h, (j + 1) * BLOCK); y++)
      for (let x = i * BLOCK; x < Math.min(w, (i + 1) * BLOCK); x++) { hist[gray[y * w + x]]++; n++ }
    let acc = 0, v = 0
    for (; v < 255; v++) { acc += hist[v]; if (acc >= n * PCT) break }
    pct[j * bx + i] = v
  }
  const mx = new Float32Array(bx * by)
  for (let j = 0; j < by; j++) for (let i = 0; i < bx; i++) {
    let m = 0
    for (let dj = -REACH; dj <= REACH; dj++) for (let di = -REACH; di <= REACH; di++) {
      const jj = j + dj, ii = i + di
      if (jj >= 0 && jj < by && ii >= 0 && ii < bx) m = Math.max(m, pct[jj * bx + ii])
    }
    mx[j * bx + i] = m
  }
  const bl = new Float32Array(bx * by)
  for (let j = 0; j < by; j++) for (let i = 0; i < bx; i++) {
    let s = 0, n = 0
    for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
      const jj = j + dj, ii = i + di
      if (jj >= 0 && jj < by && ii >= 0 && ii < bx) { s += mx[jj * bx + ii]; n++ }
    }
    bl[j * bx + i] = s / n
  }
  return (x: number, y: number) => {
    const fx = Math.min(bx - 1, Math.max(0, x / BLOCK - 0.5)), fy = Math.min(by - 1, Math.max(0, y / BLOCK - 0.5))
    const i0 = Math.floor(fx), j0 = Math.floor(fy), i1 = Math.min(bx - 1, i0 + 1), j1 = Math.min(by - 1, j0 + 1)
    const tx = fx - i0, ty = fy - j0
    return (bl[j0 * bx + i0] * (1 - tx) + bl[j0 * bx + i1] * tx) * (1 - ty) + (bl[j1 * bx + i0] * (1 - tx) + bl[j1 * bx + i1] * tx) * ty
  }
}

/** Binary ink mask of the flat page: 1 = pen ink. The light guide colour (#b4c0e2, luma ~190) falls out. */
export function inkMask(flat: ImageData, th: PageTemplate['thresholds']): { ink: Uint8Array; w: number; h: number } {
  const { width: w, height: h } = flat
  const gray = toGray(flat)
  const bg = backgroundField(gray, w, h)
  const ink = new Uint8Array(w * h)
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const b = Math.max(40, bg(x + 0.5, y + 0.5))
    ink[y * w + x] = Math.min(255, (gray[y * w + x] * 255) / b) < th.ink_gray_max ? 1 : 0
  }
  return { ink, w, h }
}
