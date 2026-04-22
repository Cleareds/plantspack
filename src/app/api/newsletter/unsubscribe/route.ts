import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'

/**
 * Public one-click unsubscribe. Must work WITHOUT authentication (CAN-SPAM
 * requires a no-login unsubscribe). Both GET (user clicked link in email)
 * and POST (mail client honouring RFC 8058 List-Unsubscribe-Post) set the
 * opt-out state on the user identified by their stable marketing token.
 *
 * We never delete the user row. We set:
 *   newsletter_opt_in = false
 *   newsletter_unsubscribed_at = now()
 *   newsletter_source = 'unsubscribe-link'
 * so the compliance audit trail remains intact.
 */

async function unsubscribeByToken(token: string) {
  if (!token || typeof token !== 'string' || token.length < 32) {
    return { ok: false as const, status: 400, reason: 'invalid-token' }
  }

  const admin = createAdminClient()
  const nowIso = new Date().toISOString()

  const { data, error } = await admin
    .from('users')
    .update({
      newsletter_opt_in: false,
      newsletter_unsubscribed_at: nowIso,
      newsletter_source: 'unsubscribe-link',
    })
    .eq('marketing_email_token', token)
    .select('id')
    .maybeSingle()

  if (error) {
    console.error('[unsubscribe] update failed:', error)
    return { ok: false as const, status: 500, reason: 'server-error' }
  }
  if (!data) {
    // Unknown token — don't leak whether it ever existed. Treat as success
    // from the user's perspective (the desired end state is "unsubscribed"),
    // which matches how mail clients expect List-Unsubscribe to behave.
    return { ok: true as const, status: 200, unknown: true }
  }
  return { ok: true as const, status: 200, unknown: false }
}

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('u') || ''
  const result = await unsubscribeByToken(token)

  if (!result.ok) {
    return NextResponse.redirect(new URL('/newsletter/unsubscribed?error=1', request.url), 302)
  }
  return NextResponse.redirect(new URL('/newsletter/unsubscribed', request.url), 302)
}

export async function POST(request: NextRequest) {
  // Gmail's one-click unsubscribe posts with no body; token is still in the query string.
  const token = request.nextUrl.searchParams.get('u') || ''
  const result = await unsubscribeByToken(token)
  return NextResponse.json(
    result.ok ? { success: true } : { success: false, error: result.reason },
    { status: result.status },
  )
}
