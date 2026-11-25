import sharp from 'sharp'
import { mkdirSync, writeFileSync } from 'node:fs'

const star = (cx, cy, R, r, n = 8) => Array.from({ length: n * 2 }, (_, i) => {
  const a = (Math.PI * i) / n - Math.PI / 2
  const rad = i % 2 ? r : R
  return `${(cx + rad * Math.cos(a)).toFixed(1)},${(cy + rad * Math.sin(a)).toFixed(1)}`
}).join(' ')

const svg = (maskable) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
<rect width="512" height="512" ${maskable ? '' : 'rx="104"'} fill="#fefef6"/>
<rect x="${maskable ? 0 : 18}" y="${maskable ? 0 : 18}" width="${maskable ? 512 : 476}" height="${maskable ? 512 : 476}" ${maskable ? '' : 'rx="90"'} fill="none" stroke="#dee7f4" stroke-width="${maskable ? 0 : 6}"/>
<text x="256" y="330" text-anchor="middle" font-family="Arial Black, Impact, Helvetica, sans-serif" font-weight="900" font-size="230" fill="#5b78bd">27</text>
<polygon points="${star(390, 140, 78, 52)}" fill="#c0262d" stroke="#fefef6" stroke-width="8" stroke-linejoin="round"/>
<circle cx="390" cy="140" r="16" fill="#fefef6"/>
</svg>`

mkdirSync('public', { recursive: true })
writeFileSync('public/favicon.svg', svg(false))
for (const [name, size, mask] of [['icon-192.png', 192, false], ['icon-512.png', 512, false], ['icon-maskable-512.png', 512, true], ['apple-touch-icon.png', 180, true]]) {
  await sharp(Buffer.from(svg(mask))).resize(size, size).png().toFile(`public/${name}`)
}
console.log('icons ok')
