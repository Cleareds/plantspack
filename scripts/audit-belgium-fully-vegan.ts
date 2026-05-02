/**
 * Belgium fully_vegan audit — Phase 1 of the data-integrity cleanup.
 *
 * For every active Belgium place tagged fully_vegan, gather free signals
 * to judge whether the tag is actually correct:
 *
 *   1. OSM diet:vegan tag — fetched live from Overpass API. Only
 *      diet:vegan=only means "fully vegan menu". diet:vegan=yes means
 *      "has vegan options" (the tag is widely misused). The previous
 *      AI-verifier conflated the two.
 *   2. Website non-vegan keyword scan — curl the homepage + /menu and
 *      look for raw animal-flesh terms (beef, chicken, fish, etc.).
 *      A fully-vegan place's site rarely mentions any of these.
 *   3. Counter-signals — explicit "100% vegan" / "fully plant-based" /
 *      "all our food is vegan" near the top boosts confidence.
 *   4. HappyCow cross-reference — places listed under HC's vegan filter
 *      for their city are corroborated by HC's community moderation.
 *      Top 9 BE cities scraped earlier this session.
 *   5. Chain regex — names that signal mainstream non-vegan businesses
 *      (Le Pain Quotidien, Pizza Hut, names with rooster/steak/sushi).
 *
 * Output: a per-row confidence label (CONFIRMED / LIKELY / SUSPECT /
 * WRONG) with the evidence trail, written to CSV. No DB writes —
 * triage decisions happen via the admin page.
 *
 * Free tools only: Overpass (free), curl (free), local regex.
 *
 * Run: npx tsx scripts/audit-belgium-fully-vegan.ts
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync, writeFileSync } from 'fs'

const env = readFileSync('.env.local','utf8')
const SB_URL = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.+)/)![1].trim()
const SB_KEY = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.+)/)![1].trim()
const sb = createClient(SB_URL, SB_KEY)

// ---- 1. HappyCow vegan listings scraped earlier (top 9 BE cities) ----
const HC_VEGAN: Record<string, string[]> = {
  'Brussels': ['Humus x Hortense','Kitsune Burgers',"L'Alchimiste",'Le Botaniste','Les 4 Jeudis','Lil Bao','Lucifer Lives','Mo Mo','Mr Falafel','Nöje',"Taylor's Cafe",'Terter','The Judgy Vegan','Vegan Chouke','VeganPot','Verdō'],
  'Ghent': ['Cosy Green','De Salopette','Dirt.','Greenway','Karoot','Knol & Kool','Le Botaniste','Lekker GEC','Lokaal','LUDO','OhMA','Plant A Pizza','Soul Kitchen','YUSU'],
  'Antwerp': ["Simone's Kitchen",'and/or','Camion & Camionette','Camionette','CLO','HART','HUMM Deli','HUMM Restaurant','Klimzaal Blok','MoMu Café','Piano & Sano','Planttrekkerij','Pura Vida Vegan Tacos','Spritz'],
  'Bruges': ['Atelier Flori','Blackbird','Kosmopoliet'],
  'Leuven': ['Bodhi','Falafel Top','Het Strand','Life Bar','Pepas','Tabi Loo'],
  'Liège': ['Ventre Content','Wabi Sabi'],
  'Mechelen': ['Funky Jungle','Kato Gâteaux','TAKE'],
  'Hasselt': ['De Levensboom','Lento'],
  'Kortrijk': ['Fluffy Falafel'],
}

function norm(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/\p{M}/gu,'').replace(/[^a-z0-9]+/g,' ').trim()
}
function inHCVegan(name: string, city: string): boolean {
  const list = HC_VEGAN[city] || []
  const ns = norm(name)
  return list.some(hc => {
    const nh = norm(hc)
    return ns === nh || ns.includes(nh) || nh.includes(ns)
  })
}

// ---- 2. Chain / non-vegan name patterns ----
const CHAIN_NAMES = [
  /\bpizza hut\b/i, /\bdomino'?s\b/i, /\bsubway\b/i, /\bmcdonald'?s\b/i,
  /\bkfc\b/i, /\bburger king\b/i, /\bquick\b(?!\s+pizza)/i,
  /\ble pain quotidien\b/i, /\bexki\b/i, /\bpanos\b/i, /\bfive guys\b/i,
  /\bstarbucks\b/i, /\bcosta coffee\b/i, /\bsushi\b/i, /\bsteakhouse\b/i,
  /\bbrasserie\b/i, /\bhot dog\b/i, /\bcoq d'?or\b/i, /\bkebab\b/i,
]

// ---- 3. Website keyword scan ----
const STRONG_NON_VEGAN = [  // animal flesh — almost never appears on a fully-vegan site
  'beef','chicken','pork','lamb','duck','veal','venison','rabbit',
  'salmon','tuna','prawn','shrimp','oyster','mussel','calamari','anchovy',
  'ham','bacon','sausage','steak','schnitzel','foie gras','escargot',
  'turkey','goose','rib eye','ribeye','t-bone','filet mignon',
  'chorizo','prosciutto','pepperoni','salami','mortadella',
]
const MEDIUM_NON_VEGAN = [   // dairy/eggs — could be vegan substitutes but worth flagging
  'parmesan','mozzarella','ricotta','feta','gorgonzola','camembert',
  'brie','gruyere','cheddar','manchego',
]
const COUNTER_SIGNALS = [
  '100% vegan','fully vegan','100% plant-based','fully plant-based',
  'entirely vegan','all-vegan','exclusively vegan','only vegan',
  'menu is vegan','our food is vegan','vegan kitchen','vegan-only',
  'no animal products','plant-based only','everything is vegan',
]

interface Place {
  id: string; name: string; city: string | null; slug: string | null;
  description: string | null; website: string | null;
  source: string | null; source_id: string | null;
  verification_level: number | null; verification_method: string | null;
  latitude: number | null; longitude: number | null;
}

interface AuditRow {
  place: Place;
  osm_id: string | null;
  osm_diet_vegan: string | null;          // 'only' | 'yes' | 'no' | 'limited' | null
  osm_fetched: boolean;
  website_status: number | string;         // HTTP status or error
  website_strong_hits: string[];
  website_medium_hits: string[];
  website_counter_hits: string[];
  hc_listed: boolean;
  chain_hit: string | null;
  desc_lies: boolean;                       // description claims fully vegan but other signals contradict
  verdict: 'CONFIRMED' | 'LIKELY' | 'SUSPECT' | 'WRONG' | 'UNKNOWN';
  reasoning: string[];
}

// ---- Overpass batch fetcher ----
async function fetchOSMNodes(ids: number[]): Promise<Record<string, Record<string,string>>> {
  if (ids.length === 0) return {}
  // Overpass API expects: [out:json];node(id:1,2,3);out tags;
  const query = `[out:json][timeout:60];node(id:${ids.join(',')});out tags;`
  const url = 'https://overpass-api.de/api/interpreter'
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'PlantsPack/1.0' },
      body: 'data=' + encodeURIComponent(query),
      signal: AbortSignal.timeout(70000),
    })
    if (!res.ok) { console.warn(`Overpass returned ${res.status}`); return {} }
    const data = await res.json()
    const out: Record<string, Record<string,string>> = {}
    for (const el of (data.elements || [])) {
      out[String(el.id)] = el.tags || {}
    }
    return out
  } catch (e: any) {
    console.warn(`Overpass error: ${e.message}`)
    return {}
  }
}

function extractOSMId(srcId: string | null): number | null {
  if (!srcId) return null
  // formats: osm-node-12345, osm:node/12345
  const m = srcId.match(/osm[-:]node[-/](\d+)/)
  if (m) return parseInt(m[1])
  return null
}

// ---- Website scanner ----
async function scanWebsite(url: string): Promise<{ status: number | string; html: string }> {
  // Try homepage + /menu, take whichever is bigger
  const candidates = [url]
  try {
    const u = new URL(url)
    candidates.push(`${u.origin}/menu`)
    candidates.push(`${u.origin}/menus`)
    candidates.push(`${u.origin}/our-menu`)
  } catch { /* invalid URL */ }
  let best = { status: 'unreachable' as number | string, html: '' }
  for (const c of candidates) {
    try {
      const res = await fetch(c, {
        headers: { 'User-Agent': 'Mozilla/5.0 PlantsPack/1.0', 'Accept-Language': 'en,nl,fr' },
        signal: AbortSignal.timeout(10000),
        redirect: 'follow',
      })
      const status = res.status
      if (!res.ok) { if (best.status === 'unreachable') best = { status, html: '' }; continue }
      const html = await res.text()
      if (html.length > best.html.length) best = { status, html }
    } catch (e: any) {
      if (best.status === 'unreachable') best = { status: e.message?.slice(0,40) || 'error', html: '' }
    }
  }
  return best
}
function findKeywords(html: string, list: string[]): string[] {
  // Strip HTML tags + lowercase. Match whole words.
  const text = html.replace(/<[^>]+>/g,' ').toLowerCase()
  const found = new Set<string>()
  for (const kw of list) {
    const re = new RegExp(`\\b${kw.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}\\b`, 'i')
    if (re.test(text)) found.add(kw)
  }
  return [...found]
}
function findCounters(html: string): string[] {
  const text = html.replace(/<[^>]+>/g,' ').toLowerCase()
  const found = new Set<string>()
  for (const phrase of COUNTER_SIGNALS) {
    if (text.includes(phrase)) found.add(phrase)
  }
  return [...found]
}

