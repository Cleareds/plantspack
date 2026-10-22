/**
 * Monthly owner report (business tools, 2026-10-22).
 *
 * One short email per verified owner with last month's numbers for each place
 * they manage: page views, new saves, new reviews, reviews still waiting for
 * a reply. On by default for owners; one-click opt-out (owner_report_opt_out).
 *
 * Usage:
 *   npx tsx scripts/owner-monthly-report.ts                 # dry run, prints what would be sent
 *   npx tsx scripts/owner-monthly-report.ts --to me@x.com   # send every report to this one address (test)
 *   npx tsx scripts/owner-monthly-report.ts --commit        # send for real, once per owner per month
 *   --month 2026-10                                          # report month (default: last month, UTC)
 *
 * Runs from .github/workflows/owner-report.yml on the 1st of each month. No
 * Vercel invocations. Never deletes anything.
 */
import { config } from 'dotenv'
config({ path: '.env.local', quiet: true })
import crypto from 'crypto'
import { createClient } from '@supabase/supabase-js'
import { sendEmail } from '@/lib/email'

const args = process.argv.slice(2)
const COMMIT = args.includes('--commit')
const TO_OVERRIDE = args.includes('--to') ? args[args.indexOf('--to') + 1] : null
const MONTH_ARG = args.includes('--month') ? args[args.indexOf('--month') + 1] : null

const SITE = 'https://www.plantspack.com'
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { autoRefreshToken: false, persistSession: false },
})

function monthRange(): { label: string; key: string; from: string; to: string } {
  let y: number, m: number
  if (MONTH_ARG && /^\d{4}-\d{2}$/.test(MONTH_ARG)) {
    ;[y, m] = MONTH_ARG.split('-').map(Number)
  } else {
    const now = new Date()
    y = now.getUTCFullYear()
    m = now.getUTCMonth() // 0-based current month = 1-based last month
    if (m === 0) { y -= 1; m = 12 }
  }
  const from = new Date(Date.UTC(y, m - 1, 1))
  const to = new Date(Date.UTC(y, m, 1))
  return {
    key: `${y}-${String(m).padStart(2, '0')}`,
    label: from.toLocaleDateString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' }),
    from: from.toISOString(),
    to: to.toISOString(),
  }
}

interface PlaceReport {
  name: string
  url: string
  views: number
  newSaves: number
  newReviews: number
  unanswered: number
  hasMenu: boolean
}

async function placeReport(placeId: string, range: ReturnType<typeof monthRange>): Promise<PlaceReport | null> {
  const { data: place } = await sb.from('places').select('id, slug, name').eq('id', placeId).maybeSingle()
  if (!place) return null
  const [views, saves, reviews, menu] = await Promise.all([
    sb.from('content_view_daily').select('views').eq('entity_type', 'place').eq('entity_id', placeId)
      .gte('day', range.from.slice(0, 10)).lt('day', range.to.slice(0, 10)),
    sb.from('favorite_places').select('id', { count: 'exact', head: true }).eq('place_id', placeId)
      .gte('created_at', range.from).lt('created_at', range.to),
    sb.from('place_reviews').select('id, created_at').eq('place_id', placeId).is('deleted_at', null).limit(1000),
    sb.from('place_menus').select('status').eq('place_id', placeId).eq('status', 'published').maybeSingle(),
  ])
  const reviewRows = reviews.data || []
  const ids = reviewRows.map((r) => r.id)
  let answered = new Set<string>()
  if (ids.length) {
    const { data: replies } = await sb.from('place_review_replies').select('review_id')
      .in('review_id', ids).eq('author_role', 'owner').is('deleted_at', null)
    answered = new Set((replies || []).map((r) => r.review_id))
  }
  return {
    name: place.name,
    url: `${SITE}/place/${place.slug || place.id}`,
    views: (views.data || []).reduce((s, r) => s + (r.views || 0), 0),
    newSaves: saves.count ?? 0,
    newReviews: reviewRows.filter((r) => r.created_at >= range.from && r.created_at < range.to).length,
    unanswered: ids.filter((id) => !answered.has(id)).length,
    hasMenu: !!menu.data,
  }
}

function esc(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!))
}

