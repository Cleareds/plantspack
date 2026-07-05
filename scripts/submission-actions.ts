#!/usr/bin/env tsx
/**
 * Mechanics for the approve-submissions skill (the "short add-place" flow for
 * mobile place submissions). The skill does the judgment (dedupe verdicts,
 * vegan-level verification via WebSearch); this CLI does the DB work.
 *
 * Subcommands:
 *   count                        Print the number of pending submissions (cron guard).
 *   list                         Pending submissions as JSON, each with `dupeCandidates`
 *                                (existing places with a similar name in the same city
 *                                or within ~500m of the submitted coords).
 *   fix <id> [--website U] [--city C] [--country C] [--category C] [--vegan-level L]
 *                                Correct submission fields before approving (e.g. swap
 *                                an Instagram "website" for the real site).
 *   approve <id> [--vegan-level L] [--note "…"]
 *                                Publish via the shared approveSubmission (geocode →
 *                                place insert → creator credit → feed post → notify
 *                                submitter + nearby users).
 *   duplicate <id> --place-id P [--note "…"]
 *                                The place already exists: credit the submitter as
 *                                co_submitter on it, link + close the submission,
 *                                notify the submitter. Nothing is deleted.
 *   hold <id> --note "…"         Keep pending for human review; prefixes the note with
 *                                'auto-hold:' so the skill skips it on later runs. It
 *                                stays visible in the /admin submissions queue.
 *   digest --file <json>         Email the ops digest (same email as the old daily batch).
 *
 * Never deletes anything, never sets is_verified/admin_review (per CLAUDE.md).
 */
import { config } from 'dotenv'
config({ path: '.env.local', quiet: true })

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { approveSubmission } from '@/lib/submissions/approve'
import { createNotification } from '@/lib/notifications/server'
import { normalizeCity } from '@/lib/normalize-city'
import { normalizeCountry } from '@/lib/normalize-country'
import { sendSubmissionsDigestEmail, type SubmissionDigestItem } from '@/lib/email'

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const ADMIN_DIGEST_TO = 'anton.kravchuk@cleareds.com'

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name)
  return i >= 0 && !process.argv[i + 1]?.startsWith('--') ? process.argv[i + 1] : undefined
}
function fail(msg: string): never { console.error(msg); process.exit(1) }

async function pending() {
  const { data, error } = await sb.from('place_submissions')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
  if (error) fail(`load failed: ${error.message}`)
  return data || []
}

/** Existing places that might be the same venue: name-token match in the same
 *  city, plus a ~500m bounding-box match when the submission has coords. */
async function dupeCandidates(s: any) {
  const out = new Map<string, any>()
  const city = normalizeCity(s.city, s.country) || s.city
  const tokens = String(s.name).toLowerCase().split(/[^\p{L}\p{N}]+/u)
    .filter((t: string) => t.length >= 4 && !['restaurant', 'pizzeria', 'gelateria', 'osteria', 'cafe', 'caffe', 'vegan'].includes(t))
  const nameFilters = [`name.ilike.%${s.name}%`, ...tokens.slice(0, 3).map((t: string) => `name.ilike.%${t}%`)]

  if (city) {
    const { data } = await sb.from('places')
      .select('id, slug, name, address, city, vegan_level, source')
      .ilike('city', city)
      .or(nameFilters.join(','))
      .limit(5)
    for (const p of data || []) out.set(p.id, p)
  }
  if (s.latitude != null && s.longitude != null) {
    const { data } = await sb.from('places')
      .select('id, slug, name, address, city, vegan_level, source')
      .gte('latitude', s.latitude - 0.005).lte('latitude', s.latitude + 0.005)
      .gte('longitude', s.longitude - 0.007).lte('longitude', s.longitude + 0.007)
      .or(nameFilters.join(','))
      .limit(5)
    for (const p of data || []) out.set(p.id, p)
  }
  return Array.from(out.values())
}

