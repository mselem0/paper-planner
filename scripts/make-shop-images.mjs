// Converts the product-preview PNGs into small WebP files under public/shop/.
// Usage: node scripts/make-shop-images.mjs [path/to/bundle/assets]
// Only .webp is written into public/ (the PWA precaches **/*.png, which we want to avoid for these).
import sharp from 'sharp'
import { mkdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

const src = process.argv[2] ?? '/Users/mohamedselem/Downloads/2027-planner-product-preview-bundle-v2/assets'
const out = 'public/shop'
const W = 780, H = 1548, TW = 160
const pages = ['today', 'week', 'month', 'budget', 'year', 'quarter', 'notes']
const jobs = [{ file: join(src, 'cover-2027-planner.png'), name: 'cover' }, ...pages.map((p) => ({ file: join(src, 'pages', `page-${p}.png`), name: p }))]

mkdirSync(out, { recursive: true })
let total = 0
for (const { file, name } of jobs) {
  // Everything is normalised to the book's 780x1548 aspect ratio (the cover is 1080x1920 and gets centre-cropped).
  const base = () => sharp(file).resize(W, H, { fit: 'cover', position: 'centre' })
  const big = join(out, `${name}.webp`), small = join(out, `${name}-thumb.webp`)
  await base().webp({ quality: 78, effort: 6 }).toFile(big)
  await base().resize(TW, Math.round((TW * H) / W)).webp({ quality: 70, effort: 6 }).toFile(small)
  const b = statSync(big).size, t = statSync(small).size
  total += b + t
  console.log(`${name}: ${b} B + thumb ${t} B`)
}
console.log(`total: ${total} B (${(total / 1024).toFixed(1)} KB)`)
