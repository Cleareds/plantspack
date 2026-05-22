import fs from 'node:fs'
const f = '/Users/antonkravchuk/sidep/Cleareds/plantspack/scripts/seo-out/brazil-osm-gap-2026-05-21/candidates.json'
const data = JSON.parse(fs.readFileSync(f))
const cleaned = data.filter(c => !/FECHADO|CLOSED|FECHOU|fechado/i.test(c.name))
fs.writeFileSync(f, JSON.stringify(cleaned, null, 2))
console.log(`${data.length}→${cleaned.length} (dropped closed)`)
