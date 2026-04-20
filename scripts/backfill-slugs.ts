#!/usr/bin/env tsx
/**
 * Backfill place slugs after the regex-case bug fix (migration
 * 20260420000000_fix_slug_trigger_case.sql).
 *
 * For every place whose current slug is a stale artifact of the old
 * generator, generate the correct slug from name + city, save the old slug
 * to `place_slug_aliases`, and update the place. Handles uniqueness
 * collisions with a numeric suffix.
 *
 * Does NOT change slugs that were explicitly set by admin (manual slugs
 * would typically be well-formed and match the correct algorithm anyway).
 *
 * Usage:
 *   tsx scripts/backfill-slugs.ts              # dry-run report
 *   tsx scripts/backfill-slugs.ts --commit     # persist + populate aliases
 *   tsx scripts/backfill-slugs.ts --limit=500  # smaller batch
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

const commit = process.argv.includes('--commit')
const limit = Number(process.argv.find(a => a.startsWith('--limit='))?.split('=')[1] ?? 0)

/** Mirrors the corrected Postgres trigger. */
function computeSlug(name: string, city: string | null): string {
  const base = (name + (city ? '-' + city : '')).normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
  const slug = base
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return slug.slice(0, 100)
}

interface Row {
  id: string
  name: string
  city: string | null
  slug: string | null
}

async function loadAll(): Promise<Row[]> {
  const out: Row[] = []
  const PAGE = 1000
  let off = 0
  while (true) {
    const { data, error } = await supabase
      .from('places')
      .select('id, name, city, slug')
      .is('archived_at', null)
      .order('id', { ascending: true })
      .range(off, off + PAGE - 1)
    if (error) throw error
    if (!data || data.length === 0) break
    out.push(...(data as Row[]))
    off += data.length
    if (data.length < PAGE) break
  }
  return out
}

async function main() {
  console.log(`Mode: ${commit ? 'COMMIT' : 'DRY-RUN'}${limit ? ` (limit ${limit})` : ''}`)
  const all = await loadAll()
  console.log(`Loaded ${all.length} places\n`)

  const target = limit > 0 ? all.slice(0, limit) : all

  // Build a view of CURRENT slugs in the DB so we can avoid collisions.
  const slugsInUse = new Set<string>(all.map(r => r.slug!).filter(Boolean))

  let needsUpdate = 0
  let skipped = 0
  let updated = 0
  let failed = 0

  for (const r of target) {
    if (!r.name) { skipped++; continue }
    const correct = computeSlug(r.name, r.city)
    if (!correct) { skipped++; continue }
    if (r.slug === correct) { skipped++; continue }
    // Already-correct slug? check if the old slug has the same starting letter
    // as the correct slug. If yes, probably fine. We skip anything already-good.

    // Pick a non-colliding slug: correct, correct-2, correct-3, ...
    let candidate = correct
    let counter = 1
    while (slugsInUse.has(candidate)) {
      counter++
      candidate = `${correct}-${counter}`
    }

    needsUpdate++

    if (!commit) {
      if (needsUpdate <= 20) console.log(`  ${r.name.slice(0, 40).padEnd(40)} | ${(r.slug ?? '(null)').slice(0, 45).padEnd(45)} → ${candidate}`)
      continue
    }

    // Write alias + update slug. Upsert alias in case script runs twice.
    const oldSlug = r.slug
    if (oldSlug && oldSlug !== candidate) {
      const { error: aliasErr } = await supabase
        .from('place_slug_aliases')
        .upsert({ old_slug: oldSlug, place_id: r.id }, { onConflict: 'old_slug' })
      if (aliasErr) {
        failed++
        console.error(`  alias err ${r.id}: ${aliasErr.message}`)
        continue
      }
    }

    // Retry on unique-constraint violation — our in-memory `slugsInUse` may
    // miss rows added between initial load and now, or collisions introduced
    // by a prior partial run.
    let ok = false
    for (let attempt = 0; attempt < 5; attempt++) {
      const { error: updErr } = await supabase
        .from('places')
        .update({ slug: candidate })
        .eq('id', r.id)
      if (!updErr) { ok = true; break }
      if (updErr.code !== '23505' && !updErr.message.includes('duplicate')) {
        console.error(`  update err ${r.id}: ${updErr.message}`)
        break
      }
      // Bump counter and retry with new candidate.
      counter++
      candidate = `${correct}-${counter}`
      slugsInUse.add(candidate)  // best-effort
    }
    if (!ok) { failed++; continue }

    // Mark slug as in-use, free old slug (we may want to reuse it for a
    // different row later — unlikely, but harmless).
    slugsInUse.add(candidate)
    if (oldSlug) slugsInUse.delete(oldSlug)
    updated++
    if (updated % 500 === 0) console.log(`  ${updated} updated / ${needsUpdate} to go`)
  }

  console.log('\n=== SLUG BACKFILL ===')
  console.log({ scanned: target.length, needsUpdate, skipped, updated, failed })
  if (!commit) console.log('\n(dry-run — rerun with --commit to persist)')
}

main().catch(e => { console.error(e); process.exit(1) })
