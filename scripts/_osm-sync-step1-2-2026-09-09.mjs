#!/usr/bin/env node
/**
 * Steps 1-2 of docs/osm-sync-plan.md. Dry-run by default; --apply to write.
 *
 * PART A - make places.osm_ref a usable key.
 *   287 osm_ref values are claimed by two live rows each. At most one row can
 *   own an OSM element, so the weaker claimant has its osm_ref CLEARED.
 *
 *   Clearing, not merging, on purpose: it removes only an unreliable link, no
 *   place disappears and no content changes, and it needs no judgement about
 *   whether the two rows are the same business. That judgement cannot be
 *   automated here - name similarity is useless for it ("Gajimaru" vs
 *   "ガジマル" score 0.00 and ARE the same venue; "The Vegan Bar" vs "Vegan Bar"
 *   both reduce to an empty token set). Genuine duplicates among these are
 *   still caught by the duplicate queue, where a human decides. Where the two
 *   rows are the same venue, the loser's ref pointed at the same element as
 *   the winner's, so clearing it loses nothing at all.
 *
 *   Owner = the row whose own source really is OSM (it came from that
 *   element), else the richer row. Neither test touches the name.
 *
 *   Every cleared value is written to backups/ first, so a one-line script can
 *   put them all back.
 *
 * PART B - lock human-set fields so the sync can never overwrite them.
 *   Locks only fields that are currently NON-NULL. Null fields stay unlocked
 *   deliberately: OSM filling a gap we never had adds data and overrides
 *   nothing, which is the mutual-benefit half of the deal.
 */
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { writeFileSync } from 'node:fs'

config({ path: '.env.local' })
const APPLY = process.argv.includes('--apply')
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const ADMIN = 'd27f7c5e-2053-4c0c-8fd1-27ee3269ad1c'
const STAMP = '2026-09-09'

/** Fields a human could have supplied, and that a sync might otherwise clobber. */
const HUMAN_FIELDS = ['name','description','address','city','latitude','longitude',
  'website','phone','opening_hours','vegan_level','category','subcategory','cuisine_types']
/** Editorial fields that are ours by definition, whoever set them. */
const OURS_ALWAYS = ['vegan_level','verification_level','verification_method','is_verified','description']

const page = async (sel, tweak = q => q) => {
  const out = []
  for (let off = 0; ; off += 1000) {
    const { data, error } = await tweak(sb.from('places').select(sel)).order('id').range(off, off + 999)
    if (error) throw error
    out.push(...data)
    if (data.length < 1000) break
  }
  return out
}

// ---------------------------------------------------------------- PART A
const COLS = 'id,name,slug,city,source,osm_ref,website,opening_hours,main_image_url,description,address,is_verified,verification_level,review_count,archived_at'
const linked = (await page(COLS, q => q.not('osm_ref', 'is', null))).filter(r => !r.archived_at)
const groups = {}
for (const r of linked) (groups[r.osm_ref] = groups[r.osm_ref] || []).push(r)
const colls = Object.entries(groups).filter(([, v]) => v.length > 1)

const isOsm = p => /osm|openstreetmap/i.test(p.source || '')
const score = p => (p.review_count || 0) * 100 + (p.is_verified ? 40 : 0) + (p.verification_level || 0) * 5 +
  (p.website ? 8 : 0) + (p.opening_hours ? 5 : 0) + (p.main_image_url ? 4 : 0) +
  (p.description && p.description.length > 20 ? 2 : 0) + (p.address && p.address.length > 12 ? 3 : 0)

const losers = []
for (const [ref, v] of colls) {
  const ranked = v.slice().sort((x, y) => (isOsm(y) - isOsm(x)) || (score(y) - score(x)) || (x.id < y.id ? -1 : 1))
  for (const l of ranked.slice(1)) losers.push({ id: l.id, name: l.name, slug: l.slug, source: l.source, osm_ref: ref, kept_by: ranked[0].id })
}
console.log(`PART A  colliding osm_ref values: ${colls.length}   rows losing their ref: ${losers.length}`)
console.log(`        rows keeping a now-unique ref: ${linked.length - losers.length}`)

