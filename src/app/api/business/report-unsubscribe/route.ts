import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'

/**
 * One-click opt-out from the monthly owner report. Works without login
 * (GET from the email link, POST from mail clients honouring RFC 8058).
 * Only flips owner_report_opt_out; the newsletter consent is untouched.
 */
async function optOut(token: string): Promise<boolean> {
  if (!token || token.length < 32) return false
  const { error } = await (createAdminClient() as any)
    .from('users').update({ owner_report_opt_out: true }).eq('marketing_email_token', token)
  return !error
}

export async function GET(req: NextRequest) {
  const ok = await optOut(req.nextUrl.searchParams.get('u') || '')
  return NextResponse.redirect(new URL(ok ? '/business/report-off' : '/business/report-off?error=1', req.url), 302)
}

export async function POST(req: NextRequest) {
  const ok = await optOut(req.nextUrl.searchParams.get('u') || '')
  return NextResponse.json({ ok }, { status: ok ? 200 : 400 })
}
