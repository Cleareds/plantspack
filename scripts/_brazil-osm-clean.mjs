import fs from 'node:fs'
const f = '/Users/antonkravchuk/sidep/Cleareds/plantspack/scripts/seo-out/brazil-osm-gap-2026-05-21/candidates.json'
const data = JSON.parse(fs.readFileSync(f))
// Drop Iquitos (Peru) — incorrectly captured by bbox
const cleaned = data.filter(c => c.city !== 'Iquitos')
fs.writeFileSync(f, JSON.stringify(cleaned, null, 2))
console.log(`Cleaned ${data.length}→${cleaned.length} (dropped Iquitos)`)
console.log('Sample:')
for (const c of cleaned.slice(0,10)) console.log(`  ${c.name.padEnd(35)} | ${c.city.padEnd(20)} | website=${c.website||'no'}`)
