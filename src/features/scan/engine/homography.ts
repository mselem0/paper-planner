/** Planar projective maths on plain arrays. Coordinates: pixel i covers [i, i+1). */

export type Pt = [number, number]
/** 3x3 row-major, h[8] = 1. */
export type Mat3 = [number, number, number, number, number, number, number, number, number]

/** Homography mapping src[i] -> dst[i] for 4 point pairs (null when degenerate). */
export function homography(src: Pt[], dst: Pt[]): Mat3 | null {
  const A: number[][] = []
  for (let i = 0; i < 4; i++) {
    const [x, y] = src[i], [u, v] = dst[i]
    A.push([x, y, 1, 0, 0, 0, -u * x, -u * y, u])
    A.push([0, 0, 0, x, y, 1, -v * x, -v * y, v])
  }
  for (let c = 0; c < 8; c++) {
    let p = c
    for (let r = c + 1; r < 8; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r
    if (Math.abs(A[p][c]) < 1e-12) return null
    ;[A[c], A[p]] = [A[p], A[c]]
    for (let r = 0; r < 8; r++) {
      if (r === c) continue
      const f = A[r][c] / A[c][c]
      if (f !== 0) for (let k = c; k < 9; k++) A[r][k] -= f * A[c][k]
    }
  }
  const h = A.map((row, i) => row[8] / row[i])
  return [...h, 1] as Mat3
}

export function applyH(h: Mat3, x: number, y: number): Pt {
  const w = h[6] * x + h[7] * y + h[8]
  return [(h[0] * x + h[1] * y + h[2]) / w, (h[3] * x + h[4] * y + h[5]) / w]
}

/**
 * Warp `src` into a new RGBA image of size outW x outH, where `toSrc` maps output coords -> source coords.
 * Bilinear sampling; pixels outside the source become white.
 */
export function warp(src: ImageData, toSrc: Mat3, outW: number, outH: number): ImageData {
  const out = new Uint8ClampedArray(outW * outH * 4)
  const { width: sw, height: sh, data } = src
  const [a, b, c, d, e, f, g, h, i] = toSrc
  for (let y = 0; y < outH; y++) {
    const py = y + 0.5
    for (let x = 0; x < outW; x++) {
      const px = x + 0.5
      const w = g * px + h * py + i
      const sx = (a * px + b * py + c) / w - 0.5
      const sy = (d * px + e * py + f) / w - 0.5
      const o = (y * outW + x) * 4
      const x0 = Math.floor(sx), y0 = Math.floor(sy)
      if (x0 < 0 || y0 < 0 || x0 >= sw - 1 || y0 >= sh - 1) {
        out[o] = out[o + 1] = out[o + 2] = 255; out[o + 3] = 255
        continue
      }
      const fx = sx - x0, fy = sy - y0
      const i00 = (y0 * sw + x0) * 4, i10 = i00 + 4, i01 = i00 + sw * 4, i11 = i01 + 4
      const w00 = (1 - fx) * (1 - fy), w10 = fx * (1 - fy), w01 = (1 - fx) * fy, w11 = fx * fy
      out[o] = data[i00] * w00 + data[i10] * w10 + data[i01] * w01 + data[i11] * w11
      out[o + 1] = data[i00 + 1] * w00 + data[i10 + 1] * w10 + data[i01 + 1] * w01 + data[i11 + 1] * w11
      out[o + 2] = data[i00 + 2] * w00 + data[i10 + 2] * w10 + data[i01 + 2] * w01 + data[i11 + 2] * w11
      out[o + 3] = 255
    }
  }
  return makeImageData(out, outW, outH)
}

/** ImageData constructor with a fallback for runtimes (workers/node tests) that lack the global. */
export function makeImageData(data: Uint8ClampedArray, width: number, height: number): ImageData {
  if (typeof ImageData !== 'undefined') return new ImageData(data as Uint8ClampedArray<ArrayBuffer>, width, height)
  return { data, width, height, colorSpace: 'srgb' } as ImageData
}
