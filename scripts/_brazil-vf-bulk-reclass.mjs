// Pattern-based bulk reclassification of Brazilian vegan_friendly places.
// Two conservative passes:
//   1. Mainstream meat/dairy chains + meat-cuisine names → vegan_options
//   2. Vegetarian-named or Hindu/Krishna establishments → mostly_vegan
// Anything not matching either pattern stays at vegan_friendly for a
// follow-up WebSearch audit.
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const NOW = new Date().toISOString()
const TAG = 'brazil-vf-bulk-reclass-2026-05-21'

// Mainstream chain + cuisine names where the Platonic dish is meat/dairy
// or the venue is a known mixed-menu chain. Always downgrade to vegan_options.
const TO_VEGAN_OPTIONS = [
  // Mainstream chains
  /\b(outback|subway|mcdonald|burger king|kfc|starbucks|habib|bob's|bobs|spoleto|giraffas|china in box|pizza hut|domino|dunkin|madero|coco bambu|camar(ões|oes)|jeronimo|johnny rockets|wendy|five guys|popeye|hard rock|t\.?g\.?i\.? friday|hooters|red lobster|olive garden|chili's|chilis|sizzler|denny|ihop)\b/i,
  // Local mixed chains commonly tagged vegan_friendly that shouldn't be
  /\b(bacio di latte|bacio|natural da terra|fran's caf|frans cafe|griletto|galeto|pizza prime|fratello|hot dog brasil|baked potato)\b/i,
  // Cuisine-by-name: places where the headline is meat
  /\b(churrasc|steakhouse|grill\s+(?!veg|vegan|vegano))\b/i,
  /\b(camar(ão|ao) e cia|peixaria|frutos do mar|seafood|fish ?house|sushi (?!vegan|veg\s))\b/i,
  /\b(burgers? \&|burgueria (?!veg|vegan))\b/i,
  /\b(boteco (?!veg|vegan|ouzar))\b/i,
]

// Vegetarian / hindu / krishna / ayurvedic / generic "natural" — vegetarian by
// tradition, has dairy or eggs in the main offering. Downgrade to mostly_vegan.
const TO_MOSTLY_VEGAN = [
  /\b(restaurante\s+vegetarian|vegetarian (?!vegano)|vegetariana)\b/i,
  /\b(govinda|hare\s*krishna|iskcon|harekrishna|ananda marga|ayurv)\b/i,
  /\b(coz?inha (?:natural|integral|vegana e vegetariana))\b/i,
  /\b(restaurante natural|natural restaurante)\b/i,
]

const all = []
let from = 0
while (true) {
  const { data } = await sb.from('places').select('id,slug,name,city,description,address,vegan_level').eq('country','Brazil').eq('vegan_level','vegan_friendly').is('archived_at',null).range(from,from+999)
  if (!data?.length) break
  all.push(...data); if (data.length<1000) break; from+=1000
}
console.log(`Pool: ${all.length} vegan_friendly Brazilian places\n`)

const toOptions = [], toMostly = []
for (const r of all) {
  const hay = `${r.name} ${r.description||''}`
  if (TO_VEGAN_OPTIONS.some(re => re.test(hay))) { toOptions.push(r); continue }
  if (TO_MOSTLY_VEGAN.some(re => re.test(hay))) { toMostly.push(r); continue }
}
console.log(`→ vegan_options (meat-heavy or mainstream chain): ${toOptions.length}`)
for (const r of toOptions.slice(0, 20)) console.log(`  ${r.slug.padEnd(40)} | ${r.name.padEnd(30)} | ${r.city}`)
if (toOptions.length > 20) console.log(`  ... (${toOptions.length-20} more)`)
console.log(`\n→ mostly_vegan (vegetarian-named / dharmic / natural restaurant): ${toMostly.length}`)
for (const r of toMostly.slice(0, 20)) console.log(`  ${r.slug.padEnd(40)} | ${r.name.padEnd(30)} | ${r.city}`)
if (toMostly.length > 20) console.log(`  ... (${toMostly.length-20} more)`)
console.log(`\nKept at vegan_friendly (no pattern match): ${all.length - toOptions.length - toMostly.length}`)

if (process.argv.includes('--apply')) {
  let okOptions = 0, okMostly = 0
  for (let i = 0; i < toOptions.length; i += 50) {
    const chunk = toOptions.slice(i, i+50).map(r => r.id)
    const { error } = await sb.from('places').update({ vegan_level: 'vegan_options', verification_method: TAG, last_verified_at: NOW }).in('id', chunk)
    if (!error) okOptions += chunk.length
  }
  for (let i = 0; i < toMostly.length; i += 50) {
    const chunk = toMostly.slice(i, i+50).map(r => r.id)
    const { error } = await sb.from('places').update({ vegan_level: 'mostly_vegan', verification_method: TAG, last_verified_at: NOW }).in('id', chunk)
    if (!error) okMostly += chunk.length
  }
  console.log(`\n✓ Applied: ${okOptions} → vegan_options, ${okMostly} → mostly_vegan`)
} else {
  console.log('\n(dry-run — pass --apply to write to DB)')
}
