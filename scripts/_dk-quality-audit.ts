// Data quality audit for the Denmark osm-import-2026-04 batch.
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

async function main() {
  const env = readFileSync('.env.local', 'utf8').split('\n').reduce((a: any, l) => {
    const m = l.match(/^([A-Z_]+)=(.*)$/); if (m) a[m[1]] = m[2].replace(/^["']|["']$/g, ''); return a
  }, {})
  const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

  const { data: places } = await sb.from('places')
    .select('id, name, slug, city, country, category, vegan_level, address, phone, website, main_image_url, images, description, opening_hours, latitude, longitude, cuisine_types, tags')
    .eq('source', 'osm-import-2026-04')
    .eq('country', 'Denmark')
    .is('archived_at', null)
  if (!places) return
  const total = places.length

  const has = (f: (p: any) => boolean) => places.filter(f).length
  const pct = (n: number) => `${(n / total * 100).toFixed(0)}%`

  const withWebsite = has(p => p.website && p.website.trim())
  const withPhone = has(p => p.phone && p.phone.trim())
  const withAddress = has(p => p.address && p.address.trim().length > 5)
  const withImage = has(p => p.main_image_url || (p.images && p.images.length))
  const withHours = has(p => p.opening_hours && Object.keys(p.opening_hours).length > 0)
  const withDesc = has(p => p.description && p.description.trim().length > 20)
  const withCuisine = has(p => p.cuisine_types && p.cuisine_types.length > 0)
  const withCoords = has(p => p.latitude && p.longitude && Math.abs(p.latitude - 56) < 5 && Math.abs(p.longitude - 11) < 5)
  const dkCoords = has(p => p.latitude && p.latitude >= 54.5 && p.latitude <= 58 && p.longitude >= 8 && p.longitude <= 15.5)

  console.log(`=== Denmark batch quality (osm-import-2026-04, n=${total}) ===\n`)
  console.log(`Coverage of fields:`)
  console.log(`  description       ${withDesc.toString().padStart(4)} / ${total}  (${pct(withDesc)})`)
  console.log(`  website           ${withWebsite.toString().padStart(4)} / ${total}  (${pct(withWebsite)})`)
  console.log(`  phone             ${withPhone.toString().padStart(4)} / ${total}  (${pct(withPhone)})`)
  console.log(`  address           ${withAddress.toString().padStart(4)} / ${total}  (${pct(withAddress)})`)
  console.log(`  image             ${withImage.toString().padStart(4)} / ${total}  (${pct(withImage)})`)
  console.log(`  opening_hours     ${withHours.toString().padStart(4)} / ${total}  (${pct(withHours)})`)
  console.log(`  cuisine_types     ${withCuisine.toString().padStart(4)} / ${total}  (${pct(withCuisine)})`)
  console.log(`  coords (in DK box) ${dkCoords.toString().padStart(3)} / ${total}  (${pct(dkCoords)})`)

  // Vegan-level breakdown
  const lv: Record<string, number> = {}
  for (const p of places) lv[p.vegan_level || 'null'] = (lv[p.vegan_level || 'null'] || 0) + 1
  console.log(`\nVegan-level distribution:`)
  for (const [k, v] of Object.entries(lv).sort((a, b) => b[1] - a[1])) console.log(`  ${k.padEnd(20)} ${v}`)

  // Category breakdown
  const cat: Record<string, number> = {}
  for (const p of places) cat[p.category] = (cat[p.category] || 0) + 1
  console.log(`\nCategory distribution:`)
  for (const [k, v] of Object.entries(cat).sort((a, b) => b[1] - a[1])) console.log(`  ${k.padEnd(20)} ${v}`)

  // Slug uniqueness
  const slugs = places.map(p => p.slug).filter(Boolean)
  const dupes = slugs.filter((s, i) => slugs.indexOf(s) !== i)
  console.log(`\nSlug collisions: ${dupes.length}`)
  if (dupes.length) console.log('  examples:', [...new Set(dupes)].slice(0, 5))

  // City null/missing
  const noCity = has(p => !p.city || !p.city.trim())
  console.log(`\nMissing city: ${noCity}`)
  if (noCity) {
    const examples = places.filter(p => !p.city).slice(0, 5).map(p => p.name)
    console.log('  examples:', examples)
  }

  // Outside DK coords
  const outside = places.filter(p => !(p.latitude >= 54.5 && p.latitude <= 58 && p.longitude >= 8 && p.longitude <= 15.5))
  console.log(`\nOutside DK bounding box (54.5-58 N, 8-15.5 E): ${outside.length}`)
  for (const p of outside.slice(0, 10)) console.log(`  ${p.name} (${p.city}) at ${p.latitude}, ${p.longitude}`)

  // Description length distribution
  const descLens = places.map(p => (p.description || '').length).sort((a, b) => a - b)
  if (descLens.length) {
    const median = descLens[Math.floor(descLens.length / 2)]
    const min = descLens[0]
    const max = descLens[descLens.length - 1]
    console.log(`\nDescription length: min=${min}, median=${median}, max=${max}`)
  }

  // Sample 5 'best' places (have everything)
  const goldenFirst5 = places.filter(p => p.website && p.phone && p.address && p.main_image_url && p.opening_hours && Object.keys(p.opening_hours).length).slice(0, 5)
  console.log(`\nFully-populated places (website + phone + address + image + hours): ${places.filter(p => p.website && p.phone && p.address && p.main_image_url && p.opening_hours && Object.keys(p.opening_hours).length).length} / ${total}`)
  for (const p of goldenFirst5) console.log(`  ${p.name} (${p.city})`)
}
main().catch(e => { console.error(e); process.exit(1) })
