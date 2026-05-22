import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { readFileSync, writeFileSync, readdirSync } from 'node:fs'
config({ path: '.env.local' })
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

// Load all per-city HappyCow files
const dir = 'scripts/seo-out/coverage-boost-2026-05-15'
const files = readdirSync(dir).filter(f => f.endsWith('-happycow.json'))
const candidates = []
for (const f of files) {
  const data = JSON.parse(readFileSync(`${dir}/${f}`, 'utf8'))
  const country = f.startsWith('croatia') ? 'Croatia' : f.startsWith('portugal') ? 'Portugal' : f.startsWith('turkey') ? 'Turkey' : null
  if (!country) continue
  for (const p of data) candidates.push({ ...p, country })
}
console.log(`Total candidates: ${candidates.length}`)
const open = candidates.filter(p => !p.isClosed)
const closed = candidates.filter(p => p.isClosed)
console.log(`  Open: ${open.length}, Closed: ${closed.length}`)

function norm(s) { return (s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9]+/g,' ').trim() }

// Load all DB places for these 3 countries
const dbAll = []
for (const country of ['Croatia','Portugal','Turkey']) {
  let from = 0
  while (true) {
    const { data } = await sb.from('places').select('id,name,city,country,vegan_level,is_verified,website,main_image_url')
      .eq('country', country).is('archived_at', null).order('id').range(from, from + 999)
    if (!data?.length) break
    dbAll.push(...data)
    if (data.length < 1000) break
    from += 1000
  }
}
console.log(`DB places loaded: ${dbAll.length}`)
const dbByNorm = new Map()
for (const p of dbAll) {
  const k = norm(p.name)
  if (k && !dbByNorm.has(k)) dbByNorm.set(k, p)
}

const newOnes = []
const dupOnes = []
for (const c of open) {
  const k = norm(c.name)
  let match = dbByNorm.get(k)
  if (!match) {
    // Fuzzy substring
    for (const p of dbAll) {
      if (p.country !== c.country) continue
      const pn = norm(p.name)
      if (pn.length < 6 || k.length < 6) continue
      if (pn === k || pn.includes(k) || k.includes(pn)) { match = p; break }
    }
  }
  if (match) dupOnes.push({ candidate: c, db: match })
  else newOnes.push(c)
}
console.log(`\nDuplicates: ${dupOnes.length}, New to import: ${newOnes.length}`)
console.log('\nNew by country:')
const byCountry = {}
for (const n of newOnes) byCountry[n.country] = (byCountry[n.country]||0)+1
for (const [k,v] of Object.entries(byCountry)) console.log(`  ${k}: ${v}`)

writeFileSync(`${dir}/all-candidates.json`, JSON.stringify(candidates, null, 2))
writeFileSync(`${dir}/duplicates.json`, JSON.stringify(dupOnes.map(d => ({ extracted: d.candidate.name, city: d.candidate.city, country: d.candidate.country, dbName: d.db.name, dbId: d.db.id, dbLevel: d.db.vegan_level, dbVerified: d.db.is_verified, dbImage: !!d.db.main_image_url })), null, 2))
writeFileSync(`${dir}/new-to-import.json`, JSON.stringify(newOnes, null, 2))

// Build payloads for the new ones
const payloads = newOnes.map(c => ({
  name: c.name,
  city: c.city,
  country: c.country,
  country_code: c.country === 'Croatia' ? 'hr' : c.country === 'Portugal' ? 'pt' : 'tr',
  category: 'eat',
  vegan_level: 'fully_vegan',
  description: `100% vegan venue in ${c.city}, ${c.country}. Listed as vegan-only on HappyCow.`,
  address: c.address || `${c.city}, ${c.country}`,
  phone: c.phone || undefined,
  source: 'coverage-boost-2026-05-15',
  source_id: `${c.country.toLowerCase()}-${norm(c.name).replace(/\s+/g,'-')}`,
  tags: ['coverage-boost-2026-05-15','happycow-vegan'],
}))
writeFileSync(`${dir}/payloads.json`, JSON.stringify(payloads, null, 2))
console.log(`\nWrote ${payloads.length} payloads`)
