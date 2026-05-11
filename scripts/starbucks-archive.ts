import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
config({ path: '.env.local' })

// Archive (NOT delete) every active Starbucks row. Sets archived_at = now()
// so the rows disappear from the live site but are fully reversible:
//
//   UPDATE places SET archived_at = NULL
//   WHERE name ~* '(^|[\\s.,])starbucks([\\s.,]|$)' AND source = 'osm-import-2026-04'
//
// Per CLAUDE.md we never DELETE without explicit "Yes delete." — archive
// keeps the data in place. Source tag is osm-import-2026-04 for all 251
// rows, which makes the un-archive query unambiguous.

async function main() {
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

  // Collect ids first so we have an audit trail of exactly what changed.
  const { data: rows, error: selErr } = await sb
    .from('places')
    .select('id, slug, name, city, country, vegan_level')
    .or('name.ilike.starbucks,name.ilike.starbucks %,name.ilike.% starbucks,name.ilike.% starbucks %,name.ilike.starbucks coffee%,name.ilike.starbucks reserve%')
    .is('archived_at', null)
    .limit(2000)
  if (selErr) { console.error(selErr); return }
  console.log('Rows to archive:', rows?.length)

  if (!rows || rows.length === 0) return

  // Update in batches to stay friendly to the API.
  const ids = rows.map(r => r.id)
  const now = new Date().toISOString()
  const BATCH = 100
  let updated = 0
  for (let i = 0; i < ids.length; i += BATCH) {
    const slice = ids.slice(i, i + BATCH)
    const { error: upErr, count } = await sb
      .from('places')
      .update({ archived_at: now }, { count: 'exact' })
      .in('id', slice)
    if (upErr) { console.error(upErr); return }
    updated += count ?? slice.length
    console.log(`  batch ${i / BATCH + 1}: updated ${count ?? slice.length} rows (running total ${updated})`)
  }
  console.log('\n✓ archived', updated, 'Starbucks rows')
  console.log('  reverse with: UPDATE places SET archived_at = NULL WHERE id IN (...)')
}
main()
