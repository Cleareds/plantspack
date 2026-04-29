// Apply vegan_level demotions for the 118 likely-real mislabels found in
// reports/likely-real-mislabels.csv. Plus Macedonia -> North Macedonia migrate
// and Cyrillic city/name translations.
//
// Conservative judgement applied by allowlist + per-row classification:
//   ALLOWLIST_KEEP - well-known vegan brands; menu mentions meats only as
//                    labels for vegan versions. Do not demote.
//   VEGETARIAN     - "vegetarian" in name -> mostly_vegan
//   default        -> vegan_options (clear omnivore restaurants with vegan items)

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { readFileSync } from 'fs'
config({ path: '.env.local' })

// Place IDs of well-known fully-vegan brands that triggered web hits because
// they label vegan versions of dishes with the original meat names ("vegan
// bacon", "vegan chicken"). Verified from public sources.
const ALLOWLIST_KEEP = new Set<string>([
  // Mildreds, London - confirmed fully vegan chain since 2016
  '4e17f1d2-c1d0-4316-b4d0-f0e258764a05',
  '0f1c9dae-fea5-447e-b5d0-ec3c1806d3de',
  '77308777-6a18-49d4-b450-0db90911c289',
  'dc021c65-da46-4767-9cc3-7efec64a06a2',
  '0b3d3ec9-1f6b-4d58-b9e5-5fd4512e3bff',
  // Aujourd'hui Demain - confirmed vegan Paris
  '924428fa-dec8-42b8-b2f1-a4ec48f2c2ce',
  // Loving Hut - international vegan chain
  '755ac16d-160b-43f2-b033-1860cc0b289a',
  // The Butcher's Son - vegan butcher in Berkeley (URL: thebutchersveganson.com)
  '43b4e88a-a533-47db-8ed5-c2d3fe7be12f',
  // Meatless District - Amsterdam vegan
  '95121ef9-c542-4189-a52b-6d6958700f1b',
  // Fiction Kitchen - Raleigh vegan/vegetarian
  'a06d1177-43df-4be5-9452-40dcc22e2611',
  // Kale My Name - Chicago vegan (oysters = oyster mushrooms)
  '7142f6ab-4d35-49a7-acbb-9c03538603fc',
  // Reverie Brooklyn - vegan
  '25f4d189-2b86-4d86-85ef-6cb5591525e7',
  // VX Bristol - confirmed fully vegan punk venue
  'bb5ff7a3-20d6-4cfc-9fd4-883cfae29021',
  // nooch. Windsor - "nooch" = nutritional yeast, fully vegan
  '1640e430-a51c-407f-991b-3af1b8bba230',
  // Bodhi NYC - kosher vegan
  'e1b798d1-f08d-4527-9f9e-21041130c177',
  // Vegreen 2 Go - "veg" in name, vegan
  '6b485407-38e7-4eda-8c70-b6bf0d580fd0',
  // Satdha Santa Monica - vegan Thai
  'b5cd453f-8d70-478e-9141-fd67b33717f6',
  // Mon Epicerie Paris - vegan grocery
  'c9a80eb8-ab17-48e2-8ad1-1ac12a67876f',
  // Seed To Sprout - vegan/vegetarian (NJ)
  '8b47c773-ce9b-40e4-84b3-e80d1b78f02f',
])

// Vegetarian-not-vegan: demote to mostly_vegan rather than vegan_options.
const VEGETARIAN_DEMOTE = new Set<string>([
  '76f94ede-fdd5-48de-a3d7-ec6eb289df4e', // Caibreeze Vegetarian Cafe
  '91348e76-0748-41d2-8589-38d88c6b0d81', // Teapot Vegetarian House
])

interface Row { id: string, name: string, city: string, country: string, top_hits: string }

function parseCsv(path: string): Row[] {
  const lines = readFileSync(path, 'utf8').split('\n').filter(Boolean)
  const header = lines[0].split(',').map(h => h.replace(/^"|"$/g, ''))
  const rows: Row[] = []
  for (let i = 1; i < lines.length; i++) {
    const cells: string[] = []
    let cur = '', inQ = false
    for (let j = 0; j < lines[i].length; j++) {
      const c = lines[i][j]
      if (c === '"') {
        if (inQ && lines[i][j + 1] === '"') { cur += '"'; j++ }
        else inQ = !inQ
      } else if (c === ',' && !inQ) { cells.push(cur); cur = '' }
      else { cur += c }
    }
    cells.push(cur)
    const obj: any = {}
    header.forEach((h, k) => obj[h] = cells[k] ?? '')
    rows.push(obj as Row)
  }
  return rows
}

async function main() {
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const candidates = parseCsv('reports/likely-real-mislabels.csv')

  let kept = 0, mostlyVegan = 0, veganOptions = 0, failed = 0

  console.log(`Processing ${candidates.length} candidates...\n`)

  for (const r of candidates) {
    if (ALLOWLIST_KEEP.has(r.id)) {
      console.log(`KEEP  ${r.name}  |  ${r.city}, ${r.country}  |  reason: known vegan brand`)
      kept++
      continue
    }
    const newLevel = VEGETARIAN_DEMOTE.has(r.id) ? 'mostly_vegan' : 'vegan_options'
    const { error } = await sb.from('places').update({ vegan_level: newLevel }).eq('id', r.id)
    if (error) {
      console.log(`FAIL  ${r.name}: ${error.message}`)
      failed++
    } else {
      console.log(`${newLevel === 'vegan_options' ? 'VOPT' : 'MOST'}  ${r.name}  |  ${r.city}, ${r.country}  |  ${r.top_hits}`)
      if (newLevel === 'vegan_options') veganOptions++
      else mostlyVegan++
    }
  }

  // Macedonia -> North Macedonia normalization
  console.log('\n--- Macedonia migration ---')
  const { error: macErr, count } = await sb.from('places')
    .update({ country: 'North Macedonia' }, { count: 'exact' })
    .eq('country', 'Macedonia')
  if (macErr) console.log(`FAIL Macedonia: ${macErr.message}`)
  else console.log(`Macedonia -> North Macedonia: ${count} rows updated`)

  // Cyrillic translations (per project rule: city names in English)
  console.log('\n--- Cyrillic translations ---')
  const { error: e1 } = await sb.from('places').update({ city: 'Resen' }).eq('city', 'Ресен')
  console.log(`Ресен -> Resen: ${e1 ? 'FAIL '+e1.message : 'OK'}`)
  // Translate the Cyrillic place name "Веган365Кујна" -> "Vegan365 Kitchen"
  const { error: e2 } = await sb.from('places').update({ name: 'Vegan365 Kitchen' }).eq('name', 'Веган365Кујна')
  console.log(`Веган365Кујна -> Vegan365 Kitchen: ${e2 ? 'FAIL '+e2.message : 'OK'}`)

  console.log(`\n--- Demotion summary ---`)
  console.log(`  Kept (allowlist):       ${kept}`)
  console.log(`  -> mostly_vegan:        ${mostlyVegan}`)
  console.log(`  -> vegan_options:       ${veganOptions}`)
  console.log(`  Failed:                 ${failed}`)
  console.log(`  Total processed:        ${candidates.length}`)
}
main()
