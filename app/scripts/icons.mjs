// Membuat ikon PNG (PWA + apple-touch-icon) dari brand/damar-kost-icon.svg.
// Jalankan: node scripts/icons.mjs
import { readFileSync, writeFileSync, copyFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { Resvg } from '@resvg/resvg-js'

const here = dirname(fileURLToPath(import.meta.url))
const src = join(here, '..', '..', 'brand', 'damar-kost-icon.svg')
const out = join(here, '..', 'public')
const svg = readFileSync(src, 'utf8')

for (const [name, size] of [['pwa-192.png', 192], ['pwa-512.png', 512], ['apple-touch-icon.png', 180]]) {
  // iOS memberi sudut membulat sendiri → apple-touch-icon dibuat persegi penuh tanpa sudut transparan
  const input = name === 'apple-touch-icon.png' ? svg.replace('rx="112"', 'rx="0"') : svg
  const png = new Resvg(input, { fitTo: { mode: 'width', value: size } }).render().asPng()
  writeFileSync(join(out, name), png)
  console.log('✓', name, size)
}
copyFileSync(src, join(out, 'icon.svg'))
console.log('✓ icon.svg')
