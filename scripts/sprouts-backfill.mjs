// Backfill Sprouts for admin user(s).
//
// Honest backfill: we only award add_place credit for places that were
// genuinely added by hand (verification_method='admin_review' or a similar
// manual tag), NOT for the 44k+ bulk-imported rows where the admin user is
// merely listed as created_by.
//
// Idempotent on re-run: skips actions when a ledger row with the same
// (user_id, action_type, reference_id) already exists, and skips
// profile-field awards when an entry for that action_type already exists.
//
// Backfill does NOT apply the supporter multiplier.
//
//   --dry-run    (default) print summary
//   --apply      write to ledger + recompute totals
//   --user <id>  single user (default: all role='admin')

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})

const APPLY = process.argv.includes('--apply')
const argUserIdx = process.argv.indexOf('--user')
const argUser = argUserIdx > 0 ? process.argv[argUserIdx + 1] : null

const AMOUNTS = {
  add_place: 200,
  add_place_with_image: 250,
  place_correction_approved: 40,
  review_text: 30,
  review_with_photo: 80,
  review_with_video: 120,
  post_share_journey: 150,
  post_recipe: 100,
  post_tip: 40,
  'profile.is_vegan': 10,
  'profile.vegan_since': 20,
  'profile.vegan_reasons': 15,
  'profile.transition_story': 80,
  'profile.favourite_vegan_meal': 10,
  'profile.current_challenges': 15,
  'profile.dietary_specifics': 15,
  'profile.cooking_frequency': 10,
  'profile.home_city': 10,
  'profile.bio': 15,
  'profile.avatar': 20,
}

// verification_method values that represent a genuine manual add (not bulk import).
const MANUAL_ADD_METHODS = new Set(['admin_review', 'manual'])

async function targetUsers() {
  if (argUser) return [argUser]
  const { data } = await sb.from('users').select('id').eq('role', 'admin')
  return (data || []).map(u => u.id)
}

async function existingLedgerKeys(userId, actionTypes) {
  const keys = new Set()
  const { data } = await sb.from('user_sprouts_ledger')
    .select('action_type, reference_id').eq('user_id', userId).is('reversed_at', null)
    .in('action_type', actionTypes)
  for (const r of data || []) keys.add(`${r.action_type}|${r.reference_id ?? ''}`)
  return keys
}

async function bulkInsert(rows) {
  if (!rows.length) return 0
  let ok = 0
  for (let i = 0; i < rows.length; i += 500) {
    const chunk = rows.slice(i, i + 500)
    const { error } = await sb.from('user_sprouts_ledger').insert(chunk)
    if (!error) ok += chunk.length
    else console.log(`  insert error: ${error.message}`)
  }
  return ok
}

