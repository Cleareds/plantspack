#!/usr/bin/env tsx
/**
 * Promote all VegGuide L5 (pure vegan) imports from vegan_friendly → fully_vegan.
 * Only touches rows where source=vegguide-import-2026-04-17 AND tags contains 'vegguide-l5-pure-vegan'.
 *
 * Usage:
 *   tsx scripts/vegguide-promote-l5.ts            # dry-run count
 *   tsx scripts/vegguide-promote-l5.ts --commit   # persist
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

const commit = process.argv.includes('--commit')

async function main() {
  const { count } = await supabase
    .from('places')
    .select('*', { count: 'exact', head: true })
    .eq('source', 'vegguide-import-2026-04-17')
    .contains('tags', ['vegguide-l5-pure-vegan'])

  console.log(`Would promote ${count} places from vegan_friendly → fully_vegan`)
  if (!commit) {
    console.log('(dry-run — rerun with --commit)')
    return
  }

  // Paginate through targets and update in batches
  const PAGE = 500
  let off = 0
  let updated = 0
  while (true) {
    const { data, error } = await supabase
      .from('places')
      .select('id')
      .eq('source', 'vegguide-import-2026-04-17')
      .contains('tags', ['vegguide-l5-pure-vegan'])
      .order('id', { ascending: true })
      .range(off, off + PAGE - 1)
    if (error) throw error
    if (!data || data.length === 0) break
    const ids = data.map(r => r.id)
    const { error: uerr } = await supabase
      .from('places')
      .update({ vegan_level: 'fully_vegan' })
      .in('id', ids)
    if (uerr) { console.error('update err', uerr.message); break }
    updated += ids.length
    console.log(`  ${updated}/${count}`)
    if (data.length < PAGE) break
    off += data.length
  }
  console.log(`Done. Promoted ${updated} places.`)
}

main().catch(e => { console.error(e); process.exit(1) })
