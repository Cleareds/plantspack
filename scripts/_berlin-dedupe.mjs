import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { readFileSync, writeFileSync } from 'node:fs'
config({ path: '.env.local' })
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

const items = JSON.parse(readFileSync('scripts/seo-out/berlin-import-2026-05-15/extracted.json','utf8'))
const open = items.filter(x => !x.closed)
console.log(`Open candidates: ${open.length}`)

// Paginate Berlin places
const dbPlaces = []
let from = 0
while (true) {
  const { data, error } = await sb.from('places').select('id,name,city,country,vegan_level,is_verified,website,main_image_url,opening_hours,archived_at')
    .eq('country','Germany').eq('city','Berlin').is('archived_at', null)
    .order('id').range(from, from + 999)
  if (error) { console.error(error); process.exit(1) }
  if (!data.length) break
  dbPlaces.push(...data)
  if (data.length < 1000) break
  from += 1000
}
console.log(`Berlin places in DB: ${dbPlaces.length}`)

function norm(s) {
  return (s||'').toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}
const dbByNorm = new Map()
for (const p of dbPlaces) {
  const k = norm(p.name)
  if (k && !dbByNorm.has(k)) dbByNorm.set(k, p)
}

const dup = []
const newOnes = []
for (const item of open) {
  const k = norm(item.name)
  if (!k) continue
  let match = dbByNorm.get(k)
  if (!match) {
    // Fuzzy: substring match (only if >= 6 chars to avoid generic matches)
    for (const p of dbPlaces) {
      const pn = norm(p.name)
      if (pn.length < 6 || k.length < 6) continue
      if (pn === k || pn.includes(k) || k.includes(pn)) { match = p; break }
    }
  }
  if (match) dup.push({ item, match })
  else newOnes.push(item)
}
console.log(`\nDuplicates (already in DB): ${dup.length}`)
console.log(`New to add: ${newOnes.length}`)
writeFileSync('scripts/seo-out/berlin-import-2026-05-15/duplicates.json', JSON.stringify(dup.map(d => ({ extracted: d.item.name, dbMatch: d.match.name, dbId: d.match.id, dbVeganLevel: d.match.vegan_level, dbVerified: d.match.is_verified, hasImage: !!d.match.main_image_url, hasWebsite: !!d.match.website })), null, 2))
writeFileSync('scripts/seo-out/berlin-import-2026-05-15/new-to-import.json', JSON.stringify(newOnes, null, 2))
console.log('\nFiles written.')
