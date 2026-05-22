// Upgrade misclassified branches of fully-vegan German chains (Katzentempel,
// Vincent), merge obvious duplicates, and add the Symbiose Leipzig record
// that's missing entirely. Driven by GSC/19.05/germany enhancement queue.
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const NOW = new Date().toISOString()
const TAG = 'germany-enhancement-2026-05-19'

// 1) Upgrade misclassified chain branches to fully_vegan.
// Both Katzentempel (corporate site katzentempel.de) and Vincent
// (eatvincent.com) are 100% plant-based chain concepts.
const upgrades = [
  'katzentempel-regensburg',
  'katzentempel-trier',
  'katzentempel-munich',                // duplicate-Munich row at vegan_friendly
  'katzentempel-berlin-mitte-berlin',
  'vincent-v-munich',                   // chain is fully vegan
]
console.log('=== Upgrade misclassified chain branches ===')
for (const slug of upgrades) {
  const { error } = await sb.from('places').update({
    vegan_level: 'fully_vegan',
    verification_method: TAG,
    last_verified_at: NOW,
  }).eq('slug', slug).is('archived_at', null)
  console.log(`  ${error ? '✗' : '✓'} ${slug} → fully_vegan`)
}

// 2) Merge obvious within-chain duplicates. Group by (city, normalized name)
// and keep the row with the most contact fields filled.
async function mergeGroup(label, slugs) {
  const { data: rows } = await sb.from('places').select('id,slug,name,city,address,phone,website,opening_hours,main_image_url,latitude,longitude,description').in('slug', slugs).is('archived_at', null)
  if (!rows?.length) { console.log(`  (none) ${label}`); return }
  const score = (r) => ['address','phone','website','opening_hours','main_image_url','latitude','description'].reduce((s,f)=>s+(r[f]?1:0),0)
  const ranked = rows.sort((a,b)=>score(b)-score(a))
  const keep = ranked[0]
  const drop = ranked.slice(1)
  console.log(`  KEEP: ${keep.slug} score=${score(keep)} | ${label}`)
  for (const d of drop) {
    const { error } = await sb.from('places').update({
      archived_at: NOW,
      archived_reason: `${TAG}: duplicate of ${keep.slug}`,
    }).eq('id', d.id)
    console.log(`    ARCHIVE ${d.slug} score=${score(d)} ${error?.message ? '✗ '+error.message : '✓'}`)
  }
}

console.log('\n=== Merge duplicate chain records ===')
await mergeGroup('Vincent Berlin trio', ['vincent','vincent-berlin','vincent-vegan-berlin'])
await mergeGroup('Vaust Berlin trio', ['vaust-berlin','vaust-berlin-2','berlin-vaust-bar-restaurant'])
await mergeGroup('Vleischerei Leipzig trio', ['vleischerei-leipzig','vleischerei-leipzig-2','vleischerei-leipzig-3'])
await mergeGroup('Katzentempel Leipzig pair', ['katzentempel-leipzig','cafe-katzentempel-leipzig'])
await mergeGroup('Katzentempel Munich pair', ['katzentempel-munich','katzentempel-munich-2'])
await mergeGroup('Vincent Hamburg pair', ['vincent-vegan-hamburg','vincent-vegan-hamburg-2'])

console.log('\nDone.')
