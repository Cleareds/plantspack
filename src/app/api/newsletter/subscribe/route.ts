import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'

/**
 * Public re-subscribe via the user's stable marketing token. Used by the
 * re-consent email's "Yes, sign me up" CTA and by the "resubscribe" link
 * on the unsubscribe confirmation page. Both GET and POST supported.
 *
 * Writes newsletter_opt_in=true, newsletter_opted_in_at=now(). The caller
 * can pass ?source=re-consent-<date> to tag where consent came from for
 * audit. Defaults to 'email-link'.
 */
async function subscribeByToken(token: string, source: string) {
  if (!token || typeof token !== 'string' || token.length < 32) {
    return { ok: false as const, status: 400, reason: 'invalid-token' }
  }

  const admin = createAdminClient()
  const nowIso = new Date().toISOString()

  const { data, error } = await admin
    .from('users')
    .update({
      newsletter_opt_in: true,
      newsletter_opted_in_at: nowIso,
      newsletter_unsubscribed_at: null,
      newsletter_source: source,
    })
    .eq('marketing_email_token', token)
    .select('id')
    .maybeSingle()

  if (error) {
    console.error('[subscribe] update failed:', error)
    return { ok: false as const, status: 500, reason: 'server-error' }
  }
  if (!data) {
    return { ok: false as const, status: 404, reason: 'unknown-token' }
  }
  return { ok: true as const, status: 200 }
}

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('u') || ''
  const source = request.nextUrl.searchParams.get('source') || 'email-link'
  const result = await subscribeByToken(token, source)

  if (!result.ok) {
    return NextResponse.redirect(new URL('/newsletter/subscribed?error=1', request.url), 302)
  }
  return NextResponse.redirect(new URL('/newsletter/subscribed', request.url), 302)
}

export async function POST(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('u') || ''
  const source = request.nextUrl.searchParams.get('source') || 'email-link'
  const result = await subscribeByToken(token, source)
  return NextResponse.json(
    result.ok ? { success: true } : { success: false, error: result.reason },
    { status: result.status },
  )
}
