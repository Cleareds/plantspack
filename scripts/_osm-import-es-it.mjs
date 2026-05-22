import fs from 'node:fs'
import { spawn } from 'node:child_process'
const data = JSON.parse(fs.readFileSync('scripts/seo-out/osm-vegan-only-2026-05-16/candidates.json'))

const log = 'scripts/seo-out/osm-vegan-only-2026-05-16/import-results.jsonl'
fs.writeFileSync(log, '')

async function importOne(country, code, c) {
  const addr = [c.street, c.housenumber].filter(Boolean).join(' ')
  const fullAddr = [addr, c.postcode, c.city, country].filter(Boolean).join(', ')
  const payload = {
    name: c.name,
    city: c.city || country,
    country,
    country_code: code,
    category: c.amenity === 'cafe' ? 'eat' : 'eat',
    vegan_level: 'fully_vegan',
    address: fullAddr || `${country}`,
    latitude: c.lat,
    longitude: c.lon,
    phone: c.phone,
    website: c.website,
    opening_hours: c.opening_hours,
    cuisine_types: c.cuisine ? c.cuisine.split(';').map(x => x.trim()) : undefined,
    description: `OSM-tagged 100% vegan venue (${c.amenity || 'unknown'}). Imported via OSM cross-reference 2026-05-16.`,
    tags: ['osm_import', 'diet_vegan_only']
  }
  return new Promise(resolve => {
    const child = spawn('npx', ['tsx', 'scripts/add-place.ts', '--imported', '--force-vegan-level'], { stdio: ['pipe', 'pipe', 'pipe'] })
    let out = '', err = ''
    child.stdout.on('data', d => { out += d })
    child.stderr.on('data', d => { err += d })
    child.stdin.write(JSON.stringify(payload))
    child.stdin.end()
    const timer = setTimeout(() => { child.kill('SIGTERM'); resolve({ ok: false, reason: 'timeout' }) }, 60000)
    child.on('exit', code => {
      clearTimeout(timer)
      const ok = /✓\s*Inserted|Public URL/i.test(out) && code === 0
      const urlMatch = out.match(/Public URL:\s*(\S+)/)
      resolve({ ok, url: urlMatch?.[1], err: ok ? null : (err || out).split('\n').slice(-5).join(' | ') })
    })
  })
}

for (const [country, code] of [['Spain', 'es'], ['Italy', 'it']]) {
  const candidates = data[country]
  console.log(`\n=== ${country}: importing ${candidates.length} ===`)
  let ok = 0, fail = 0
  for (let i = 0; i < candidates.length; i++) {
    const c = candidates[i]
    process.stdout.write(`  [${i + 1}/${candidates.length}] ${c.name.slice(0, 40).padEnd(40)} ${c.city || '?'} ... `)
    const r = await importOne(country, code, c)
    if (r.ok) { ok++; console.log('✓') }
    else { fail++; console.log(`✗ ${r.err?.slice(0, 80) || r.reason}`) }
    fs.appendFileSync(log, JSON.stringify({ country, ...c, ...r }) + '\n')
  }
  console.log(`  ${country}: ${ok} ok, ${fail} failed`)
}
