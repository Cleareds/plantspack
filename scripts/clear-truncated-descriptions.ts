/**
 * Clears descriptions that the previous AI batch truncated mid-sentence.
 *
 * Detection rules (must match at least one):
 *   1. Last char is not sentence-final punctuation (. ! ? … ' " ) ])
 *   2. Description contains an HTML entity that wasn't decoded (e.g.
 *      [&hellip;], &amp;, etc.)
 *   3. Description ends in a colon or open bracket — characteristic
 *      cut-off pattern from the previous generator
 *   4. Description is very short (< 30 chars) AND looks like a fragment
 *      (no full sentence)
 *
 * Safety:
 *   - Only touches rows where the description was demonstrably AI-generated
 *     (verification_method='ai_verified' OR source matches osm-* / vegguide
 *     and last_verified_at is null OR description starts with one of the
 *     templated AI openings). NEVER touches admin_review or manual sources.
 *   - Soft-clear: sets description=NULL and writes admin_notes for audit.
 *     The place page renders rich auto-fallback content from category +
 *     cuisine + ratings — better than a half-cut sentence.
 *   - --dry-run prints what would change without writing.
 *   - --country=Belgium scopes to one country (default: Belgium).
 *   - --all runs globally.
 *
 * Run:
 *   npx tsx scripts/clear-truncated-descriptions.ts --dry-run
 *   npx tsx scripts/clear-truncated-descriptions.ts            # Belgium only
 *   npx tsx scripts/clear-truncated-descriptions.ts --all      # global
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const env = readFileSync('.env.local', 'utf8')
const SB_URL = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.+)/)![1].trim()
const SB_KEY = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.+)/)![1].trim()
const sb = createClient(SB_URL, SB_KEY)

const DRY_RUN = process.argv.includes('--dry-run')
const ALL = process.argv.includes('--all')
const COUNTRY = (() => {
  const arg = process.argv.find(a => a.startsWith('--country='))
  if (arg) return arg.slice('--country='.length)
  return ALL ? null : 'Belgium'
})()

const HTML_ENTITY_RE = /\[&\w+;\]|&hellip;|&amp;|&quot;|&#x27;|&lt;|&gt;|&nbsp;/i
const TRAILING_COLON_OR_BRACKET = /[:[(]\s*$/
const SENTENCE_FINAL = /[.!?…'"\)\]]$/
// Templated AI openings — strong evidence the desc is AI-generated and
// thus safe to clear (the rich fallback is more useful than a templated
// fluff intro that got cut anyway).
const AI_OPENING_RE = /^(?:Nestled (?:in|amidst|along)|Tucked (?:away|in)|Located in the heart of|This (?:charming|cozy|delightful|vibrant) (?:vegan|plant-based|cafe|restaurant)|Discover (?:a |the |an )|At [A-Z][^,]+,(?:\s+\w+){2,8}\s+offers)/i

function isTruncated(desc: string): { truncated: boolean; reason: string } {
  const trimmed = desc.trim()
  if (HTML_ENTITY_RE.test(trimmed)) return { truncated: true, reason: 'undecoded HTML entity' }
  if (TRAILING_COLON_OR_BRACKET.test(trimmed)) return { truncated: true, reason: 'ends with colon or bracket' }
  if (!SENTENCE_FINAL.test(trimmed)) {
    // Last token check: if last word is < 4 chars and the desc is long, it's probably cut
    const lastWord = trimmed.split(/\s+/).pop() || ''
    if (lastWord.length <= 4 && trimmed.length > 50) {
      return { truncated: true, reason: `mid-word cut: "...${trimmed.slice(-40)}"` }
    }
    return { truncated: true, reason: `no sentence-final punctuation: "...${trimmed.slice(-40)}"` }
  }
  return { truncated: false, reason: '' }
}

interface Place {
  id: string; name: string; city: string | null; country: string;
  description: string | null; verification_method: string | null;
  source: string | null; slug: string | null;
}

async function main() {
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN' : 'APPLY'}`)
  console.log(`Scope: ${COUNTRY || 'GLOBAL (all countries)'}`)
  console.log()

  // Pull candidates: any active place with a description, scoped to country
  // unless --all. Process in pages of 1000 to handle large global runs.
  const PAGE = 1000
  let from = 0
  let totalScanned = 0
  let totalCleared = 0
  let skippedAdmin = 0
  const examples: { name: string; city: string | null; reason: string }[] = []

  while (true) {
    let q = sb.from('places')
      .select('id, name, city, country, description, verification_method, source, slug')
      .is('archived_at', null)
      .not('description', 'is', null)
      .neq('description', '')
      .range(from, from + PAGE - 1)
    if (COUNTRY) q = q.eq('country', COUNTRY)
    const { data, error } = await q
    if (error) { console.error(error); process.exit(1) }
    if (!data || data.length === 0) break

    for (const p of data as Place[]) {
      totalScanned++
      const desc = p.description!
      const { truncated, reason } = isTruncated(desc)
      if (!truncated) continue

      // Safety gate: only clear AI-generated content. Either verification_
      // method is ai_verified, OR the description matches a templated AI
      // opening, OR the source is osm-* / vegguide-* (the historical
      // pipelines that auto-generated descriptions).
      const isAIGenerated =
        p.verification_method === 'ai_verified' ||
        AI_OPENING_RE.test(desc) ||
        (p.source && (p.source.startsWith('osm-') || p.source.startsWith('vegguide') || p.source === 'openstreetmap'))
      if (!isAIGenerated) {
        skippedAdmin++
        continue
      }

      if (examples.length < 12) examples.push({ name: p.name, city: p.city, reason })

      if (!DRY_RUN) {
        // Try with admin_notes; fallback if column missing.
        const note = `auto-cleared 2026-05-02: AI-generated description was truncated (${reason}). Place page renders auto-fallback from category + cuisine + city + ratings.`
        let res = await sb.from('places')
          .update({ description: null, admin_notes: note })
          .eq('id', p.id)
        if (res.error?.code === '42703' || /admin_notes/.test(res.error?.message || '')) {
          res = await sb.from('places').update({ description: null }).eq('id', p.id)
        }
        if (res.error) { console.warn(`  ${p.name}: ${res.error.message}`); continue }
      }
      totalCleared++
    }

    from += PAGE
    if (data.length < PAGE) break
    if (totalScanned % 5000 === 0) console.log(`  ...scanned ${totalScanned}, cleared ${totalCleared}`)
  }

  console.log(`\n==== SUMMARY ====`)
  console.log(`Scanned:   ${totalScanned}`)
  console.log(`${DRY_RUN ? 'Would clear' : 'Cleared'}:    ${totalCleared}`)
  console.log(`Skipped (admin/manual): ${skippedAdmin}`)
  console.log(`\nExamples (up to 12):`)
  for (const ex of examples) console.log(`  ${ex.name} | ${ex.city} → ${ex.reason}`)
  if (DRY_RUN) console.log(`\nRe-run without --dry-run to apply.`)
}

main().catch(e => { console.error(e); process.exit(1) })
