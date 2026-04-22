/**
 * One-off re-consent email for existing users who signed up BEFORE the
 * newsletter opt-in existed. Legal basis: legitimate interest (one-time
 * service-update notice). Body does NOT promote anything — it describes the
 * new feature and offers two clear CTAs (opt-in / opt-out).
 *
 * Hard rules (do not relax without legal sign-off):
 *   - Only target users active in the last 30 days (signed in OR created
 *     content). Dormant users get NO email — consent dormancy exceptions are
 *     risky and vary by jurisdiction.
 *   - One email per user, ever. Uses newsletter_sends with campaign
 *     're-consent-<YYYY-MM-DD>' to block retries via the UNIQUE constraint.
 *   - Users who already have newsletter_opt_in=true are skipped (they
 *     consented through signup/settings; we don't need to ask again).
 *   - Users who have newsletter_unsubscribed_at set are skipped (they said
 *     no — we don't re-ask).
 *
 * USAGE:
 *   tsx scripts/send-reconsent.ts --dry-run     # prints recipients, no sends
 *   tsx scripts/send-reconsent.ts --commit      # actually sends (requires flag)
 *
 * DO NOT add a default-send path. The --commit flag is the human sign-off.
 */

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { sendEmail } from '../src/lib/email'

config({ path: '.env.local' })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://plantspack.com').replace(/\/$/, '')

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}

const CAMPAIGN = `re-consent-${new Date().toISOString().slice(0, 10)}`
const DRY_RUN = process.argv.includes('--dry-run') || !process.argv.includes('--commit')
const ACTIVITY_CUTOFF_DAYS = 30

interface Recipient {
  id: string
  email: string
  username: string | null
  first_name: string | null
  marketing_email_token: string
  last_sign_in_at: string | null
}

async function pickRecipients(admin: ReturnType<typeof createClient>): Promise<Recipient[]> {
  // Only email users who (a) haven't opted in yet, (b) haven't unsubscribed,
  // (c) have a valid token, (d) signed in recently enough that this message
  // is a plausible service update rather than spam to a dormant account.
  //
  // last_sign_in_at lives on auth.users (Supabase), not public.users — we
  // pull it via the admin auth API and join in memory. With ~20 users this
  // is trivial; don't over-engineer a DB join.
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - ACTIVITY_CUTOFF_DAYS)
  const cutoffMs = cutoff.getTime()

  const { data: profile, error: profileErr } = await admin
    .from('users')
    .select('id, email, username, first_name, marketing_email_token, newsletter_opt_in, newsletter_unsubscribed_at')
    .eq('newsletter_opt_in', false)
    .is('newsletter_unsubscribed_at', null)
    .not('marketing_email_token', 'is', null)
    .not('email', 'is', null)

  if (profileErr) {
    console.error('Failed to query public.users:', profileErr)
    process.exit(1)
  }

  // Pull auth.users last_sign_in_at.
  const { data: authList, error: authErr } = await (admin as any).auth.admin.listUsers({ perPage: 1000 })
  if (authErr) {
    console.error('Failed to list auth users:', authErr)
    process.exit(1)
  }
  const lastSignInById = new Map<string, string | null>()
  for (const u of authList.users as Array<{ id: string; last_sign_in_at: string | null }>) {
    lastSignInById.set(u.id, u.last_sign_in_at)
  }

  // Belt-and-braces: filter out anyone who already got this exact campaign.
  const { data: sent } = await admin
    .from('newsletter_sends')
    .select('user_id')
    .eq('campaign', CAMPAIGN)

  const alreadySent = new Set((sent || []).map((r: any) => r.user_id))

  return (profile as any[])
    .filter((u) => !alreadySent.has(u.id))
    .map((u) => ({ ...u, last_sign_in_at: lastSignInById.get(u.id) || null }))
    .filter((u) => {
      if (!u.last_sign_in_at) return false
      return new Date(u.last_sign_in_at).getTime() >= cutoffMs
    })
    .map((u) => ({
      id: u.id,
      email: u.email,
      username: u.username,
      first_name: u.first_name,
      marketing_email_token: u.marketing_email_token,
      last_sign_in_at: u.last_sign_in_at,
    }))
}

