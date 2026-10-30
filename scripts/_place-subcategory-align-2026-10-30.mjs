// Align places.category / places.subcategory with src/shared/place-categories.ts (2026-10-30).
// Old spellings and cuisine-style types move to the shared list; a cuisine-style type
// (pizzeria, ramen, ...) is kept as an entry in cuisine_types. Live and archived rows.
// UPDATE only. Rollback (prior category/subcategory/cuisine_types per id) is written first.
// Usage: node scripts/_place-subcategory-align-2026-10-30.mjs [--apply]
import fs from 'node:fs'
import { createClient } from '@supabase/supabase-js'
const APPLY = process.argv.includes('--apply')
const env = Object.fromEntries(fs.readFileSync('.env.local', 'utf8').split('\n').filter(l => l.includes('=')).map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]))
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

// 'category/subcategory' -> { category?, subcategory, cuisine? }
const MAP = {
  'eat/fast_food': { subcategory: 'fast-food' },
  'eat/ice-cream': { subcategory: 'ice_cream' },
  'eat/pizzeria': { subcategory: 'restaurant', cuisine: 'pizza' },
  'eat/ramen': { subcategory: 'restaurant', cuisine: 'ramen' },
  'eat/sushi': { subcategory: 'restaurant', cuisine: 'sushi' },
  'eat/tapas': { subcategory: 'restaurant', cuisine: 'tapas' },
  'eat/brasserie': { subcategory: 'restaurant' },
  'eat/bistro': { subcategory: 'restaurant' },
  'eat/foodbar': { subcategory: 'restaurant' },
  'eat/coffee_shop': { subcategory: 'cafe' },
  'eat/lunch_bar': { subcategory: 'cafe' },
  'eat/chocolatier': { subcategory: 'cafe' },
  'eat/wine_bar': { subcategory: 'bar' },
  'eat/gelateria': { subcategory: 'ice_cream', cuisine: 'gelato' },
  'eat/dessert': { subcategory: 'ice_cream' },
  'eat/burger': { subcategory: 'fast-food', cuisine: 'burger' },
  'eat/burger_joint': { subcategory: 'fast-food', cuisine: 'burger' },
  'eat/takeaway': { subcategory: 'fast-food' },
  'eat/fast_casual': { subcategory: 'fast-food' },
  'eat/friture': { subcategory: 'fast-food', cuisine: 'friture' },
  'eat/catering': { subcategory: 'caterer' },
  'store/health_food': { subcategory: 'health-food' },
  'store/health_food_store': { subcategory: 'health-food' },
  'store/supermarket': { subcategory: 'grocery' },
  'store/zero_waste': { subcategory: 'grocery' },
  'store/shop': { subcategory: 'other_shop' },
  'store/chocolate_shop': { subcategory: 'specialty' },
  'hotel/boutique_hotel': { subcategory: 'hotel' },
  'hotel/lodge': { subcategory: 'hotel' },
  'hotel/glamping': { subcategory: 'eco-lodge' },
  'hotel/ecohotel': { subcategory: 'eco-lodge' },
  'hotel/camp': { subcategory: 'eco-lodge' },
  'hotel/boutique_apartments': { subcategory: 'apartment' },
  'hotel/beach_resort': { subcategory: 'resort' },
  'organisation/animal_rescue': { subcategory: 'companion-rescue' },
  'organisation/animal_advocacy': { subcategory: 'advocacy' },
  'event/expo': { subcategory: 'conference' },
  'event/vegfest': { subcategory: 'festival' },
  'other/companion-rescue': { category: 'organisation', subcategory: 'companion-rescue' },
  'other/other_shop': { category: 'store', subcategory: 'other_shop' },
  'community/restaurant': { category: 'eat', subcategory: 'restaurant' },
}

const rows = []
for (const key of Object.keys(MAP)) {
  const [category, subcategory] = key.split('/')
  const { data, error } = await sb.from('places').select('id,slug,category,subcategory,cuisine_types,archived_at').eq('category', category).eq('subcategory', subcategory).limit(1000)
  if (error) throw error
  rows.push(...data.map(r => ({ ...r, key })))
}
const counts = {}
for (const r of rows) counts[r.key] = (counts[r.key] || 0) + 1
console.log(counts)
console.log(`${rows.length} rows (${rows.filter(r => !r.archived_at).length} live)`)
if (!APPLY) { console.log('DRY RUN'); process.exit(0) }

fs.mkdirSync('reports/place-subcategory-align-2026-10-30', { recursive: true })
fs.writeFileSync('reports/place-subcategory-align-2026-10-30/rollback.json', JSON.stringify(rows.map(({ id, slug, category, subcategory, cuisine_types }) => ({ id, slug, category, subcategory, cuisine_types })), null, 1))
for (const r of rows) {
  const m = MAP[r.key]
  const update = { subcategory: m.subcategory, ...(m.category ? { category: m.category } : {}) }
  if (m.cuisine && !(r.cuisine_types || []).includes(m.cuisine)) update.cuisine_types = [...(r.cuisine_types || []), m.cuisine]
  const { error } = await sb.from('places').update(update).eq('id', r.id)
  if (error) throw new Error(`${r.slug}: ${error.message}`)
}
console.log(`updated ${rows.length}; rollback reports/place-subcategory-align-2026-10-30/rollback.json`)
