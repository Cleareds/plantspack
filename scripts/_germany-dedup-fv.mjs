// Find and consolidate duplicate active Germany FV records by exact name+city.
// Keeps the canonical record (cleanest slug, most data); archives the rest.
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const NOW = new Date().toISOString()
const TAG = 'germany-dedup-fv-2026-05-19'

const all = []
let from = 0
while (true) {
  const { data } = await sb.from('places').select('id,slug,name,city,description,website,phone,opening_hours,main_image_url,created_at,verification_method,verification_level')
    .eq('country','Germany').eq('vegan_level','fully_vegan').is('archived_at',null).range(from,from+999)
  if (!data?.length) break
  all.push(...data); if (data.length<1000) break; from+=1000
}
console.log(`Active Germany FV: ${all.length}`)

const norm = (s) => (s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9 ]/g,'').replace(/\s+/g,' ').trim()
const groups = {}
for (const r of all) {
  const k = norm(r.city)+'|'+norm(r.name)
  if (!groups[k]) groups[k] = []
  groups[k].push(r)
}

function score(r) {
  let s = 0
  // Prefer "clean" slug — penalize trailing random suffix
  if (/-[a-z0-9]{4}$/.test(r.slug)) s -= 30
  if (/-\d+$/.test(r.slug)) s -= 10
  if (/-ma\d-/.test(r.slug)) s -= 20
  if (/-gie-en/.test(r.slug)) s -= 15  // gießen mojibake
  // Prefer record with website
  if (r.website && /^https?:/.test(r.website)) s += 25
  // Prefer record with longer description
  s += Math.min(20, Math.floor((r.description||'').length / 20))
  // Prefer record with image
  if (r.main_image_url) s += 15
  // Prefer record with phone
  if (r.phone) s += 5
  // Prefer record with opening_hours
  if (r.opening_hours) s += 8
  // Prefer older (more established)
  if (r.created_at) s -= new Date(r.created_at).getTime() / 1e15
  // Prefer higher verification level
  s += (r.verification_level || 0) * 3
  return s
}

const toArchive = []
const decisions = []
for (const [k, arr] of Object.entries(groups)) {
  if (arr.length === 1) continue
  arr.sort((a,b) => score(b) - score(a))
  const keeper = arr[0]
  const losers = arr.slice(1)
  decisions.push({ key: k, keeper: keeper.slug, losers: losers.map(l => l.slug) })
  for (const l of losers) toArchive.push(l)
}

console.log(`Duplicate groups found: ${decisions.length}`)
console.log(`Records to archive: ${toArchive.length}`)
for (const d of decisions) console.log(`  [${d.key.padEnd(40)}] keep=${d.keeper} archive=[${d.losers.join(', ')}]`)

// Archive losers
let ok = 0
for (let i = 0; i < toArchive.length; i += 50) {
  const chunk = toArchive.slice(i, i+50).map(r => r.id)
  const { error } = await sb.from('places').update({
    archived_at: NOW,
    verification_method: TAG,
  }).in('id', chunk)
  if (!error) { ok += chunk.length; process.stdout.write('.') }
}
console.log(`\n✓ Archived ${ok} duplicates`)
const { count: fv } = await sb.from('places').select('*',{count:'exact',head:true}).eq('country','Germany').eq('vegan_level','fully_vegan').is('archived_at',null)
console.log(`Germany FV active: ${fv}`)
