// OSM closure check 2026-10-15: 32 "relink" rows could not take the new osm_ref because another
// live place already holds it. Same name (token sets), within 120 m, same OSM object = the same
// venue imported twice. Archive the stale-ref row into the holder (slug alias), only if the stale
// row is an import-account row with no reviews; otherwise list it. Dry-run unless --apply.
import fs from 'node:fs'
import { createClient } from '@supabase/supabase-js'
const APPLY = process.argv.includes('--apply')
const IMPORT_ACCOUNT = 'd27f7c5e-2053-4c0c-8fd1-27ee3269ad1c'
const env = Object.fromEntries(fs.readFileSync('.env.local', 'utf8').split('\n').filter(l => l.includes('=')).map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]))
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const rel = JSON.parse(fs.readFileSync('reports/osm-closure/2026-10-15.json', 'utf8')).filter(r => r.status === 'relink')
const plan = [], hold = []
for (const r of rel) {
  const { data: me } = await sb.from('places').select('id,name,slug,city,osm_ref,review_count,created_by,archived_at').eq('id', r.id).single()
  if (!me || me.archived_at || me.osm_ref === r.new_ref) continue
  const { data: h } = await sb.from('places').select('id,name,slug,city,vegan_level,review_count,archived_at').eq('osm_ref', r.new_ref).is('archived_at', null).limit(1)
  if (!h?.length) continue
  const holder = h[0]
  const ok = (me.review_count || 0) === 0 && me.created_by === IMPORT_ACCOUNT
  ;(ok ? plan : hold).push({ me, holder })
  console.log(`${ok ? 'MERGE' : 'HOLD '} "${me.name}" (${me.city}, ${r.vegan_level}) -> "${holder.name}" (${holder.city}, ${holder.vegan_level})`)
}
console.log(`merge ${plan.length}, hold ${hold.length}`)
if (!APPLY) process.exit(0)
fs.writeFileSync('reports/osm-closure/2026-10-15-stale-dupes-rollback.json', JSON.stringify(plan.map(x => x.me), null, 1))
const now = new Date().toISOString()
for (const { me, holder } of plan) {
  if (me.slug) await sb.from('place_slug_aliases').upsert({ old_slug: me.slug, place_id: holder.id }, { onConflict: 'old_slug', ignoreDuplicates: true })
  const { error } = await sb.from('places').update({ archived_at: now, archived_reason: `duplicate_merged_into:${holder.id}` }).eq('id', me.id)
  if (error) console.error(me.id, error.message)
}
console.log('APPLIED')
