/**
 * Scan engine entry points. Pipeline (SPEC §9 steps 2-5, mirrors docs/print-scan/tools/read_scan.py):
 *   markers -> homography -> flat page @ 8 px/mm -> QR -> template -> ink mask -> per-field reading.
 * `scanImageData` is pure and synchronous (safe inside a Web Worker); `scanPage` accepts any browser image source.
 */
import jsQR from 'jsqr'
import { detectMarkers } from './aruco'
import { PX_PER_MM, crop, readCells } from './cells'
import { homography, makeImageData, warp, type Pt } from './homography'
import { inkMask, toGray } from './ink'
import { allTemplates, parsePageCode, resolveTemplate } from './templates'
import type { PageTemplate, ScanFail, ScanOptions, ScanResult } from './types'

const DETECT_MAX_SIDE = 1600
const fail = (code: ScanFail['error']['code'], message: string, extra: Partial<ScanFail['error']> = {}): ScanFail =>
  ({ ok: false, error: { code, message, ...extra } })

/** Box-downscale a gray image by an integer factor. */
function downscale(gray: Uint8Array, w: number, h: number, k: number) {
  if (k <= 1) return { gray, w, h }
  const nw = Math.floor(w / k), nh = Math.floor(h / k)
  const out = new Uint8Array(nw * nh)
  for (let y = 0; y < nh; y++) for (let x = 0; x < nw; x++) {
    let s = 0
    for (let dy = 0; dy < k; dy++) for (let dx = 0; dx < k; dx++) s += gray[(y * k + dy) * w + x * k + dx]
    out[y * nw + x] = s / (k * k)
  }
  return { gray: out, w: nw, h: nh }
}

function flatten(img: ImageData, tpl: PageTemplate, centers: Pt[]): ImageData | null {
  const [Wmm, Hmm] = tpl.page_size_mm
  const dst = tpl.markers.items.map((m) => [m.center[0] * PX_PER_MM, m.center[1] * PX_PER_MM] as Pt)
  const toSrc = homography(dst, centers) // page px -> photo px
  return toSrc ? warp(img, toSrc, Math.round(Wmm * PX_PER_MM), Math.round(Hmm * PX_PER_MM)) : null
}

function readQr(flat: ImageData, tpl: PageTemplate): string | null {
  const q = tpl.qr
  for (const pad of [6, 10]) {
    const c = crop(flat, q.x - pad, q.y - pad, q.size + 2 * pad, q.size + 2 * pad)
    const r = jsQR(c.data, c.width, c.height, { inversionAttempts: 'dontInvert' })
    if (r?.data) return r.data
  }
  return null
}

export function scanImageData(img: ImageData, opts: ScanOptions = {}): ScanResult {
  if (!img || img.width < 200 || img.height < 200) return fail('bad_image', 'The photo is too small to read.')

  const k = Math.max(1, Math.ceil(Math.max(img.width, img.height) / DETECT_MAX_SIDE))
  const small = downscale(toGray(img), img.width, img.height, k)
  const found = detectMarkers(small.gray, small.w, small.h)
  const missing = [0, 1, 2, 3].filter((i) => !found[i])
  if (missing.length) {
    return fail('markers_missing', `Corner markers not found: ${missing.join(', ')}. The whole page must be in the photo.`, { missing })
  }
  const markers: Record<number, [number, number]> = {}
  const centers: Pt[] = [0, 1, 2, 3].map((i) => {
    const c: Pt = [found[i].center[0] * k, found[i].center[1] * k]
    markers[i] = c
    return c
  })

  // The page type (hence QR position) is unknown until the QR is read: try every registered template's geometry.
  let raw: string | null = null
  let flat: ImageData | null = null
  let flatFor: PageTemplate | null = null
  for (const { template } of allTemplates()) {
    flat = flatten(img, template, centers)
    if (flat && (raw = readQr(flat, template))) { flatFor = template; break }
  }
  if (!raw || !flat || !flatFor) return fail('qr_unreadable', 'Page code (QR) unreadable: retake the photo closer and with less glare.')

  const page = parsePageCode(raw)
  const hit = page && resolveTemplate(page)
  if (!page || !hit) return fail('template_unsupported', 'This page version is not supported by this app.', { pageId: raw })
  const tpl = hit.template
  // Different template geometry (marker centres / page size) than the probe: re-warp with the right one.
  if (tpl !== flatFor) {
    const re = flatten(img, tpl, centers)
    if (!re) return fail('bad_image', 'Could not flatten the page.')
    flat = re
  }

  const { ink } = inkMask(flat, tpl.thresholds)
  const cells = readCells(flat, ink, tpl, { cropAll: opts.cropAll })
  return {
    ok: true, pageId: page.raw, page, templateId: hit.id, cells,
    byId: Object.fromEntries(cells.map((c) => [c.id, c])), markers,
    ...(opts.keepFlat ? { flat } : {}),
  }
}

export type ScanSource = ImageBitmap | HTMLImageElement | ImageData

const MAX_SIDE = 3200

/** Browser image source -> ImageData, capped at MAX_SIDE on the long edge (12 MP phone photos stay manageable). */
export function toImageData(src: ScanSource): ImageData {
  if (typeof ImageData !== 'undefined' && src instanceof ImageData) return src
  const el = src as ImageBitmap | HTMLImageElement
  const sw = 'naturalWidth' in el ? el.naturalWidth : el.width
  const sh = 'naturalHeight' in el ? el.naturalHeight : el.height
  const s = Math.min(1, MAX_SIDE / Math.max(sw, sh))
  const w = Math.round(sw * s), h = Math.round(sh * s)
  const canvas = typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(w, h) : Object.assign(document.createElement('canvas'), { width: w, height: h })
  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null
  if (!ctx) return makeImageData(new Uint8ClampedArray(4), 1, 1)
  ctx.drawImage(el, 0, 0, w, h)
  return ctx.getImageData(0, 0, w, h)
}

export async function scanPage(image: ScanSource, opts: ScanOptions = {}): Promise<ScanResult> {
  return scanImageData(toImageData(image), opts)
}

/** Crop ImageData -> PNG data URL for <img src> in the review screen (needs a DOM canvas). */
export function cropToDataUrl(c: ImageData): string {
  const canvas = document.createElement('canvas')
  canvas.width = c.width; canvas.height = c.height
  canvas.getContext('2d')!.putImageData(c, 0, 0)
  return canvas.toDataURL('image/png')
}