async function main() {
  const cmd = process.argv[2]

  if (cmd === 'count') {
    const { count, error } = await sb.from('place_submissions')
      .select('id', { count: 'exact', head: true }).eq('status', 'pending')
    if (error) fail(error.message)
    console.log(count ?? 0)
    return
  }

  if (cmd === 'list') {
    const subs = await pending()
    const userIds = [...new Set(subs.map(s => s.user_id).filter(Boolean))]
    const { data: users } = userIds.length
      ? await sb.from('users').select('id, username').in('id', userIds)
      : { data: [] }
    const enriched = []
    for (const s of subs) {
      enriched.push({
        ...s,
        submitter: (users || []).find(u => u.id === s.user_id)?.username || null,
        autoHeld: (s.review_note || '').startsWith('auto-hold:'),
        dupeCandidates: await dupeCandidates(s),
      })
    }
    console.log(JSON.stringify(enriched, null, 1))
    return
  }

  const id = process.argv[3]
  if (!cmd || (['fix', 'approve', 'duplicate', 'hold'].includes(cmd) && !id)) {
    fail('Usage: submission-actions.ts count|list|fix|approve|duplicate|hold|digest [args] — see header comment')
  }

  if (cmd === 'fix') {
    const patch: Record<string, string> = {}
    for (const [flag, col] of [['--website', 'website'], ['--city', 'city'], ['--country', 'country'], ['--category', 'category'], ['--vegan-level', 'vegan_level'], ['--name', 'name'], ['--address', 'address']] as const) {
      const v = arg(flag)
      if (v) patch[col] = col === 'country' ? (normalizeCountry(v) || v) : v
    }
    if (!Object.keys(patch).length) fail('fix: nothing to change')
    const { error } = await sb.from('place_submissions').update(patch).eq('id', id).eq('status', 'pending')
    if (error) fail(error.message)
    console.log(JSON.stringify({ ok: true, fixed: patch }))
    return
  }

  if (cmd === 'approve') {
    const r = await approveSubmission(id, { veganLevel: arg('--vegan-level'), reviewNote: arg('--note') })
    console.log(JSON.stringify(r))
    if (!r.ok) process.exit(1)
    return
  }

  if (cmd === 'duplicate') {
    const placeId = arg('--place-id') || fail('duplicate: --place-id required')
    const { data: s } = await sb.from('place_submissions').select('*').eq('id', id).single()
    if (!s) fail('submission not found')
    if (s.status !== 'pending') fail(`already ${s.status}`)
    const { data: place } = await sb.from('places').select('id, slug, name').eq('id', placeId).single()
    if (!place) fail('target place not found')

    if (s.user_id) {
      const { error: credErr } = await sb.from('place_contributors').insert({
        place_id: place.id, user_id: s.user_id, role: 'co_submitter',
        note: 'independently suggested via mobile',
      })
      if (credErr && !credErr.message.includes('duplicate')) console.warn('credit failed:', credErr.message)
    }
    const { error } = await sb.from('place_submissions').update({
      status: 'approved',
      imported_place_id: place.id,
      reviewed_at: new Date().toISOString(),
      review_note: arg('--note') || `duplicate of existing place ${place.slug}; submitter credited as co_submitter`,
    }).eq('id', id)
    if (error) fail(error.message)
    if (s.user_id) {
      await createNotification({
        userId: s.user_id,
        type: 'submission_approved',
        entityType: 'place',
        entityId: place.id,
        message: `Good eye — ${place.name} is already on PlantsPack. We credited you as a co-submitter 🌱`,
      })
    }
    console.log(JSON.stringify({ ok: true, duplicateOf: place.slug }))
    return
  }

  if (cmd === 'hold') {
    const note = arg('--note') || fail('hold: --note required')
    const { error } = await sb.from('place_submissions')
      .update({ review_note: `auto-hold: ${note}` }).eq('id', id).eq('status', 'pending')
    if (error) fail(error.message)
    console.log(JSON.stringify({ ok: true, held: true }))
    return
  }

  if (cmd === 'digest') {
    const file = arg('--file') || fail('digest: --file <json> required')
    const items: SubmissionDigestItem[] = JSON.parse(readFileSync(file, 'utf8'))
    if (!items.length) { console.log('nothing to send'); return }
    const res = await sendSubmissionsDigestEmail(ADMIN_DIGEST_TO, items)
    console.log(res.success ? `digest emailed to ${ADMIN_DIGEST_TO}` : `digest email failed: ${JSON.stringify(res.error)}`)
    return
  }

  fail(`unknown subcommand: ${cmd}`)
}

main().catch(e => { console.error(e); process.exit(1) })