// ---- Main ----
async function main() {
  console.log('Fetching Belgium fully_vegan places...')
  const { data: places } = await sb.from('places')
    .select('id, name, city, slug, description, website, source, source_id, verification_level, verification_method, latitude, longitude')
    .eq('country','Belgium').eq('vegan_level','fully_vegan').is('archived_at',null)
    .limit(2000)
  const all = (places || []) as Place[]
  console.log(`  ${all.length} places to audit\n`)

  // ---- Pre-pass: Overpass batches ----
  const osmTagsById: Record<string, Record<string,string>> = {}
  const osmIds = all.map(p => extractOSMId(p.source_id)).filter((x): x is number => !!x)
  console.log(`Fetching ${osmIds.length} OSM tags from Overpass (batched)...`)
  const BATCH = 80
  for (let i = 0; i < osmIds.length; i += BATCH) {
    const batch = osmIds.slice(i, i + BATCH)
    const tags = await fetchOSMNodes(batch)
    Object.assign(osmTagsById, tags)
    process.stdout.write(`  ${Math.min(i + BATCH, osmIds.length)}/${osmIds.length} `)
    if (i + BATCH < osmIds.length) await new Promise(r => setTimeout(r, 1500)) // be polite
  }
  console.log()

  // ---- Per-place audit ----
  const rows: AuditRow[] = []
  for (let i = 0; i < all.length; i++) {
    const p = all[i]
    const reasoning: string[] = []
    const osmId = extractOSMId(p.source_id)
    const osmTags = osmId ? osmTagsById[String(osmId)] : null
    const osmDietVegan = osmTags?.['diet:vegan'] || null
    const osmFetched = !!osmTags
    if (osmId && !osmFetched) reasoning.push(`OSM node ${osmId} not returned by Overpass (deleted or rate-limited)`)
    if (osmDietVegan) reasoning.push(`OSM diet:vegan="${osmDietVegan}"`)

    let websiteStatus: number | string = '(no website)'
    let strongHits: string[] = []
    let mediumHits: string[] = []
    let counterHits: string[] = []
    if (p.website) {
      const scan = await scanWebsite(p.website)
      websiteStatus = scan.status
      if (scan.html) {
        strongHits = findKeywords(scan.html, STRONG_NON_VEGAN)
        mediumHits = findKeywords(scan.html, MEDIUM_NON_VEGAN)
        counterHits = findCounters(scan.html)
        if (strongHits.length) reasoning.push(`Website mentions raw animal flesh: ${strongHits.slice(0,5).join(', ')}`)
        if (counterHits.length) reasoning.push(`Website confirms vegan: ${counterHits.slice(0,2).join(', ')}`)
      } else {
        reasoning.push(`Website unreachable: ${websiteStatus}`)
      }
    } else {
      reasoning.push('No website to scan')
    }

    const hcListed = inHCVegan(p.name, p.city || '')
    if (hcListed) reasoning.push('HappyCow lists as Vegan for this city')
    else if (HC_VEGAN[p.city || '']) reasoning.push('Not in HappyCow vegan list for this city')

    const chainHit = CHAIN_NAMES.find(re => re.test(p.name))?.source || null
    if (chainHit) reasoning.push(`Name matches chain pattern: ${chainHit}`)

    // Compute verdict
    let verdict: AuditRow['verdict'] = 'UNKNOWN'
    if (chainHit && strongHits.length > 0) verdict = 'WRONG'
    else if (osmDietVegan === 'yes' && strongHits.length >= 2) verdict = 'WRONG'
    else if (osmDietVegan === 'yes' && counterHits.length === 0) verdict = 'SUSPECT'
    else if (strongHits.length >= 3) verdict = 'WRONG'
    else if (strongHits.length >= 1 && counterHits.length === 0) verdict = 'SUSPECT'
    else if (osmDietVegan === 'only' && counterHits.length > 0) verdict = 'CONFIRMED'
    else if (osmDietVegan === 'only' && strongHits.length === 0) verdict = 'CONFIRMED'
    else if (counterHits.length > 0 && strongHits.length === 0) verdict = 'CONFIRMED'
    else if (hcListed && strongHits.length === 0) verdict = 'LIKELY'
    else if (osmDietVegan === 'only') verdict = 'LIKELY'
    else if (counterHits.length === 0 && strongHits.length === 0 && !p.website) verdict = 'SUSPECT'
    else verdict = 'LIKELY'

    rows.push({ place: p, osm_id: osmId ? String(osmId) : null, osm_diet_vegan: osmDietVegan, osm_fetched: osmFetched, website_status: websiteStatus, website_strong_hits: strongHits, website_medium_hits: mediumHits, website_counter_hits: counterHits, hc_listed: hcListed, chain_hit: chainHit, desc_lies: false, verdict, reasoning })

    process.stdout.write(`  [${i + 1}/${all.length}] ${verdict} ${p.name.slice(0, 35).padEnd(35)} (${p.city})\n`)
    // Politeness — both for websites and to give the system breathing room
    await new Promise(r => setTimeout(r, 500))
  }

  // ---- Write CSV ----
  const csvRows = [
    'verdict,id,name,city,vegan_level,osm_id,osm_diet_vegan,website_status,strong_hits,counter_hits,hc_listed,chain_hit,reasoning,slug',
    ...rows.map(r => [
      r.verdict,
      r.place.id,
      `"${r.place.name.replace(/"/g,'""')}"`,
      r.place.city || '',
      'fully_vegan',
      r.osm_id || '',
      r.osm_diet_vegan || '',
      r.website_status,
      `"${r.website_strong_hits.join(', ')}"`,
      `"${r.website_counter_hits.join(', ')}"`,
      r.hc_listed ? 'yes' : 'no',
      r.chain_hit || '',
      `"${r.reasoning.join(' | ')}"`,
      r.place.slug || '',
    ].join(',')),
  ]
  writeFileSync('scripts/audit-belgium-fully-vegan.csv', csvRows.join('\n'))

  // ---- Summary ----
  const counts = { CONFIRMED: 0, LIKELY: 0, SUSPECT: 0, WRONG: 0, UNKNOWN: 0 }
  for (const r of rows) counts[r.verdict]++
  console.log(`\n========== SUMMARY ==========`)
  console.log(`Total: ${rows.length}`)
  for (const [k, v] of Object.entries(counts)) console.log(`  ${k.padEnd(10)} ${v}`)
  console.log(`\nOSM diet:vegan tag distribution:`)
  const osmDist: Record<string, number> = {}
  for (const r of rows) {
    const k = r.osm_diet_vegan || (r.osm_id ? 'missing-tag' : 'not-osm')
    osmDist[k] = (osmDist[k] || 0) + 1
  }
  for (const [k, v] of Object.entries(osmDist)) console.log(`  ${k.padEnd(15)} ${v}`)
  console.log(`\nWritten to scripts/audit-belgium-fully-vegan.csv`)
  console.log(`\nNext: review WRONG + SUSPECT in /admin/data-quality/belgium`)
}

main().catch(e => { console.error(e); process.exit(1) })
