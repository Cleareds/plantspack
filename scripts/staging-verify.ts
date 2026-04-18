#!/usr/bin/env tsx
/**
 * Tier-2 pass: for every `decision='pending'` row in `place_staging`, fetch
 * the website, run the vegan-signal classifier, compute the quality score,
 * and persist decision + reason + breakdown.
 *
 * No paid APIs. Uses native fetch (~5-6h for 100K rows at concurrency 30).
 *
 * Usage:
 *   tsx scripts/staging-verify.ts --limit=500       # dry-run 500 pending rows
 *   tsx scripts/staging-verify.ts --limit=500 --commit
 *   tsx scripts/staging-verify.ts --commit           # full unverified pool
 *   tsx scripts/staging-verify.ts --commit --concurrency=20
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { verifyWebsite, persistableSignal } from '../src/lib/places/website-verify'
import { classifyVegan } from '../src/lib/places/vegan-signal'
import { scoreCandidate } from '../src/lib/places/score'

dotenv.config({ path: '.env.local' })

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

const args = process.argv.slice(2)
const commit = args.includes('--commit')
const limit = Number(args.find(a => a.startsWith('--limit='))?.split('=')[1] ?? 0)
const concurrency = Number(args.find(a => a.startsWith('--concurrency='))?.split('=')[1] ?? 25)

type Decision = 'auto_import' | 'needs_review' | 'reject'

interface StagingRow {
  id: string
  source: string
  source_id: string
  name: string
  latitude: number
  longitude: number
  city: string | null
  country: string | null
  website: string | null
  phone: string | null
  categories: string[] | null
  date_refreshed: string | null
  required_fields_ok: boolean
  freshness_ok: boolean
  chain_filtered: boolean
}

async function loadPendingRows(lim: number): Promise<StagingRow[]> {
  const PAGE = 1000
  let off = 0
  const out: StagingRow[] = []
  const cap = lim > 0 ? lim : Infinity
  while (out.length < cap) {
    const take = Math.min(PAGE, cap - out.length)
    const { data, error } = await supabase
      .from('place_staging')
      .select('id, source, source_id, name, latitude, longitude, city, country, website, phone, categories, date_refreshed, required_fields_ok, freshness_ok, chain_filtered')
      .eq('decision', 'pending')
      .order('created_at', { ascending: true })
      .range(off, off + take - 1)
    if (error) throw error
    if (!data || data.length === 0) break
    out.push(...(data as StagingRow[]))
    off += data.length
    if (data.length < take) break
  }
  return out
}

async function processOne(row: StagingRow) {
  const website = row.website ? await verifyWebsite(row.website, { timeoutMs: 6000, includeExcerpt: true }) : null

  const vegan = classifyVegan({
    name: row.name,
    sourceCategories: row.categories,
    website,
  })

  const score = scoreCandidate({
    gate: {
      reject: null,  // row is already past Tier 1
      required_fields_ok: row.required_fields_ok,
      freshness_ok: row.freshness_ok,
      chain_filtered: row.chain_filtered,
    },
    website,
    vegan,
    hasPhone: Boolean(row.phone),
    dateRefreshed: row.date_refreshed,
    country: row.country,
  })

  // Persist-safe signal (strip body_excerpt, it's 64K of HTML)
  const persist = website ? persistableSignal(website) : null

  return {
    row_id: row.id,
    update: {
      website_ok: website?.ok ?? false,
      website_checked_at: new Date().toISOString(),
      website_signal: persist,
      vegan_level: vegan.level,
      vegan_confidence: vegan.confidence,
      vegan_evidence: vegan.evidence,
      quality_score: score.score,
      decision: score.decision as Decision,
      decision_reason: score.reason,
      updated_at: new Date().toISOString(),
    },
    score,
    vegan,
  }
}

async function main() {
  console.log(`Mode: ${commit ? 'COMMIT' : 'DRY-RUN'}${limit ? ` (limit ${limit})` : ''} · concurrency=${concurrency}`)
  const rows = await loadPendingRows(limit)
  console.log(`Loaded ${rows.length} pending staging rows\n`)
  if (rows.length === 0) { console.log('Nothing to do.'); return }

  const stats = {
    auto_import: 0, needs_review: 0, reject: 0,
    vegan_levels: { fully_vegan: 0, vegan_friendly: 0, vegetarian_reject: 0, unknown: 0 } as Record<string, number>,
    website_ok: 0, website_fail: 0,
  }
  const sample: any[] = []
  const startTs = Date.now()

  let idx = 0
  async function worker(workerId: number) {
    while (true) {
      const i = idx++
      if (i >= rows.length) return
      const row = rows[i]
      try {
        const result = await processOne(row)
        stats[result.score.decision]++
        stats.vegan_levels[result.vegan.level] = (stats.vegan_levels[result.vegan.level] ?? 0) + 1
        if (result.update.website_ok) stats.website_ok++; else stats.website_fail++

        if (sample.length < 30) sample.push({
          name: row.name, city: row.city, score: result.score.score,
          decision: result.score.decision, vegan: result.vegan.level,
          vegan_conf: result.vegan.confidence, reason: result.score.reason,
          website: row.website,
        })

        if (commit) {
          const { error } = await supabase.from('place_staging').update(result.update).eq('id', row.id)
          if (error) console.error(`  update err ${row.id}: ${error.message}`)
        }
      } catch (e: any) {
        stats.website_fail++
        if (commit) {
          await supabase.from('place_staging').update({
            website_ok: false,
            website_checked_at: new Date().toISOString(),
            decision: 'reject',
            decision_reason: `verify_error:${e?.message ?? 'unknown'}`.slice(0, 200),
            updated_at: new Date().toISOString(),
          }).eq('id', row.id)
        }
      }

      if ((i + 1) % 100 === 0) {
        const elapsed = (Date.now() - startTs) / 1000
        const rate = (i + 1) / elapsed
        const eta = (rows.length - (i + 1)) / rate
        console.log(`  ${i + 1}/${rows.length}  rate=${rate.toFixed(1)}/s  ETA=${Math.round(eta / 60)}min  auto=${stats.auto_import} review=${stats.needs_review} reject=${stats.reject}`)
      }
    }
  }

  await Promise.all(Array.from({ length: concurrency }, (_, id) => worker(id)))

  console.log('\n=== STAGING-VERIFY RESULT ===')
  console.log(`Decision: auto_import=${stats.auto_import} needs_review=${stats.needs_review} reject=${stats.reject}`)
  console.log(`Vegan level:`, stats.vegan_levels)
  console.log(`Website: ok=${stats.website_ok} fail=${stats.website_fail}`)

  console.log('\nSample (first 20):')
  for (const s of sample.slice(0, 20)) {
    console.log(`  [${s.decision.padEnd(13)}] score=${s.score.toString().padStart(3)} ${s.vegan.padEnd(17)} (${s.vegan_conf?.toFixed(2)}) · ${s.name} (${s.city}) · ${s.reason}`)
  }
  if (!commit) console.log('\n(dry-run — rerun with --commit to persist)')
}

main().catch(e => { console.error(e); process.exit(1) })
