#!/usr/bin/env tsx
/**
 * Daily batch: process pending mobile place submissions.
 *
 * The admin can't approve from the mobile app, so this runs locally on a
 * schedule and approves the queue the same way the web admin button does —
 * it reuses the SHARED `approveSubmission` helper, so behaviour is identical:
 * geocode → insert place (community-submitted, is_verified=false) → feed post
 * by the submitter → notify submitter + nearby users. Then it emails an ops
 * digest to anton.kravchuk@cleareds.com.
 *
 * Usage:
 *   npx tsx scripts/process-submissions.ts            # dry run (preview only)
 *   npx tsx scripts/process-submissions.ts --apply    # approve + email digest
 *
 * Cron once a day (note: Node 22 needed for the app — see CLAUDE.md):
 *   0 9 * * *  cd /path/to/plantspack && /usr/bin/env npx tsx scripts/process-submissions.ts --apply >> /tmp/plantspack-submissions.log 2>&1
 */
import { config } from 'dotenv'
config({ path: '.env.local' })

import { createClient } from '@supabase/supabase-js'
import { approveSubmission } from '@/lib/submissions/approve'
import { sendSubmissionsDigestEmail, type SubmissionDigestItem } from '@/lib/email'

const ADMIN_DIGEST_TO = 'anton.kravchuk@cleareds.com'
const APPLY = process.argv.includes('--apply')

async function main() {
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

  const { data: pending, error } = await sb
    .from('place_submissions')
    .select('id, name, city, country, user_id, created_at')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
  if (error) { console.error('load failed:', error.message); process.exit(1) }

  if (!pending?.length) { console.log('No pending submissions.'); return }

  // Resolve submitter usernames for the digest.
  const userIds = [...new Set(pending.map(p => p.user_id).filter(Boolean))]
  const { data: users } = userIds.length
    ? await sb.from('users').select('id, username').in('id', userIds)
    : { data: [] }
  const nameOf = (id: string | null) => (users || []).find(u => u.id === id)?.username || 'unknown'

  console.log(`${pending.length} pending submission(s). Mode: ${APPLY ? 'APPLY' : 'DRY RUN'}\n`)
  const digest: SubmissionDigestItem[] = []

  for (const s of pending) {
    const loc = [s.city, s.country].filter(Boolean).join(', ')
    if (!APPLY) {
      console.log(`  • ${s.name} — ${loc} — by @${nameOf(s.user_id)}`)
      digest.push({ name: s.name, city: s.city, country: s.country, submitter: nameOf(s.user_id), outcome: 'skipped', note: 'dry run' })
      continue
    }
    const r = await approveSubmission(s.id, {})
    if (r.ok) {
      console.log(`  ✓ ${s.name} → /place/${r.slug} (nearby notified: ${r.nearbyNotified})`)
      digest.push({ name: s.name, city: s.city, country: s.country, submitter: nameOf(s.user_id), outcome: 'approved', slug: r.slug })
    } else {
      console.log(`  ✗ ${s.name} — ${r.already ? `already ${r.already}` : r.error}`)
      digest.push({ name: s.name, city: s.city, country: s.country, submitter: nameOf(s.user_id), outcome: 'failed', note: r.already ? `already ${r.already}` : r.error })
    }
  }

  if (APPLY) {
    const res = await sendSubmissionsDigestEmail(ADMIN_DIGEST_TO, digest)
    console.log(res.success ? `\nDigest emailed to ${ADMIN_DIGEST_TO}` : `\nDigest email failed: ${JSON.stringify(res.error)}`)
  } else {
    console.log('\nDry run — re-run with --apply to approve + email the digest.')
  }
}

main().catch(e => { console.error(e); process.exit(1) })
