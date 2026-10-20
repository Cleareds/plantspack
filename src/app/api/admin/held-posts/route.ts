import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase-admin'
import { createClient } from '@/lib/supabase-server'

/**
 * Held posts queue. A database trigger holds posts from accounts younger than
 * 24 h that contain an outbound link (see migration 20261020100000). Admins
 * publish, reject (soft-delete) or ban the author (a trigger then soft-deletes
 * everything the account posted). Nothing is hard-deleted here.
 */
async function checkAdmin() {
  const supabaseUser = await createClient()
  const { data: { session } } = await supabaseUser.auth.getSession()
  if (!session) return null
  const supabase = createAdminClient()
  const { data: profile } = await supabase.from('users').select('role').eq('id', session.user.id).single()
  if (profile?.role !== 'admin') return null
  return { supabase, adminId: session.user.id }
}

export async function GET() {
  const ctx = await checkAdmin()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data, error } = await ctx.supabase
    .from('posts')
    .select('id, slug, title, content, category, created_at, user_id, users:user_id(username, first_name, last_name, created_at, is_banned)')
    .eq('moderation_status', 'held')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(100)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  const posts = (data || []).map((p: any) => ({ ...p, users: Array.isArray(p.users) ? p.users[0] : p.users }))
  return NextResponse.json({ posts })
}

export async function POST(request: NextRequest) {
  const ctx = await checkAdmin()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id, action, reason } = await request.json().catch(() => ({}))
  if (!id || !['publish', 'reject', 'ban'].includes(action)) {
    return NextResponse.json({ error: 'id and action (publish | reject | ban) required' }, { status: 400 })
  }
  const { supabase, adminId } = ctx
  const { data: post } = await supabase.from('posts').select('id, slug, user_id').eq('id', id).single()
  if (!post) return NextResponse.json({ error: 'Post not found' }, { status: 404 })

  if (action === 'publish') {
    const { error } = await supabase.from('posts').update({ moderation_status: 'published' }).eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  } else if (action === 'reject') {
    const { error } = await supabase.from('posts').update({ moderation_status: 'rejected', deleted_at: new Date().toISOString() }).eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  } else {
    // Ban: the users_ban_cascade trigger soft-deletes every post, comment and
    // review by this account.
    const { error } = await supabase.from('users').update({
      is_banned: true,
      ban_reason: reason || 'Spam: link post from a new account (held-posts queue)',
      banned_at: new Date().toISOString(),
      banned_by: adminId,
      trust_score: -100,
    }).eq('id', post.user_id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }
  try {
    revalidatePath('/feed')
    if (post.slug) revalidatePath(`/post/${post.slug}`)
  } catch { /* best effort */ }
  return NextResponse.json({ ok: true })
}
