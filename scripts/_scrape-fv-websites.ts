// Step #2 of audit: scrape homepages of fully_vegan places that have websites,
// flag any that mention non-vegan ingredients in many languages.
//
// Usage:
//   npx tsx scripts/_scrape-fv-websites.ts            # pilot, 200 places
//   npx tsx scripts/_scrape-fv-websites.ts --all      # full run, ~4794
//   npx tsx scripts/_scrape-fv-websites.ts --resume   # continue from progress file
//
// Output:
//   reports/fv-website-flags.jsonl   one JSON per line, append-only (resumable)
//   reports/fv-website-summary.csv   final ranked CSV after run completes

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { writeFileSync, appendFileSync, existsSync, readFileSync, mkdirSync } from 'fs'
import { setTimeout as sleep } from 'timers/promises'
config({ path: '.env.local' })

// Multi-language non-vegan ingredient keywords. Word-boundary matched.
// Conservative list - avoid words like "milk" (could be coconut/oat/almond
// "milk" on a vegan menu) unless preceded by an animal qualifier we trust.
// We do NOT include "cheese" alone for the same reason (vegan cheese exists);
// instead we look for animal-specific cheese words like "mozzarella", "parmesan"
// only when paired with menu/dish terminology - too many false positives.
//
// Strategy: ANIMAL_PROTEINS are unambiguous (no vegan alternative shares the
// word). One mention is suspicious; multiple is high confidence.
const ANIMAL_PROTEINS = [
  // English
  'beef', 'pork', 'chicken', 'lamb', 'veal', 'turkey', 'duck', 'goose', 'rabbit',
  'bacon', 'ham', 'sausage', 'salami', 'pepperoni', 'prosciutto', 'chorizo',
  'fish', 'salmon', 'tuna', 'cod', 'shrimp', 'prawn', 'lobster', 'crab', 'oyster', 'mussel', 'squid', 'octopus', 'anchovy',
  // Spanish
  'pollo', 'cerdo', 'ternera', 'cordero', 'pavo', 'jamón', 'jamon', 'chorizo', 'salchicha', 'tocino',
  'pescado', 'atún', 'atun', 'salmón', 'salmon', 'gamba', 'langosta', 'pulpo', 'calamar', 'mariscos',
  // Portuguese (peru = turkey but matches country name "Peru" - excluded)
  'frango', 'porco', 'vaca', 'presunto', 'linguiça', 'linguica',
  'peixe', 'camarão', 'camarao', 'lula', 'polvo', 'bacalhau',
  // French
  'poulet', 'porc', 'boeuf', 'bœuf', 'veau', 'agneau', 'dinde', 'canard', 'jambon', 'saucisse', 'saucisson',
  'poisson', 'thon', 'saumon', 'crevette', 'homard', 'crabe', 'huître', 'huitre',
  // German
  'huhn', 'hähnchen', 'haehnchen', 'rind', 'schwein', 'lamm', 'pute', 'ente', 'speck', 'schinken', 'wurst',
  'fisch', 'lachs', 'thunfisch', 'garnele', 'tintenfisch',
  // Italian
  'pollo', 'manzo', 'maiale', 'agnello', 'tacchino', 'anatra', 'prosciutto', 'salsiccia',
  'pesce', 'tonno', 'salmone', 'gambero', 'vongola', 'polpo',
]

const MENU_HINTS = ['menu', 'menú', 'carta', 'speisekarte', 'dishes', 'platos', 'pratos', 'gerichte']

function buildPattern(words: string[]): RegExp {
  const escaped = words.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  return new RegExp(`\\b(${escaped.join('|')})\\b`, 'gi')
}
const ANIMAL_RE = buildPattern(ANIMAL_PROTEINS)
const MENU_RE = buildPattern(MENU_HINTS)

const PROGRESS = 'reports/fv-website-flags.jsonl'
const SUMMARY = 'reports/fv-website-summary.csv'

async function fetchWithTimeout(url: string, ms: number): Promise<string | null> {
  const ctrl = new AbortController()
  const to = setTimeout(() => ctrl.abort(), ms)
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { 'User-Agent': 'PlantsPack/1.0 (vegan-only directory; hello@plantspack.com) verification' },
      redirect: 'follow',
    })
    clearTimeout(to)
    if (!res.ok) return null
    const ct = res.headers.get('content-type') ?? ''
    if (!ct.includes('text/html') && !ct.includes('text/plain')) return null
    const text = await res.text()
    return text
  } catch {
    clearTimeout(to)
    return null
  }
}

function htmlToText(html: string): string {
  // Drop scripts/styles, then strip tags. Naive but fine for keyword matching.
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
}

// Detect if "vegan", "vegetal", "vegano", "vegana", "veggie", "végétal", "plant"
// appears within ~40 chars before/after the hit. If so, the hit is almost
// certainly a vegan version of a meat dish (e.g. "vegan bacon"). Discount it.
const VEGAN_NEARBY = /\b(vegan|vegana|vegano|veggie|veg[eé]tal|plant[- ]?based|pflanzlich|sin\s+animal|cruelty)/i

