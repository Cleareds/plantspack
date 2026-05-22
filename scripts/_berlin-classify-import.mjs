import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { readFileSync, writeFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
config({ path: '.env.local' })

const newOnes = JSON.parse(readFileSync('scripts/seo-out/berlin-import-2026-05-15/new-to-import.json','utf8'))

function classifyVeganLevel(item) {
  const t = (item.description + ' ' + (item.category || '')).toLowerCase()
  // Explicit fully-vegan signals + no contradicting omnivor/vegetarian word
  if (/100\s*%\s*vegan|alles\s+vegan|purely\s+vegan|vegan only|exclusively vegan|fully vegan/i.test(t)
      && !/omnivor|omnivore|vegetari/.test(t)) return 'fully_vegan'
  if (item.category === 'Vegan' && !/omnivor|omnivore|vegetari/.test(t)) return 'fully_vegan'
  if (/vegi\s*&\s*vegan only/.test(t)) return 'fully_vegan'
  // Omnivor → vegan_options
  if (/omnivor|omnivore/.test(t)) return 'vegan_options'
  // Vegetarian-vegan blend (place advertises both, vegan section is full): mostly_vegan
  // Patterns: "vegan & vegetarian", "vegan and vegetarian", "vegetarian and vegan",
  // "vegetarian, vegan ausgewiesen", "vegan-vegetarian", "Vietnamesisch Vegetarisch" with vegan menu
  if (/vegan\s*[&,]\s*vegetari|vegan\s+and\s+vegetari|vegetari[a-z]*\s*[&,]\s*vegan|vegetari[a-z]*\s+and\s+vegan|vegetari[a-z]*[,\s].*vegan ausgewiesen|vegan[- ]vegetari|vegetarian shuan|vegetarisch.*vegan|vegan.*vegetarisch|mostly vegan/i.test(t)) return 'mostly_vegan'
  // Vegetarian-only mention without "vegan" pairing → vegan_friendly
  if (/vegetari/.test(t)) return 'vegan_friendly'
  return 'vegan_friendly'
}

function mapCategory(cat) {
  if (!cat) return 'eat'
  const c = cat.toLowerCase()
  if (/(store|shop|market|grocer|wholesale|patisserie|bakery|donuts|pastr|cookies|clothing)/.test(c)) return 'store'
  if (/(bar|gay bar|cocktail|tapas bar)/.test(c)) return 'eat' // bars still 'eat' for our schema
  return 'eat'
}

const payloads = newOnes.map(item => {
  const vl = classifyVeganLevel(item)
  const cat = mapCategory(item.category)
  // Description tweak
  const desc = `${item.description || ''}${item.rating ? ` (Google: ${item.rating})` : ''}${item.price ? `, ${item.price}` : ''}`.trim().replace(/^,\s*/, '') || 'Vegan-friendly spot in Berlin, Germany.'
  // Pre-supply address fallback so insert never fails on NOT NULL when Nominatim
  // returns coords but no display_name. Geocoder will still try to refine on top.
  return {
    name: item.name,
    city: 'Berlin',
    country: 'Germany',
    country_code: 'de',
    category: cat,
    vegan_level: vl,
    description: desc.slice(0, 500),
    address: 'Berlin, Germany',
    source: 'berlin-google-map-2026-05-15',
    source_id: `berlin-${item.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')}`,
    tags: ['berlin-google-map-2026-05-15'],
  }
})

console.log('Classification summary:')
const bucket = {}
for (const p of payloads) bucket[p.vegan_level] = (bucket[p.vegan_level] || 0) + 1
for (const [k, v] of Object.entries(bucket)) console.log(`  ${k}: ${v}`)

writeFileSync('scripts/seo-out/berlin-import-2026-05-15/payloads.json', JSON.stringify(payloads, null, 2))
console.log(`\nWrote ${payloads.length} payloads to payloads.json`)
