/**
 * Tiny ArUco detector for the four page corner markers (OpenCV DICT_4X4_50, ids 0..3 = TL, TR, BR, BL).
 *
 * Only ids 0-3 are needed, so their 6x6 patterns (incl. black border) are embedded instead of shipping a library.
 * Patterns were generated with cv2.aruco.generateImageMarker(DICT_4X4_50, id, 6); '1' = white cell.
 *
 * Method: adaptive threshold -> connected dark blobs -> convex hull -> 4 corners -> sample the 6x6 grid through a
 * homography -> match the 4 ids in all 4 rotations (Hamming <= 1).
 */
import { applyH, homography, type Pt } from './homography'

const PATTERNS: Record<number, string[]> = {
  0: ['000000', '010110', '001010', '000110', '000100', '000000'],
  1: ['000000', '000000', '011110', '010010', '010100', '000000'],
  2: ['000000', '000110', '000110', '000100', '011010', '000000'],
  3: ['000000', '010010', '010010', '001000', '001100', '000000'],
}

type Grid = number[] // 36 cells, row-major, 1 = white
const toGrid = (rows: string[]): Grid => rows.join('').split('').map(Number)
const rot90 = (g: Grid): Grid => {
  const o = new Array<number>(36)
  for (let r = 0; r < 6; r++) for (let c = 0; c < 6; c++) o[c * 6 + (5 - r)] = g[r * 6 + c]
  return o
}
/** Every id with its 4 rotations. */
const DICT = Object.entries(PATTERNS).map(([id, rows]) => {
  const rots: Grid[] = [toGrid(rows)]
  for (let i = 0; i < 3; i++) rots.push(rot90(rots[i]))
  return { id: Number(id), rots }
})

export interface DetectedMarker { id: number; center: Pt; corners: Pt[]; hamming: number }

/** Gray image -> adaptive "dark" mask (1 = dark). Window mean via integral image. */
function darkMask(gray: Uint8Array, w: number, h: number): Uint8Array {
  const win = Math.max(15, Math.round(Math.min(w, h) / 25)) | 1
  const r = win >> 1
  const I = new Float64Array((w + 1) * (h + 1))
  for (let y = 0; y < h; y++) {
    let row = 0
    for (let x = 0; x < w; x++) {
      row += gray[y * w + x]
      I[(y + 1) * (w + 1) + x + 1] = I[y * (w + 1) + x + 1] + row
    }
  }
  const out = new Uint8Array(w * h)
  for (let y = 0; y < h; y++) {
    const y0 = Math.max(0, y - r), y1 = Math.min(h, y + r + 1)
    for (let x = 0; x < w; x++) {
      const x0 = Math.max(0, x - r), x1 = Math.min(w, x + r + 1)
      const sum = I[y1 * (w + 1) + x1] - I[y0 * (w + 1) + x1] - I[y1 * (w + 1) + x0] + I[y0 * (w + 1) + x0]
      const mean = sum / ((x1 - x0) * (y1 - y0))
      out[y * w + x] = gray[y * w + x] < mean - 12 ? 1 : 0
    }
  }
  return out
}

interface Blob { minX: number; minY: number; maxX: number; maxY: number; area: number }

/** 4-connected component labelling (iterative flood fill). Returns labels and per-blob stats. */
function blobs(mask: Uint8Array, w: number, h: number) {
  const label = new Int32Array(w * h)
  const list: Blob[] = [{ minX: 0, minY: 0, maxX: 0, maxY: 0, area: 0 }]
  const stack = new Int32Array(w * h)
  for (let s = 0; s < w * h; s++) {
    if (!mask[s] || label[s]) continue
    const id = list.length
    const b: Blob = { minX: w, minY: h, maxX: 0, maxY: 0, area: 0 }
    let sp = 0
    stack[sp++] = s; label[s] = id
    while (sp) {
      const p = stack[--sp]
      const x = p % w, y = (p - x) / w
      b.area++
      if (x < b.minX) b.minX = x
      if (x > b.maxX) b.maxX = x
      if (y < b.minY) b.minY = y
      if (y > b.maxY) b.maxY = y
      if (x > 0 && mask[p - 1] && !label[p - 1]) { label[p - 1] = id; stack[sp++] = p - 1 }
      if (x < w - 1 && mask[p + 1] && !label[p + 1]) { label[p + 1] = id; stack[sp++] = p + 1 }
      if (y > 0 && mask[p - w] && !label[p - w]) { label[p - w] = id; stack[sp++] = p - w }
      if (y < h - 1 && mask[p + w] && !label[p + w]) { label[p + w] = id; stack[sp++] = p + w }
    }
    list.push(b)
  }
  return { label, list }
}

const cross = (o: Pt, a: Pt, b: Pt) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])

