import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase-server'

const USERS_PER_PAGE = 20

function serviceClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )
}

// Verify the caller is a non-banned admin. Returns null when authorized,
// or a NextResponse to return early. Reads role/is_banned via the caller's
// own session (both columns stay readable to authenticated).
async function requireAdmin() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: profile } = await supabase
    .from('users').select('role, is_banned').eq('id', session.user.id).single()
  if (profile?.role !== 'admin' || profile?.is_banned) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  return null
}

// GET /api/admin/users?search=&role=&banned=&page=
// Admin-only user list WITH email. Moved server-side (service role) so the
// email column can be locked away from the browser/authenticated key
// (2026-07-14 security fix) - the page previously read it via select('*').
export async function GET(request: NextRequest) {
  const denied = await requireAdmin()
  if (denied) return denied

  const sp = request.nextUrl.searchParams
  const search = (sp.get('search') || '').trim()
  const role = sp.get('role') || 'all'
  const banned = sp.get('banned') || 'all'
  const page = Math.max(1, parseInt(sp.get('page') || '1'))

  const admin = serviceClient()
  let q = admin.from('users').select('*', { count: 'exact' })
  if (search) {
    // sanitize: PostgREST or-filter breaks on commas/parens in the term
    const safe = search.replace(/[,()]/g, ' ')
    q = q.or(`username.ilike.%${safe}%,email.ilike.%${safe}%`)
  }
  if (role !== 'all') q = q.eq('role', role)
  if (banned === 'banned') q = q.eq('is_banned', true)
  else if (banned === 'active') q = q.eq('is_banned', false)
  const from = (page - 1) * USERS_PER_PAGE
  q = q.range(from, from + USERS_PER_PAGE - 1).order('created_at', { ascending: false })

  const { data, error, count } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ users: data || [], total: count || 0 })
}

export async function POST(request: NextRequest) {
  try {
    const { email, password, username, first_name, last_name, role } = await request.json()

    // Get user session
    const supabase = await createClient()

    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin and not banned
    const { data: profile } = await supabase
      .from('users')
      .select('role, is_banned')
      .eq('id', session.user.id)
      .single()

    if (profile?.role !== 'admin' || profile?.is_banned) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Validate required fields
    if (!email || !password || !username) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Use admin client to create user (requires service role key)
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('Missing SUPABASE_SERVICE_ROLE_KEY for admin operations')
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    const adminClient = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    // Create auth user
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true
    })

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 })
    }

    // Create user profile
    const { error: profileError } = await adminClient
      .from('users')
      .insert({
        id: authData.user.id,
        email,
        username,
        first_name: first_name || null,
        last_name: last_name || null,
        role: role || 'user'
      })

    if (profileError) {
      // Rollback: delete auth user
      await adminClient.auth.admin.deleteUser(authData.user.id)
      return NextResponse.json({ error: profileError.message }, { status: 400 })
    }

    return NextResponse.json({ success: true, user: authData.user })
  } catch (error) {
    console.error('Error creating user:', error)
    return NextResponse.json(
      { error: 'Failed to create user' },
      { status: 500 }
    )
  }
}
