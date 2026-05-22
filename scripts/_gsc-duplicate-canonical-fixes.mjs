// One-off fixes for the 4 GSC "duplicate canonical" pages flagged 2026-05-12 → 19.
// Plus the city-alias stragglers spotted while investigating.
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const NOW = new Date().toISOString()
const TAG = 'gsc-canonical-fix-2026-05-19'

const log = (s) => console.log(s)

// ============================================================================
// Fix 1: Differentiate the 5 Max & Benito Wien branches by district.
// Same chain, 5 different locations, all currently named just "Max & Benito" —
// Google has been deduping them. Adding district to name + description.
// ============================================================================
log('=== Fix 1: Max & Benito Wien branch differentiation ===')
const benitoBranches = [
  { slug: 'max-benito-vienna', district: 'Rotenturmstraße (Innere Stadt)', addr: 'Rotenturmstraße 27' },
  { slug: 'max-benito-wien-3', district: 'Wipplingerstraße (Innere Stadt)', addr: 'Wipplingerstraße' },
  { slug: 'max-benito-wien-2', district: 'Landstraße (3rd district)', addr: 'Landstraßer Hauptstraße 1B' },
  { slug: 'max-benito-wien-4', district: 'Mariahilfer Straße (7th district)', addr: 'Mariahilfer Straße 4' },
  { slug: 'max-benito-wien', district: 'Donaustadt (22nd district)', addr: 'Jakov-Lind-Straße' },
]
for (const b of benitoBranches) {
  const name = `Max & Benito — ${b.district}`
  const description = `Max & Benito branch at ${b.addr}, ${b.district}, Vienna. Mexican-Californian chain known for burritos, bowls, tacos and quesadillas; clearly labelled vegan options on most items. Part of a 5-location Vienna chain — this listing is the ${b.district} branch.`
  const { error } = await sb.from('places').update({
    name, description, verification_method: TAG, last_verified_at: NOW
  }).eq('slug', b.slug)
  log(`  ${error ? '✗' : '✓'} ${b.slug} → "${name}" + ${description.length}ch desc`)
}

// ============================================================================
// Fix 2: Enrich descriptions on the 3 other deindexed pages
// ============================================================================
log('\n=== Fix 2: Enrich the 3 other deindexed pages ===')
const enrichments = [
  {
    slug: 'the-hooden-horse-margate',
    description: 'Hungry Horse-chain family pub at Richborough Close in Westwood, Margate. UK pub-chain menu with a few clearly-labelled vegan and vegetarian items - Impossible BBQ sub, falafel burger, roast veggie lasagne. Not a vegan-specialist venue; expect cross-contamination since the kitchen serves meat and fish. Useful as a budget casual option in Margate; daily deals like Curry Wednesday £10 and Sunday roast + pudding £12.',
  },
  {
    slug: 'bell-beans-luneburg',
    description: 'Speciality coffee café in Lüneburg old town at Glockenstraße 1a, opened 2014. Reported fully vegetarian since September 2024; roughly 40-50% of the menu is vegan including croissants, cakes, pastries, and several savoury breakfast options. House-roast coffee plus rotating guest beans, V60 / Aeropress / cold brew. Soy, almond and oat milk available. Open Mon-Fri 8-18, Sat 9-18, Sun 10-18.',
  },
  {
    slug: 'burger-nerds-oberhausen',
    description: 'Independent burger spot at Duisburger Straße 125-131, Oberhausen, with house-made buns, sauces and vegan options. Vegan burger pairs a zucchini patty with vegan yoghurt, iceberg, onion and tomato; the standard menu is mostly meat-based but vegan options are clearly marked. Sides include sweet potato fries and onion rings. Open Tue-Sun, closed Mondays.',
  },
]
for (const e of enrichments) {
  const { error } = await sb.from('places').update({
    description: e.description, verification_method: TAG, last_verified_at: NOW
  }).eq('slug', e.slug)
  log(`  ${error ? '✗' : '✓'} ${e.slug} → ${e.description.length}ch description`)
}

// ============================================================================
// Fix 3: Merge straggler city aliases (München → Munich, Köln → Cologne)
// ============================================================================
log('\n=== Fix 3: Merge straggler city aliases ===')
const aliasMerges = [
  { country: 'Germany', from: 'München', to: 'Munich' },
  { country: 'Germany', from: 'Köln', to: 'Cologne' },
]
for (const m of aliasMerges) {
  const { data: before } = await sb.from('places').select('id').eq('country', m.country).eq('city', m.from).is('archived_at', null)
  if (!before?.length) { log(`  (0) "${m.from}" → "${m.to}": nothing to migrate`); continue }
  const { error } = await sb.from('places').update({ city: m.to }).eq('country', m.country).eq('city', m.from).is('archived_at', null)
  log(`  ${error ? '✗' : '✓'} ${String(before.length).padStart(3)} "${m.from}" → "${m.to}"`)
}

log('\nDone.')