function renderEmail(name: string, monthLabel: string, places: PlaceReport[], unsubUrl: string): string {
  const blocks = places.map((p) => {
    const nudges: string[] = []
    if (p.unanswered > 0) nudges.push(`${p.unanswered} review${p.unanswered === 1 ? '' : 's'} still waiting for your reply.`)
    if (!p.hasMenu) nudges.push('Your menu is not on your page yet. You can add it from a photo or PDF.')
    return `
      <div style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 18px 20px; margin: 16px 0;">
        <h3 style="margin: 0 0 10px 0; font-size: 17px;"><a href="${p.url}" style="color: #111827; text-decoration: none;">${esc(p.name)}</a></h3>
        <table style="width: 100%; border-collapse: collapse; font-size: 15px;">
          <tr><td style="padding: 3px 0;">Page views</td><td style="text-align: right; font-weight: 600;">${p.views.toLocaleString('en')}</td></tr>
          <tr><td style="padding: 3px 0;">New saves</td><td style="text-align: right; font-weight: 600;">${p.newSaves.toLocaleString('en')}</td></tr>
          <tr><td style="padding: 3px 0;">New reviews</td><td style="text-align: right; font-weight: 600;">${p.newReviews.toLocaleString('en')}</td></tr>
        </table>
        ${nudges.length ? `<p style="margin: 12px 0 0 0; font-size: 14px; color: #15803d;">${nudges.map(esc).join('<br>')}</p>` : ''}
      </div>`
  }).join('')
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
  <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; line-height: 1.5; color: #333; background: #f5f5f5; margin: 0; padding: 0;">
    <div style="max-width: 600px; margin: 32px auto; background: #ffffff; border-radius: 8px; overflow: hidden;">
      <div style="text-align: center; padding: 28px 20px; border-bottom: 1px solid #e5e7eb;">
        <img src="${SITE}/plantspack-logo-real.svg" alt="PlantsPack" height="40" style="height: 40px; width: auto;" />
      </div>
      <div style="padding: 28px 30px;">
        <p>Hi ${esc(name)},</p>
        <p>Here is how your place did on PlantsPack in ${esc(monthLabel)}.</p>
        ${blocks}
        <div style="text-align: center; margin: 26px 0;">
          <a href="${SITE}/business/dashboard" style="background: #16a34a; color: #ffffff; padding: 12px 26px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">Open your business dashboard</a>
        </div>
        <p style="font-size: 13px; color: #6b7280;">Page views count visits to your page on our website and app since we started counting on 30 July 2026. Listing and ranking on PlantsPack are never paid.</p>
      </div>
      <div style="background: #f9fafb; padding: 18px 30px; text-align: center; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280;">
        You get this because you are the verified owner of a place on PlantsPack.<br>
        <a href="${unsubUrl}" style="color: #6b7280;">Stop these monthly emails</a> · <a href="${SITE}" style="color: #16a34a;">plantspack.com</a>
      </div>
    </div>
  </body></html>`
}

async function main() {
  const range = monthRange()
  const campaign = `owner-report-${range.key}`
  console.log(`${COMMIT ? 'SENDING' : TO_OVERRIDE ? `TEST to ${TO_OVERRIDE}` : 'DRY RUN'} · ${campaign}`)

  const { data: owners, error } = await sb.from('place_owners').select('user_id, place_id').is('removed_at', null)
  if (error) throw error
  const byUser = new Map<string, string[]>()
  for (const o of owners || []) byUser.set(o.user_id, [...(byUser.get(o.user_id) || []), o.place_id])

  let sent = 0, skipped = 0
  for (const [userId, placeIds] of byUser) {
    const { data: u } = await sb.from('users')
      .select('id, email, username, first_name, owner_report_opt_out, marketing_email_token, is_banned')
      .eq('id', userId).maybeSingle()
    if (!u?.email || u.is_banned) { skipped++; continue }
    if (u.owner_report_opt_out) { console.log(`  skip ${u.username}: opted out`); skipped++; continue }

    const { data: already } = await sb.from('newsletter_sends').select('id').eq('user_id', userId).eq('campaign', campaign).maybeSingle()
    if (already && COMMIT) { console.log(`  skip ${u.username}: already sent`); skipped++; continue }

    const reports = (await Promise.all(placeIds.map((id) => placeReport(id, range)))).filter((r): r is PlaceReport => !!r)
    if (!reports.length) { skipped++; continue }

    let token = u.marketing_email_token as string | null
    if (!token) {
      token = crypto.randomBytes(32).toString('hex')
      if (COMMIT) await sb.from('users').update({ marketing_email_token: token }).eq('id', userId)
    }
    const unsubUrl = `${SITE}/api/business/report-unsubscribe?u=${token}`
    const subject = reports.length === 1
      ? `${reports[0].name} on PlantsPack: your ${range.label} numbers`
      : `Your places on PlantsPack: ${range.label} numbers`
    const html = renderEmail(u.first_name || u.username || 'there', range.label, reports, unsubUrl)

    console.log(`  ${u.username} <${u.email}>: ${reports.map((r) => `${r.name} views=${r.views} saves=${r.newSaves} reviews=${r.newReviews} unanswered=${r.unanswered} menu=${r.hasMenu}`).join(' | ')}`)

    if (!COMMIT && !TO_OVERRIDE) continue
    const res = await sendEmail({
      to: TO_OVERRIDE || u.email,
      subject: TO_OVERRIDE ? `[TEST] ${subject}` : subject,
      html,
      headers: {
        'List-Unsubscribe': `<${unsubUrl}>`,
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
      },
    })
    if (!res.success) { console.log(`    send failed`); continue }
    sent++
    if (COMMIT) {
      await sb.from('newsletter_sends').insert({ user_id: userId, campaign, email_to: u.email, resend_message_id: (res as { id?: string }).id ?? null })
    }
    if (TO_OVERRIDE) break // one test email is enough
    await new Promise((r) => setTimeout(r, 600)) // stay under Resend's rate limit
  }
  console.log(`done · owners=${byUser.size} sent=${sent} skipped=${skipped}`)
}

main().catch((e) => { console.error(e); process.exit(1) })
