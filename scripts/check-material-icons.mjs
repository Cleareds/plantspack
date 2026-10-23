// Fails if the code uses a Material Symbols icon that is missing from the subset in
// src/app/layout.tsx (MATERIAL_SYMBOLS_ICONS). A missing name renders as a blank box.
// Usage: node scripts/check-material-icons.mjs
import { readFileSync, readdirSync, statSync } from 'fs'
import { join } from 'path'
const files = []
const walk = d => { for (const f of readdirSync(d)) { const p = join(d, f); statSync(p).isDirectory() ? walk(p) : /\.(tsx?|jsx?)$/.test(f) && files.push(p) } }
walk('src')
const layout = readFileSync('src/app/layout.tsx', 'utf8')
const subset = new Set((layout.match(/MATERIAL_SYMBOLS_ICONS = '([^']+)'/) || [, ''])[1].split(','))
const used = new Set()
for (const f of files) {
  const s = readFileSync(f, 'utf8')
  for (const m of s.matchAll(/material-symbols-outlined[^>]*>\s*([a-z][a-z0-9_]*)\s*</g)) used.add(m[1])
  for (const m of s.matchAll(/\b(?:icon|activeIcon|iconName)\s*[:=]\s*['"]([a-z][a-z0-9_]*)['"]/g)) used.add(m[1])
  if (s.includes('material-symbols-outlined') || f.endsWith('lib/nav.ts'))
    for (const m of s.matchAll(/\?\s*['"]([a-z]+_[a-z0-9_]+)['"]\s*:\s*['"]([a-z]+_[a-z0-9_]+)['"]/g)) { used.add(m[1]); used.add(m[2]) }
}
const missing = [...used].filter(n => !subset.has(n)).sort()
const sorted = [...subset].join(',') === [...subset].sort().join(',')
if (!sorted) console.log('MATERIAL_SYMBOLS_ICONS must be alphabetical')
if (missing.length) console.log('Missing from the subset (add to MATERIAL_SYMBOLS_ICONS, keep alphabetical):\n  ' + missing.join('\n  '))
console.log(`${used.size} icon names found in code, ${subset.size} in the subset`)
process.exit(missing.length || !sorted ? 1 : 0)
