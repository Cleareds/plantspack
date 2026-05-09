/**
 * Reconcile our DB Exki rows against the canonical 56-location list pulled
 * from exki.com/restaurants on 2026-05-09.
 *
 * Strategy:
 *   1. Tag every canonical store with a stable identifier `exki-store-NNN`
 *      (the brand's own store number) in places.tags. This locks the
 *      identity so future re-runs idempotently match.
 *   2. For each canonical entry, try to match an existing live DB row by
 *      country + city + a street-keyword. If matched, enrich (proper name,
 *      canonical address, store-id tag, vegan_friendly level).
 *   3. Insert canonical entries with no DB match (i.e. new locations).
 *   4. Archive DB rows that are tagged as Exki but match NO canonical entry.
 *      That includes: the Italy/Turin row (Exki has exited Italy), the 8
 *      cityless France rows (closed locations from old OSM data), and any
 *      stale duplicates.
 *
 *   --commit  apply changes (default is dry-run)
 */
import { config } from 'dotenv'; config({ path: '.env.local' })
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { spawn } from 'child_process'

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const COMMIT = process.argv.includes('--commit')

interface Canon { store_id: string; name: string; city: string; country: string; address: string }

const CANON: Canon[] = JSON.parse(readFileSync('scripts/seo-out/exki-canonical.json','utf8'))

// Country-code map for Nominatim (used by add-place.ts).
const CC: Record<string, string> = { Belgium: 'be', France: 'fr', Netherlands: 'nl', Luxembourg: 'lu' }

// Per-canonical street keyword used to match candidate DB rows. Prefer a
// distinctive token: street name first, falling back to postcode if the
// street is generic ("Place de l'Université" appears twice in Louvain-la-Neuve).
function streetKey(c: Canon): string {
  // First non-numeric word that's >=4 chars
  const words = c.address.replace(/[,]/g, ' ').split(/\s+/).filter(Boolean)
  for (const w of words) {
    if (/^\d/.test(w)) continue
    if (w.length < 4) continue
    if (/^(rue|place|chausse|avenue|boulevard|aire|gare|terminal|airport|hall|bruxelles|paris|liege|li.ge|orly|roissy)$/i.test(w)) continue
    return w.toLowerCase()
  }
  return ''
}

async function spawnAdd(payload: any): Promise<{ ok: boolean; out: string }> {
  return new Promise((resolve) => {
    const flags = ['scripts/add-place.ts', '--ai-verified', '--force-vegan-level', '--force-description']
    if (!COMMIT) flags.push('--dry-run')
    const child = spawn('npx', ['tsx', ...flags], { stdio: ['pipe','pipe','pipe'] })
    let out=''; child.stdout.on('data', d=>out+=d); child.stderr.on('data', d=>out+=d)
    child.stdin.write(JSON.stringify(payload)); child.stdin.end()
    child.on('close', c => resolve({ ok: c===0, out }))
  })
}