// ---------------------------------------------------------------- PART B
const all = await page('id,created_by,archived_at,is_verified,verification_method,' + HUMAN_FIELDS.join(','))
const live = all.filter(r => !r.archived_at)
const byId = new Map(live.map(r => [r.id, r]))

const locks = new Map() // `${place_id}|${field}` -> row
const addLock = (place_id, field, source, updated_by) => {
  const p = byId.get(place_id)
  if (!p) return
  const v = p[field]
  // Only lock what actually holds a value. A null field left unlocked lets OSM
  // enrich us without ever overriding a human.
  const empty = v === null || v === undefined || v === '' || (Array.isArray(v) && v.length === 0)
  if (empty) return
  const k = `${place_id}|${field}`
  if (locks.has(k) && locks.get(k).source === 'user') return // user beats admin
  locks.set(k, { place_id, field, source, locked: true, updated_by: updated_by ?? null })
}

// B1: places a community member created - everything they filled in is theirs.
const community = live.filter(r => r.created_by && r.created_by !== ADMIN)
for (const p of community) for (const f of HUMAN_FIELDS) addLock(p.id, f, 'user', p.created_by)

// B2: approved user corrections - lock exactly the fields they changed.
const { data: corr, error: ce } = await sb.from('place_corrections')
  .select('place_id, user_id, corrections, status')
  .eq('status', 'approved').is('corrections->>proposed_action', null)
if (ce) throw ce
let corrFields = 0
for (const c of corr) {
  for (const f of Object.keys(c.corrections || {})) {
    if (!HUMAN_FIELDS.includes(f)) continue
    addLock(c.place_id, f, 'user', c.user_id)
    corrFields++
  }
}

// B3: admin judgement calls - the editorial fields are ours whoever asks.
const adminJudged = live.filter(r => r.is_verified === true || r.verification_method === 'admin_review')
for (const p of adminJudged) for (const f of OURS_ALWAYS) if (HUMAN_FIELDS.includes(f)) addLock(p.id, f, 'admin', null)

const lockRows = [...locks.values()]
const byPlace = new Set(lockRows.map(r => r.place_id))
console.log(`PART B  community-created places: ${community.length}   approved user corrections: ${corr.length} (${corrFields} field claims)`)
console.log(`        admin-judged places: ${adminJudged.length}`)
console.log(`        locks to write: ${lockRows.length} across ${byPlace.size} places`)
console.log(`        by source: user=${lockRows.filter(r => r.source === 'user').length} admin=${lockRows.filter(r => r.source === 'admin').length}`)

if (!APPLY) {
  console.log('\nDRY RUN - pass --apply to write.')
  console.log('sample refs to clear:')
  for (const l of losers.slice(0, 5)) console.log(`  ${l.osm_ref}  from "${l.name}" (${l.source})`)
  process.exit(0)
}

// Backup BEFORE writing. Restorable with a single update per row.
const backup = `backups/osm-ref-cleared-${STAMP}.json`
writeFileSync(backup, JSON.stringify({ cleared_at: new Date().toISOString(), rows: losers }, null, 2))
console.log(`\nbackup written: ${backup} (${losers.length} rows)`)

let cleared = 0
for (const l of losers) {
  const { error } = await sb.from('places').update({ osm_ref: null }).eq('id', l.id)
  if (error) throw error
  cleared++
}
console.log(`osm_ref cleared on ${cleared} rows`)

let wrote = 0
for (let i = 0; i < lockRows.length; i += 500) {
  const { error } = await sb.from('place_field_provenance')
    .upsert(lockRows.slice(i, i + 500), { onConflict: 'place_id,field' })
  if (error) throw error
  wrote += Math.min(500, lockRows.length - i)
}
console.log(`provenance locks written: ${wrote}`)
