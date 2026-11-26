import type { ScanSource } from './engine'

/** Decode a photo file (EXIF-rotated where the browser supports it) into something the scan engine accepts. */
export async function decodeImage(file: Blob): Promise<ScanSource> {
  if (typeof createImageBitmap === 'function') {
    try { return await createImageBitmap(file) } catch { /* fall through to <img> */ }
  }
  const url = URL.createObjectURL(file)
  try {
    const img = new Image()
    img.src = url
    await img.decode()
    return img
  } finally { URL.revokeObjectURL(url) }
}