async function main() {
  console.log(COMMIT ? 'COMMIT' : 'DRY-RUN')

  const { data: existing } = await sb.from('places').select('id, slug, name, city, country, vegan_level, address, tags, archived_at').is('archived_at', null).ilike('name','%exki%')
  const live = (existing || []) as any[]
  console.log(`\nExisting live Exki rows: ${live.length}`)

  // Hand-overrides for rows where the auto-matcher fails because the DB
  // city is wrong (commune vs "Brussels") or the address format differs
  // from the canonical. Each entry: existing slug -> canonical store_id.
  const HAND_MATCH: Record<string, string> = {
    'exki-brussels-inu3': '115',     // Place Madou (DB had city=Brussels, canonical=Saint-Josse-ten-Noode)
    'exki-saint-gilles-98ng': '012', // Galerie Horta = Brussels Midi station (canonical 012 Midi, Saint-Gilles)
    'exki-paris-2': '229',           // "118 Avenue de France" (off-by-2 vs canonical "116 Avenue de France")
    'exki-brussels-55fs': '120',     // Rue de la Loi - Arts-Loi (closer to 120 than 045 by Brussels-1000 postal)
    'exki-brussels-ki6e': '045',     // Rue de la Loi - the other 1000-Bruxelles entry = Schuman
  }

  // ---- Step 1: try to match each canonical to an existing row.
  // Match priority:
  //   a. previously-tagged with exki-store-NNN (idempotent re-runs)
  //   b. (country, city, streetKey-in-address)
  //   c. (country, city, single row) - only when exactly one DB row in that city
  // No greedy "first row in country.city" fallback - that was actively
  // destructive on a previous dry-run, renaming Brussels rows arbitrarily.
  const matched = new Map<string, any>()  // store_id -> row
  const usedRowIds = new Set<string>()
  const missing: Canon[] = []
  // Build a reverse lookup of hand-match overrides
  const handBySlug = new Map<string, string>(Object.entries(HAND_MATCH))

  for (const c of CANON) {
    const tag = `exki-store-${c.store_id}`
    // 0. Hand override
    let cand = live.find(r => !usedRowIds.has(r.id) && handBySlug.get(r.slug) === c.store_id)
    // 1. Idempotent re-runs: row already tagged
    if (!cand) cand = live.find(r => !usedRowIds.has(r.id) && (r.tags || []).includes(tag))
    // 2. (country, city, streetKey-in-address)
    if (!cand) {
      const key = streetKey(c)
      if (key) {
        cand = live.find(r => !usedRowIds.has(r.id) && r.country === c.country && r.city === c.city && (r.address || '').toLowerCase().includes(key))
      }
    }
    // 3. Single-row-in-city fallback (only safe for unique pairings)
    if (!cand) {
      const inCity = live.filter(r => !usedRowIds.has(r.id) && r.country === c.country && r.city === c.city)
      if (inCity.length === 1) cand = inCity[0]
    }
    if (cand) { matched.set(c.store_id, cand); usedRowIds.add(cand.id) }
    else missing.push(c)
  }

  console.log(`\nMatched: ${matched.size} / ${CANON.length} canonical entries`)
  console.log(`Missing (need to insert): ${missing.length}`)
  for (const m of missing) console.log(`  + ${m.name.padEnd(38)} ${m.city}, ${m.country}`)

  const orphans = live.filter(r => !usedRowIds.has(r.id))
  console.log(`\nOrphan rows (no canonical match - candidates for archive): ${orphans.length}`)
  for (const r of orphans) console.log(`  - ${(r.name || '').padEnd(28)} ${(r.city || '(no city)').padEnd(20)} ${r.country.padEnd(12)} ${r.slug}`)

  // ---- Step 2: enrich matched rows
  console.log(`\n=== Enriching ${matched.size} matched rows ===`)
  for (const [storeId, row] of matched.entries()) {
    const c = CANON.find(x => x.store_id === storeId)!
    const tag = `exki-store-${storeId}`
    const newTags = Array.from(new Set([...(row.tags || []), tag, 'chain']))
    const patch = {
      name: c.name,
      address: c.address,
      city: c.city,
      country: c.country,
      vegan_level: 'vegan_friendly',
      tags: newTags,
      updated_at: new Date().toISOString(),
    }
    if (!COMMIT) { console.log(`  DRY ${row.slug.padEnd(36)} -> ${c.name}`); continue }
    const { error } = await sb.from('places').update(patch).eq('id', row.id)
    if (error) console.log(`  ERR ${row.slug}: ${error.message}`)
    else console.log(`  OK  ${row.slug.padEnd(36)} -> ${c.name}`)
  }

  // ---- Step 3: insert missing
  console.log(`\n=== Inserting ${missing.length} missing locations ===`)
  for (const c of missing) {
    const payload = {
      name: c.name,
      city: c.city,
      country: c.country,
      country_code: CC[c.country],
      category: 'eat',
      subcategory: 'cafe',
      vegan_level: 'vegan_friendly',
      address: c.address,
      website: 'https://www.exki.com',
      description: `${c.name} is the ${c.city} branch of EXKi, the Belgian healthy-fast-good chain. Salads, soups, sandwiches, and bowls with vegan items clearly labelled VG across the regular menu.`,
      source: 'exki-canonical-2026-05-09',
      tags: ['chain', `exki-store-${c.store_id}`],
    }
    const res = await spawnAdd(payload)
    const tail = res.out.split('\n').slice(-3).map(l => l.trim()).filter(Boolean).join(' | ').slice(0, 180)
    console.log(`  ${res.ok ? 'OK' : 'FAIL'} ${c.name.padEnd(38)} ${tail}`)
    await new Promise(r => setTimeout(r, 700))  // Nominatim rate limit
  }

  // ---- Step 4: archive orphans
  console.log(`\n=== Archiving ${orphans.length} orphan rows ===`)
  for (const r of orphans) {
    const reason = r.country === 'Italy'
      ? 'Exki exited Italy (not in canonical 2026-05-09 list)'
      : !r.city
        ? 'cityless OSM import - no canonical match (likely closed)'
        : 'no canonical match in 2026-05-09 exki.com store list (likely closed)'
    if (!COMMIT) { console.log(`  DRY ${r.slug.padEnd(36)} -> ${reason}`); continue }
    const { error } = await sb.from('places').update({
      archived_at: new Date().toISOString(),
      archived_reason: reason,
      updated_at: new Date().toISOString(),
    }).eq('id', r.id)
    console.log(`  ${error ? 'ERR' : 'OK '} ${r.slug.padEnd(36)} -> ${reason}`)
  }

  if (COMMIT) {
    const { error } = await sb.rpc('refresh_directory_views')
    console.log(`\nrefresh_directory_views: ${error ? `ERR ${error.message}` : 'OK'}`)
  }
}
main().catch(e => { console.error(e); process.exit(1) })
