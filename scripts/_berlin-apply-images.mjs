import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { readFileSync } from 'node:fs'
config({ path: '.env.local' })
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const imgs = JSON.parse(readFileSync('scripts/seo-out/berlin-import-2026-05-15/images.json','utf8'))
function norm(s) { return (s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9]+/g,' ').trim() }
const imgByName = new Map(imgs.filter(i => i.src).map(i => [norm(i.name), i.src]))

// Fetch all berlin-source places that are missing images
const { data: places } = await sb.from('places').select('id,name,main_image_url')
  .eq('source','berlin-google-map-2026-05-15')
console.log(`berlin-source places: ${places?.length}`)
let updated = 0, skipped = 0, nomatch = 0
for (const p of (places||[])) {
  if (p.main_image_url) { skipped++; continue }
  const k = norm(p.name)
  let src = imgByName.get(k)
  if (!src) {
    // Fuzzy: find any key that contains or is contained in k
    for (const [nk, nv] of imgByName.entries()) {
      if (nk.length < 5 || k.length < 5) continue
      if (nk === k || nk.includes(k) || k.includes(nk)) { src = nv; break }
    }
  }
  if (src) {
    const { error } = await sb.from('places').update({ main_image_url: src }).eq('id', p.id)
    if (error) { console.log(`  ERR ${p.name}: ${error.message}`); continue }
    updated++
  } else {
    nomatch++
    console.log(`  no match: ${p.name}`)
  }
}
console.log(`\nUpdated: ${updated}, already had: ${skipped}, unmatched: ${nomatch}`)

// Also apply to duplicates that lack images
const dups = JSON.parse(readFileSync('scripts/seo-out/berlin-import-2026-05-15/duplicates.json','utf8'))
console.log(`\n--- Applying to ${dups.length} duplicates that may lack images ---`)
let dupUpdated = 0, dupSkipped = 0
for (const d of dups) {
  if (d.hasImage) { dupSkipped++; continue }
  const k = norm(d.extracted)
  let src = imgByName.get(k)
  if (!src) {
    for (const [nk, nv] of imgByName.entries()) {
      if (nk.length < 5 || k.length < 5) continue
      if (nk === k || nk.includes(k) || k.includes(nk)) { src = nv; break }
    }
  }
  if (src) {
    const { error } = await sb.from('places').update({ main_image_url: src }).eq('id', d.dbId)
    if (!error) dupUpdated++
  }
}
console.log(`Duplicates updated with image: ${dupUpdated} (skipped ${dupSkipped} that already had image)`)
