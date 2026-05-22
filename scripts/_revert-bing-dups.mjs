import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
config({ path: '.env.local' })
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

const { data } = await sb.from('places').select('id,name,city,country,main_image_url')
  .like('main_image_url','%images.happycow.net%')
  .in('country',['Turkey','Greece','Italy','Croatia','Portugal','Spain'])
  .eq('vegan_level','fully_vegan').is('archived_at',null)

function norm(s){return (s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9]+/g,' ').trim()}

// Group by hcmp ID
const byId = new Map()
for (const p of data) {
  const m = p.main_image_url.match(/hcmp(\d+)_/)
  if (!m) continue
  const id = m[1]
  if (!byId.has(id)) byId.set(id, [])
  byId.get(id).push(p)
}

// Also load our cross-reference: HappyCow hrefs we collected (link name → slug)
// Slug includes the venue ID at the end
const fs = await import('node:fs')
const hcByName = new Map()
for (const f of fs.readdirSync('scripts/seo-out/coverage-boost-2026-05-15').filter(f => f.endsWith('-happycow.json'))) {
  try {
    const list = JSON.parse(fs.readFileSync(`scripts/seo-out/coverage-boost-2026-05-15/${f}`,'utf8'))
    for (const p of list) {
      const m = (p.href||'').match(/-(\d+)$/)
      if (m) hcByName.set(norm(p.name), m[1])
    }
  } catch {}
}
console.log(`Known HappyCow id mappings from our harvest: ${hcByName.size}`)

let reverted = 0, kept = 0
for (const [hcId, places] of byId) {
  if (places.length === 1) continue
  // The image's hcId belongs to the venue with that HappyCow review ID.
  // Find which of our places' names has that hcId in our cross-reference.
  let correctPlace = null
  for (const p of places) {
    const k = norm(p.name)
    const knownId = hcByName.get(k)
    if (knownId === hcId) { correctPlace = p; break }
  }
  // If none match, keep the image only on the place whose name fuzzy-matches the hcId's likely owner
  // (best-effort: keep the one that doesn't contain a generic word)
  // Simpler: if we can't disambiguate, null everything in the group
  for (const p of places) {
    if (correctPlace && p.id === correctPlace.id) { kept++; continue }
    await sb.from('places').update({ main_image_url: null }).eq('id', p.id)
    reverted++
    console.log(`  - reverted: ${p.name} [${p.city}/${p.country}] (was using hcmp${hcId})`)
  }
}
console.log(`\nReverted ${reverted}, kept ${kept} correct matches.`)
