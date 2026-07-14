import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Resolves a username -> login email, server-side with the service role.
//
// Why this exists: username login needs the account's email to call
// signInWithPassword, but the email column on public.users is being locked
// away from the anon role (2026-07-14 security fix - anon could otherwise
// bulk-read all 186 users' emails). Doing the lookup here keeps username
// login working while the table column stays private.
//
// This is a single-username lookup (caller must already know the exact
// username), not a bulk export - a large reduction from the previous
// "read the whole users table" exposure. Emails are never enumerable.

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
)

export async function POST(request: NextRequest) {
  try {
    const { identifier } = await request.json().catch(() => ({ identifier: '' }))
    // Same shape the login form validates against; anything else can't be a
    // username, so don't even query.
    if (typeof identifier !== 'string' || !/^[a-zA-Z0-9_-]{2,30}$/.test(identifier)) {
      return NextResponse.json({ email: null })
    }
    const { data } = await admin
      .from('users')
      .select('email')
      .eq('username', identifier.toLowerCase())
      .maybeSingle()
    return NextResponse.json({ email: data?.email ?? null })
  } catch {
    return NextResponse.json({ email: null })
  }
}
