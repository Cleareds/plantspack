// Drains the no-op queue: places already at vegan_options (lowest level)
// that still carry google_review_flag. The flag was added by an earlier
// audit but there's nowhere lower to demote them to, so they sit in
// /admin/data-quality forever doing nothing.
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

async function main() {
  const env = readFileSync('.env.local', 'utf8').split('\n').reduce((a: any, l) => {
    const m = l.match(/^([A-Z_]+)=(.*)$/); if (m) a[m[1]] = m[2].replace(/^["']|["']$/g, ''); return a
  }, {})
  const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

  const { data, error } = await sb.from('places')
    .select('id, name, city, country, vegan_level, tags')
    .eq('vegan_level', 'vegan_options')
    .is('archived_at', null)
    .contains('tags', ['google_review_flag'])
  if (error) throw error

  console.log(`found ${data?.length ?? 0} places at vegan_options with google_review_flag`)
  if (!data || data.length === 0) return

  let cleared = 0
  for (const p of data) {
    const newTags = (p.tags || []).filter((t: string) => t !== 'google_review_flag')
    const { error: upErr } = await sb.from('places')
      .update({ tags: newTags, updated_at: new Date().toISOString() })
      .eq('id', p.id)
    if (upErr) {
      console.error(`  FAIL ${p.name} (${p.id}): ${upErr.message}`)
      continue
    }
    cleared++
  }
  console.log(`cleared google_review_flag from ${cleared}/${data.length} places`)
}
main().catch(e => { console.error(e); process.exit(1) })
