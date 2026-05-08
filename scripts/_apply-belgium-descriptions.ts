/**
 * Generate + apply 2-3 sentence factual descriptions for the 289 Belgium
 * places flagged in plantspack_belgium_changes_needed.csv as having a
 * missing or generic description. No LLM, no API: descriptions are derived
 * deterministically from structured fields (name, type, vegan level, city,
 * cuisine types, opening hours, website host).
 *
 * Rules (mirrors enrich-thin-places.ts but allows OVERWRITE since the
 * existing text is generic placeholder per the audit):
 *   - Factual restatements only. No marketing prose.
 *   - Every sentence derived from a field we already render.
 *   - No em-dash (project rule).
 *   - Honest hedging: "vegan-friendly" never implies "fully vegan".
 *
 *   --dry-run   default: prints first 8 sample outputs, writes nothing
 *   --commit    write to DB
 *   --limit N   cap rows processed
 */
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { readFileSync } from 'fs'

config({ path: '.env.local' })

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

const COMMIT = process.argv.includes('--commit')
const LIMIT_IDX = process.argv.indexOf('--limit')
const LIMIT = LIMIT_IDX >= 0 ? parseInt(process.argv[LIMIT_IDX + 1], 10) : Infinity

const CATEGORY_NOUN: Record<string, string> = {
  eat: 'restaurant',
  store: 'shop',
  hotel: 'stay',
  organisation: 'animal sanctuary',
  event: 'vegan event',
  other: 'place',
}

const VEGAN_LABEL: Record<string, string> = {
  fully_vegan: 'fully vegan',
  mostly_vegan: 'mostly vegan',
  vegan_friendly: 'vegan-friendly',
  vegan_options: 'with vegan options',
}

function summarizeHours(oh: string | null): string | null {
  if (!oh) return null
  // Heuristic shorthand: detect closed days vs always-open vs weekend-only.
  const s = oh.toLowerCase()
  if (s.includes('mo-su') || s.includes('24/7')) return 'Open daily.'
  // Has only weekend tokens?
  const hasWeekday = /\b(mo|tu|we|th|fr)\b/i.test(oh)
  const hasWeekend = /\b(sa|su)\b/i.test(oh)
  if (hasWeekend && !hasWeekday) return 'Open weekends only.'
  if (hasWeekday && !hasWeekend) return 'Open weekdays only.'
  // Contains "off" or empty days = closed days. Skip a generic line then.
  return null
}

function articleFor(noun: string): string {
  return /^[aeiou]/i.test(noun) ? 'an' : 'a'
}

function generateDescription(p: any): string {
  const noun = CATEGORY_NOUN[p.category || ''] || 'place'
  const veganLabel = VEGAN_LABEL[p.vegan_level] || 'vegan-friendly'
  const sentences: string[] = []

  // Sentence 1: name + type + vegan level + city.
  const cityPart = p.city ? `in ${p.city}, Belgium` : 'in Belgium'
  if (p.vegan_level === 'fully_vegan') {
    sentences.push(`${p.name} is ${articleFor(veganLabel)} ${veganLabel} ${noun} ${cityPart}.`)
  } else if (p.vegan_level === 'vegan_options') {
    // Honest framing: this is a mainstream venue with vegan items, not a vegan venue.
    sentences.push(`${p.name} is ${articleFor(noun)} ${noun} ${cityPart} with vegan options on the menu.`)
  } else {
    sentences.push(`${p.name} is ${articleFor(veganLabel)} ${veganLabel} ${noun} ${cityPart}.`)
  }

  // Sentence 2: cuisine / subcategory if present (skip if subcategory just
  // restates the category noun, e.g. eat/restaurant -> "It is a restaurant").
  const cuisines: string[] = (p.cuisine_types || []).filter((c: string) => c && c !== 'vegan').slice(0, 3)
  if (cuisines.length > 0) {
    sentences.push(`The menu covers ${cuisines.join(', ')}.`)
  } else if (p.subcategory && p.subcategory !== 'general' && p.subcategory !== noun && p.subcategory !== p.category) {
    sentences.push(`It is a ${p.subcategory.replace(/_/g, ' ')}.`)
  }

  // Sentence 3: hours summary OR website.
  const hours = summarizeHours(p.opening_hours)
  if (hours) sentences.push(hours)
  else if (p.website) {
    try {
      const host = new URL(p.website.startsWith('http') ? p.website : `https://${p.website}`).hostname.replace(/^www\./, '')
      sentences.push(`See ${host} for menu and hours.`)
    } catch {}
  }

  // Em-dash safety net.
  return sentences.join(' ').replace(/—/g, '-').replace(/–/g, '-').trim()
}

async function main() {
  console.log(`Mode: ${COMMIT ? 'COMMIT' : 'DRY-RUN'}, limit=${isFinite(LIMIT) ? LIMIT : 'all'}`)
  const todo: { id: string; name: string; priority: string }[] =
    JSON.parse(readFileSync('scripts/seo-out/belgium-descriptions-todo.json', 'utf8'))
  console.log(`Todo size: ${todo.length}`)

  const ids = todo.slice(0, LIMIT).map(t => t.id)
  // Fetch full DB rows (need cuisine_types, subcategory etc.)
  const fetched = new Map<string, any>()
  for (let i = 0; i < ids.length; i += 200) {
    const slice = ids.slice(i, i + 200)
    const { data, error } = await sb
      .from('places')
      .select('id, name, category, vegan_level, city, opening_hours, cuisine_types, subcategory, website, archived_at, description')
      .in('id', slice)
    if (error) throw error
    for (const r of data || []) fetched.set(r.id, r)
  }

  let written = 0, skipped = 0, sampleShown = 0
  for (const t of todo.slice(0, LIMIT)) {
    const row = fetched.get(t.id)
    if (!row) { skipped++; continue }
    if (row.archived_at) { skipped++; continue }
    const desc = generateDescription(row)
    if (!desc || desc.length < 30) { skipped++; continue }
    if (sampleShown < 8) {
      console.log(`\n[${t.priority}] ${row.name} (${row.city})`)
      console.log(`  -> ${desc}`)
      sampleShown++
    }
    if (COMMIT) {
      const { error } = await sb.from('places').update({ description: desc, updated_at: new Date().toISOString() }).eq('id', row.id)
      if (error) { console.log('  ERR', row.id, error.message); skipped++; continue }
    }
    written++
  }
  console.log(`\n${COMMIT ? 'Wrote' : 'Would write'}: ${written}, skipped: ${skipped}`)
}

main().catch(e => { console.error(e); process.exit(1) })