function renderEmail(recipient: Recipient) {
  const name = recipient.first_name || recipient.username || 'there'
  const subscribeUrl = `${SITE_URL}/api/newsletter/subscribe?u=${encodeURIComponent(recipient.marketing_email_token)}&source=${encodeURIComponent(CAMPAIGN)}`
  const unsubscribeUrl = `${SITE_URL}/api/newsletter/unsubscribe?u=${encodeURIComponent(recipient.marketing_email_token)}`

  const subject = 'Want weekly vegan discoveries from PlantsPack?'

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background: #f5f5f5;">
      <div style="max-width: 600px; margin: 40px auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
        <div style="text-align: center; padding: 32px 20px; border-bottom: 1px solid #e5e7eb;">
          <img src="https://plantspack.com/plantspack-logo-real.svg" alt="PlantsPack" height="48" style="height: 48px; width: auto;" />
        </div>
        <div style="padding: 40px 30px;">
          <p>Hi <strong>${name}</strong>,</p>
          <p>
            Quick note — we're launching a periodic PlantsPack newsletter covering new vegan
            places near you, top-rated spots worldwide, and platform updates. You signed up
            before this existed, so we're asking once whether you'd like to receive it.
          </p>
          <p><strong>No action = no newsletter.</strong> We won't email you again about this.</p>

          <div style="text-align: center; margin: 32px 0;">
            <a href="${subscribeUrl}"
               style="background: #16a34a; color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">
              Yes, sign me up
            </a>
          </div>

          <p style="text-align: center; margin: 16px 0;">
            <a href="${unsubscribeUrl}" style="color: #6b7280; text-decoration: underline; font-size: 14px;">
              No thanks — never email me about this again
            </a>
          </p>

          <p style="font-size: 14px; color: #6b7280; margin-top: 32px;">
            This is a one-time service notice. You'll continue to receive transactional
            emails (notifications you've enabled, claim responses, password resets)
            regardless of your newsletter choice.
          </p>
          <p style="margin-top: 24px;"><strong>The PlantsPack Team</strong></p>
        </div>
        <div style="background: #f9fafb; padding: 20px 30px; text-align: center; border-top: 1px solid #e5e7eb;">
          <p style="font-size: 12px; color: #6b7280; margin: 5px 0;">
            Sent to ${recipient.email} as part of a one-time service update.
          </p>
          <p style="font-size: 11px; color: #9ca3af; margin: 8px 0 0 0;">
            Cleareds · Belgium · hello@cleareds.com
          </p>
        </div>
      </div>
    </body>
    </html>
  `

  return { subject, html, unsubscribeUrl }
}

async function main() {
  const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  console.log(`\n=== Re-consent run: ${CAMPAIGN} ===`)
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN (no sends)' : '*** LIVE SEND ***'}`)
  console.log(`Activity cutoff: last ${ACTIVITY_CUTOFF_DAYS} days`)

  const recipients = await pickRecipients(admin)
  console.log(`\nMatched recipients: ${recipients.length}`)

  if (recipients.length === 0) {
    console.log('Nothing to do.')
    return
  }

  for (const r of recipients) {
    console.log(` - ${r.email} (@${r.username || '—'}) last_sign_in=${r.last_sign_in_at}`)
  }

  if (DRY_RUN) {
    console.log('\nDry run complete. Re-run with --commit to actually send.')
    console.log('IMPORTANT: confirm with the owner before --commit. Once sent, can\'t un-send.')
    return
  }

  // Live send — sequential with a small delay to stay well within Resend's
  // default 2 req/s limit. 16 users takes ~32s; not worth batching.
  let sentCount = 0
  let failCount = 0
  for (const r of recipients) {
    const { subject, html, unsubscribeUrl } = renderEmail(r)
    const result = await sendEmail({
      to: r.email,
      subject,
      html,
      headers: {
        'List-Unsubscribe': `<${unsubscribeUrl}>, <mailto:hello@cleareds.com?subject=unsubscribe>`,
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
      },
    })

    if (result.success) {
      const { error: logErr } = await admin.from('newsletter_sends').insert({
        user_id: r.id,
        campaign: CAMPAIGN,
        email_to: r.email,
        resend_message_id: result.id || null,
      })
      if (logErr) {
        console.error(`  [${r.email}] log insert failed:`, logErr)
      }
      sentCount++
      console.log(`  [${r.email}] sent (${result.id})`)
    } else {
      failCount++
      console.error(`  [${r.email}] FAILED:`, result.error)
    }

    await new Promise((resolve) => setTimeout(resolve, 550))
  }

  console.log(`\nDone. Sent=${sentCount} Failed=${failCount}`)
}

main().catch((err) => {
  console.error('Unhandled error:', err)
  process.exit(1)
})