function hull(pts: Pt[]): Pt[] {
  pts.sort((p, q) => p[0] - q[0] || p[1] - q[1])
  const lo: Pt[] = [], up: Pt[] = []
  for (const p of pts) {
    while (lo.length >= 2 && cross(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop()
    lo.push(p)
  }
  for (let i = pts.length - 1; i >= 0; i--) {
    const p = pts[i]
    while (up.length >= 2 && cross(up[up.length - 2], up[up.length - 1], p) <= 0) up.pop()
    up.push(p)
  }
  lo.pop(); up.pop()
  return lo.concat(up)
}

const polyArea = (p: Pt[]) => {
  let a = 0
  for (let i = 0; i < p.length; i++) { const q = p[(i + 1) % p.length]; a += p[i][0] * q[1] - q[0] * p[i][1] }
  return Math.abs(a) / 2
}
const dist = (a: Pt, b: Pt) => Math.hypot(a[0] - b[0], a[1] - b[1])

/** Four corners of a convex hull: two far-apart points + the farthest hull points either side of their chord. */
function quadFromHull(hp: Pt[]): Pt[] | null {
  if (hp.length < 4) return null
  const cx = hp.reduce((s, p) => s + p[0], 0) / hp.length, cy = hp.reduce((s, p) => s + p[1], 0) / hp.length
  let A = hp[0]
  for (const p of hp) if (Math.hypot(p[0] - cx, p[1] - cy) > Math.hypot(A[0] - cx, A[1] - cy)) A = p
  let B = hp[0]
  for (const p of hp) if (dist(p, A) > dist(B, A)) B = p
  let C: Pt | null = null, D: Pt | null = null, cMax = 0, dMax = 0
  for (const p of hp) {
    const s = cross(A, B, p)
    if (s > cMax) { cMax = s; C = p }
    if (-s > dMax) { dMax = -s; D = p }
  }
  if (!C || !D) return null
  const q = [A, C, B, D]
  const mx = q.reduce((s, p) => s + p[0], 0) / 4, my = q.reduce((s, p) => s + p[1], 0) / 4
  q.sort((p, r) => Math.atan2(p[1] - my, p[0] - mx) - Math.atan2(r[1] - my, r[0] - mx))
  return q
}

/** Read the 6x6 grid inside a candidate quad and match it against ids 0..3. */
function decode(gray: Uint8Array, w: number, h: number, quad: Pt[]): { id: number; hamming: number; corners: Pt[] } | null {
  // order: 4 rotations of the quad do not matter; we sample in quad order and test every grid rotation.
  const H = homography([[0, 0], [6, 0], [6, 6], [0, 6]], quad)
  if (!H) return null
  const at = (u: number, v: number) => {
    const [x, y] = applyH(H, u, v)
    const xi = Math.floor(x), yi = Math.floor(y)
    if (xi < 0 || yi < 0 || xi >= w || yi >= h) return -1
    return gray[yi * w + xi]
  }
  const vals = new Array<number>(36)
  let lo = 255, hi = 0
  for (let r = 0; r < 6; r++) for (let c = 0; c < 6; c++) {
    let s = 0
    for (let dy = 0; dy < 3; dy++) for (let dx = 0; dx < 3; dx++) {
      const g = at(c + 0.25 + dx * 0.25, r + 0.25 + dy * 0.25)
      if (g < 0) return null
      s += g
    }
    const v = s / 9
    vals[r * 6 + c] = v
    if (v < lo) lo = v
    if (v > hi) hi = v
  }
  if (hi - lo < 40) return null
  const thr = (lo + hi) / 2
  const grid = vals.map((v) => (v > thr ? 1 : 0))
  // border must be (almost) all black
  let borderWhite = 0
  for (let i = 0; i < 6; i++) for (const [r, c] of [[0, i], [5, i], [i, 0], [i, 5]]) borderWhite += grid[r * 6 + c]
  if (borderWhite > 2) return null
  let best: { id: number; hamming: number; rot: number } | null = null
  for (const { id, rots } of DICT) {
    rots.forEach((g, rot) => {
      let d = 0
      for (let r = 1; r < 5; r++) for (let c = 1; c < 5; c++) d += g[r * 6 + c] !== grid[r * 6 + c] ? 1 : 0
      if (!best || d < best.hamming) best = { id, hamming: d, rot }
    })
  }
  const b = best as { id: number; hamming: number; rot: number } | null
  if (!b || b.hamming > 1) return null
  return { id: b.id, hamming: b.hamming, corners: quad }
}

/** Detect markers 0..3 in a gray image. Best candidate per id wins. */
export function detectMarkers(gray: Uint8Array, w: number, h: number): Record<number, DetectedMarker> {
  const mask = darkMask(gray, w, h)
  const { label, list } = blobs(mask, w, h)
  const maxSide = Math.max(w, h)
  const found: Record<number, DetectedMarker & { area: number }> = {}
  for (let id = 1; id < list.length; id++) {
    const b = list[id]
    const bw = b.maxX - b.minX + 1, bh = b.maxY - b.minY + 1
    if (bw < 10 || bh < 10 || bw > maxSide * 0.3 || bh > maxSide * 0.3) continue
    const fill = b.area / (bw * bh)
    if (fill < 0.2 || fill > 0.97) continue
    // per-row left/right extremes are enough for the convex hull
    const pts: Pt[] = []
    for (let y = b.minY; y <= b.maxY; y++) {
      let l = -1, r = -1
      for (let x = b.minX; x <= b.maxX; x++) if (label[y * w + x] === id) { if (l < 0) l = x; r = x }
      if (l >= 0) { pts.push([l, y], [l, y + 1], [r + 1, y], [r + 1, y + 1]) }
    }
    const hp = hull(pts)
    const quad = quadFromHull(hp)
    if (!quad) continue
    const qa = polyArea(quad)
    if (qa < 100 || qa / polyArea(hp) < 0.8) continue
    // roughly square: side lengths within 1.8x
    const sides = quad.map((p, i) => dist(p, quad[(i + 1) % 4]))
    if (Math.max(...sides) > 1.8 * Math.min(...sides)) continue
    const m = decode(gray, w, h, quad)
    if (!m) continue
    const prev = found[m.id]
    if (prev && (prev.hamming < m.hamming || (prev.hamming === m.hamming && prev.area >= qa))) continue
    found[m.id] = {
      id: m.id, hamming: m.hamming, area: qa, corners: quad,
      center: [quad.reduce((s, p) => s + p[0], 0) / 4, quad.reduce((s, p) => s + p[1], 0) / 4],
    }
  }
  return found
}