async function backfillUser(userId) {
  const { data: profile } = await sb.from('users').select('*').eq('id', userId).single()
  console.log(`\n=== Backfill for ${userId} (@${profile.username}) ===`)

  const rows = []          // ledger rows to insert
  let counts = {}
  const bump = (k, n=1) => counts[k] = (counts[k]||0)+n

  // Existing keys lookup (so re-runs are idempotent)
  const existing = await existingLedgerKeys(userId, [
    'add_place','add_place_with_image','review_text','review_with_photo','review_with_video',
    'place_correction_approved','post_share_journey','post_recipe','post_tip',
    ...Object.keys(AMOUNTS).filter(k => k.startsWith('profile.')),
  ])
  const seen = key => existing.has(key)

  // 1. Manually-added places only.
  let from = 0
  while (true) {
    const { data: places } = await sb.from('places')
      .select('id, main_image_url, verification_method, created_at')
      .eq('created_by', userId)
      .is('archived_at', null)
      .in('verification_method', Array.from(MANUAL_ADD_METHODS))
      .range(from, from + 999)
    if (!places?.length) break
    for (const p of places) {
      const action = p.main_image_url ? 'add_place_with_image' : 'add_place'
      const key = `${action}|${p.id}`
      if (seen(key)) { bump(`${action}_skip`); continue }
      const amt = AMOUNTS[action]
      rows.push({
        user_id: userId, amount: amt, base_amount: amt, multiplier: 1.0,
        action_type: action, reference_type: 'place', reference_id: p.id,
        metadata: { backfill: true, verification_method: p.verification_method },
        created_at: p.created_at,
      })
      bump(action)
    }
    if (places.length < 1000) break
    from += 1000
  }

  // 2. Reviews
  const { data: reviews } = await sb.from('place_reviews')
    .select('id, images, video_url, content, created_at')
    .eq('user_id', userId).is('deleted_at', null)
  for (const r of reviews || []) {
    const action = r.video_url ? 'review_with_video'
      : (r.images && r.images.length > 0) ? 'review_with_photo' : 'review_text'
    if (seen(`${action}|${r.id}`)) { bump(`${action}_skip`); continue }
    const amt = AMOUNTS[action]
    rows.push({
      user_id: userId, amount: amt, base_amount: amt, multiplier: 1.0,
      action_type: action, reference_type: 'review', reference_id: r.id,
      metadata: { backfill: true }, created_at: r.created_at,
    })
    bump(action)
  }

  // 3. Approved corrections
  const { data: corrs } = await sb.from('place_corrections')
    .select('id, created_at').eq('user_id', userId).eq('status', 'approved')
  for (const c of corrs || []) {
    if (seen(`place_correction_approved|${c.id}`)) { bump('correction_skip'); continue }
    const amt = AMOUNTS.place_correction_approved
    rows.push({
      user_id: userId, amount: amt, base_amount: amt, multiplier: 1.0,
      action_type: 'place_correction_approved', reference_type: 'correction', reference_id: c.id,
      metadata: { backfill: true }, created_at: c.created_at,
    })
    bump('place_correction_approved')
  }

  // 4. Posts
  const { data: posts } = await sb.from('posts')
    .select('id, category, content_type, created_at').eq('user_id', userId)
  for (const p of posts || []) {
    let action = null
    if (p.category === 'journey' || p.content_type === 'journey') action = 'post_share_journey'
    else if (p.category === 'recipe' || p.content_type === 'recipe') action = 'post_recipe'
    else if (p.category === 'tip') action = 'post_tip'
    if (!action) continue
    if (seen(`${action}|${p.id}`)) { bump(`${action}_skip`); continue }
    const amt = AMOUNTS[action]
    rows.push({
      user_id: userId, amount: amt, base_amount: amt, multiplier: 1.0,
      action_type: action, reference_type: 'post', reference_id: p.id,
      metadata: { backfill: true }, created_at: p.created_at,
    })
    bump(action)
  }

  // 5. Profile fields (one-time, idempotent on action_type alone)
  const profileChecks = [
    ['profile.is_vegan', profile.is_vegan],
    ['profile.vegan_since', profile.vegan_since],
    ['profile.vegan_reasons', profile.vegan_reasons?.length],
    ['profile.transition_story', profile.transition_story],
    ['profile.favourite_vegan_meal', profile.favourite_vegan_meal],
    ['profile.current_challenges', profile.current_challenges?.length],
    ['profile.dietary_specifics', profile.dietary_specifics?.length],
    ['profile.cooking_frequency', profile.cooking_frequency],
    ['profile.home_city', profile.home_city],
    ['profile.bio', profile.bio],
    ['profile.avatar', profile.avatar_url],
  ]
  for (const [action, present] of profileChecks) {
    if (!present) continue
    // Idempotency: any non-reversed ledger entry for this action_type, regardless of reference_id
    if (existing.has(`${action}|`) || existing.has(`${action}|null`)) { bump(`${action}_skip`); continue }
    const { count } = await sb.from('user_sprouts_ledger')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId).eq('action_type', action).is('reversed_at', null)
    if (count > 0) { bump(`${action}_skip`); continue }
    const amt = AMOUNTS[action]
    rows.push({
      user_id: userId, amount: amt, base_amount: amt, multiplier: 1.0,
      action_type: action, reference_type: 'profile_field', reference_id: null,
      metadata: { backfill: true }, created_at: new Date().toISOString(),
    })
    bump(action)
  }

  console.log(`  Planned awards: ${rows.length}`)
  const total = rows.reduce((s, r) => s + r.amount, 0)
  console.log(`  Total Sprouts to award: ${total.toLocaleString()}`)
  console.log('  Per-action breakdown:')
  for (const [k, v] of Object.entries(counts).sort((a,b)=>b[1]-a[1])) {
    console.log(`    ${v.toString().padStart(6)}  ${k}`)
  }

  if (APPLY) {
    const ok = await bulkInsert(rows)
    console.log(`  ✓ Inserted ${ok}/${rows.length} ledger rows`)
    // Recompute totals
    const { data: all } = await sb.from('user_sprouts_ledger')
      .select('amount').eq('user_id', userId).is('reversed_at', null)
    let lifetime = 0, balance = 0
    for (const r of all || []) { if (r.amount > 0) lifetime += r.amount; balance += r.amount }
    await sb.from('users').update({ sprouts_lifetime: lifetime, sprouts_balance: balance }).eq('id', userId)
    console.log(`  ✓ Recomputed: lifetime=${lifetime.toLocaleString()}, balance=${balance.toLocaleString()}`)
  } else {
    console.log('  (dry-run — pass --apply to write)')
  }
}

const users = await targetUsers()
console.log(`Backfill: ${APPLY ? 'APPLY' : 'DRY-RUN'} | Users: ${users.length}`)
for (const u of users) await backfillUser(u)
console.log('\nDone.')
