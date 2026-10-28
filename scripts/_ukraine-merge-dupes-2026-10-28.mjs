// Merge 12 same-coordinate duplicate pairs in Ukraine (two OSM import batches of one venue,
// one row with the local name, one with a Latin name). Found by the external Ukraine audit
// (research/plantspack_ukraine_automated_review.json), checked by hand 2026-10-28.
// Winner keeps the osm_ref (moved from the loser if needed) and the loser's missing fields;
// loser is archived with a slug alias. Vegan level: the lower of the two when they disagree.
// Dry-run by default; --apply writes. Rollback: reports/ukraine-audit/rollback-merge-2026-10-28.json
import fs from 'node:fs'
import { createClient } from '@supabase/supabase-js'
const APPLY = process.argv.includes('--apply')
const env = Object.fromEntries(fs.readFileSync('.env.local', 'utf8').split('\n').filter(l => l.includes('=')).map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]))
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const ORDER = ['vegan_options', 'vegan_friendly', 'mostly_vegan', 'fully_vegan']
// [winner, loser, vegan_level override or null, replace description with loser's plain text]
const PAIRS = [
  ['d6078627-2f63-45df-8ed0-0b607984ee6c', '74d9feb3-8712-41f1-8069-3eefc0a467cc', null, false],
  ['561c5815-5093-4aee-9739-4df8377d83ae', '31e12315-8956-4eca-8a47-ce34bed3178b', null, true],
  ['6263fc10-f2d3-44e3-a485-ee1aa7fa7272', '794b6235-61b4-4fcf-b366-4b4929d8ed0a', null, true],
  ['d11b3369-87a4-4065-98a2-7f0c23113f4d', 'a01cc3de-5df1-4a61-b5ce-ff75c1a1a8b6', null, true],
  ['aad620ba-de28-4563-9e62-4ebf19eedc53', '9717e083-e959-4860-9e4d-3bca5ef84189', null, true],
  ['8141e287-4ba9-4dd8-8b9d-4a9db278b956', 'ce3ee769-b54e-4dd6-b4ba-281259fc6919', 'mostly_vegan', false],
  ['c1c68cd7-1475-4699-9727-4db34308486e', '901b7482-0b04-47a4-898b-1a3ce9ba4b48', null, false],
  ['5f858495-1aeb-4943-84a3-0f3bd308cd48', 'd73bdc75-8cd1-4018-ba2b-4902e90911bd', null, false],
  ['5d6bfce4-d002-4db7-93fe-0b4eace09167', '29cd16a6-43e0-4254-bf33-ad9b3a6525a3', null, false],
  ['e50bdf6f-d79b-4f10-8bbf-0dcdb727de4a', '81592aee-8971-4eef-ba81-af634a9fadd5', null, false],
  ['5ecb8c83-ed89-4d22-aa0a-41bce8ecf370', 'a17aed27-7f53-4c75-ae15-8c74b1e9b17b', null, false],
  ['7a5454a9-080e-4615-9d89-0d29c05bf6de', 'f7f06abd-1b24-4e8a-82b9-04e9a8fc3131', 'fully_vegan', false],
]
const COLS = 'id,name,slug,city,vegan_level,osm_ref,website,phone,main_image_url,opening_hours,description,archived_at,archived_reason'
const { data, error } = await sb.from('places').select(COLS).in('id', PAIRS.flat().filter(x => typeof x === 'string' && x.includes('-')))
if (error) throw error
const P = Object.fromEntries(data.map(p => [p.id, p]))
const plan = []
for (const [w, l, lvl, plainDesc] of PAIRS) {
  const W = P[w], L = P[l]
  if (!W || !L || W.archived_at || L.archived_at) { console.log('skip', w, l); continue }
  const upd = {}
  for (const c of ['website', 'phone', 'main_image_url', 'opening_hours']) if (!W[c] && L[c]) upd[c] = L[c]
  if (!W.osm_ref && L.osm_ref) upd.osm_ref = L.osm_ref
  const level = lvl || ORDER[Math.min(ORDER.indexOf(W.vegan_level), ORDER.indexOf(L.vegan_level))]
  if (level !== W.vegan_level) upd.vegan_level = level
  if (plainDesc) upd.description = L.description
  plan.push({ W, L, upd })
  console.log(`keep "${W.name}" (${W.city}) archive "${L.name}" (${L.city})  ${JSON.stringify(upd)}`)
}
if (!APPLY) { console.log('DRY RUN'); process.exit(0) }
fs.writeFileSync('reports/ukraine-audit/rollback-merge-2026-10-28.json', JSON.stringify(plan.map(p => ({ winner: p.W, loser: p.L })), null, 1))
const now = new Date().toISOString()
for (const { W, L, upd } of plan) {
  let r = await sb.from('place_slug_aliases').upsert({ old_slug: L.slug, place_id: W.id }, { onConflict: 'old_slug', ignoreDuplicates: true })
  if (r.error) throw r.error
  r = await sb.from('places').update({ archived_at: now, archived_reason: `duplicate_merged_into:${W.id}`, ...(upd.osm_ref ? { osm_ref: null } : {}) }).eq('id', L.id)
  if (r.error) throw r.error
  if (Object.keys(upd).length) { r = await sb.from('places').update(upd).eq('id', W.id); if (r.error) throw r.error }
}
console.log(`merged ${plan.length}`)