function analyse(text: string) {
  const hits: Record<string, number> = {}
  let raw = 0
  let nearVegan = 0
  for (const m of text.matchAll(ANIMAL_RE)) {
    raw++
    const w = m[0].toLowerCase()
    const start = Math.max(0, (m.index ?? 0) - 40)
    const end = Math.min(text.length, (m.index ?? 0) + m[0].length + 40)
    const window = text.slice(start, end)
    if (VEGAN_NEARBY.test(window)) { nearVegan++; continue }
    hits[w] = (hits[w] ?? 0) + 1
  }
  const totalHits = Object.values(hits).reduce((a, b) => a + b, 0)
  const uniqueHits = Object.keys(hits).length
  const hasMenu = MENU_RE.test(text)
  // Suspicion score: weight variety + density. Single hits are noisy; >=2 unique is the threshold.
  let suspicion = 0
  if (uniqueHits >= 2) suspicion += 1
  if (uniqueHits >= 3) suspicion += 1
  if (uniqueHits >= 5) suspicion += 1
  if (totalHits >= 5) suspicion += 1
  if (totalHits >= 15) suspicion += 1
  if (hasMenu && uniqueHits >= 2) suspicion += 1
  return { hits, totalHits, uniqueHits, hasMenu, suspicion, raw, nearVegan }
}

async function processOne(p: { id: string, name: string, city: string, country: string, website: string }) {
  let url = p.website.trim()
  if (!/^https?:\/\//i.test(url)) url = 'https://' + url
  const html = await fetchWithTimeout(url, 12000)
  const result: any = {
    id: p.id, name: p.name, city: p.city, country: p.country, url,
    fetched: !!html,
  }
  if (html) {
    const text = htmlToText(html).slice(0, 80000) // cap to avoid mega pages
    const a = analyse(text)
    result.totalHits = a.totalHits
    result.uniqueHits = a.uniqueHits
    result.suspicion = a.suspicion
    result.hasMenu = a.hasMenu
    result.rawHits = a.raw
    result.discardedNearVegan = a.nearVegan
    result.topHits = Object.entries(a.hits).sort((x, y) => y[1] - x[1]).slice(0, 6).map(([k, v]) => `${k}:${v}`).join(',')
  }
  return result
}

function loadDone(): Set<string> {
  if (!existsSync(PROGRESS)) return new Set()
  const lines = readFileSync(PROGRESS, 'utf8').split('\n').filter(Boolean)
  const ids = new Set<string>()
  for (const l of lines) {
    try { ids.add(JSON.parse(l).id) } catch {}
  }
  return ids
}

async function main() {
  mkdirSync('reports', { recursive: true })
  const all = process.argv.includes('--all')
  const resume = process.argv.includes('--resume') || all
  const limit = all ? 100000 : 200

  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

  // Pull all candidates ordered by id (cursor pagination through 1000-cap).
  const candidates: any[] = []
  let cursor: string | null = null
  for (;;) {
    let q = sb.from('places').select('id, name, city, country, website')
      .eq('vegan_level', 'fully_vegan').is('archived_at', null)
      .not('website', 'is', null).neq('website', '')
      .order('id').limit(1000)
    if (cursor) q = q.gt('id', cursor)
    const { data, error } = await q
    if (error) { console.error(error); process.exit(1) }
    if (!data || data.length === 0) break
    candidates.push(...data)
    cursor = data[data.length - 1].id
    if (data.length < 1000) break
  }
  console.log(`Candidates with websites: ${candidates.length}`)

  const done = resume ? loadDone() : new Set<string>()
  if (!resume && existsSync(PROGRESS)) {
    // fresh run wipes progress
    writeFileSync(PROGRESS, '')
  }
  const todo = candidates.filter(c => !done.has(c.id)).slice(0, limit)
  console.log(`To process this run: ${todo.length}  (already done: ${done.size})`)

  const CONCURRENCY = 5
  let i = 0
  let flagged = 0, fetched = 0
  async function worker() {
    while (true) {
      const idx = i++
      if (idx >= todo.length) return
      const p = todo[idx]
      const r = await processOne(p)
      if (r.fetched) fetched++
      if (r.suspicion >= 2) flagged++
      appendFileSync(PROGRESS, JSON.stringify(r) + '\n')
      if (idx % 25 === 0) {
        process.stdout.write(`\r  progress: ${idx + 1}/${todo.length}  fetched=${fetched}  flagged(susp>=2)=${flagged}`)
      }
      // Polite jitter
      await sleep(150 + Math.random() * 250)
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker))
  console.log(`\nDone. Fetched ${fetched}/${todo.length}. Flagged (suspicion>=2): ${flagged}`)

  // Build summary CSV from full progress file.
  const lines = readFileSync(PROGRESS, 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l))
  lines.sort((a, b) => (b.suspicion ?? 0) - (a.suspicion ?? 0))
  const out = ['suspicion,uniqueHits,totalHits,id,name,city,country,url,topHits,fetched']
  for (const r of lines) {
    const cells = [
      r.suspicion ?? '',
      r.uniqueHits ?? '',
      r.totalHits ?? '',
      r.id, r.name, r.city, r.country, r.url, r.topHits ?? '', r.fetched ? 'y' : 'n',
    ].map(v => `"${String(v ?? '').replace(/"/g, '""')}"`)
    out.push(cells.join(','))
  }
  writeFileSync(SUMMARY, out.join('\n'))
  console.log(`Summary CSV: ${SUMMARY}`)

  // Top 25 to console.
  console.log('\nTop 25 highest-suspicion (so far):')
  for (const r of lines.slice(0, 25)) {
    if ((r.suspicion ?? 0) === 0) break
    console.log(`  [${r.suspicion}]  ${r.name}  |  ${r.city}, ${r.country}  |  ${r.topHits}  |  ${r.url}`)
  }
}
main()
