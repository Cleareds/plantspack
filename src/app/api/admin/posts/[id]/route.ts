import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase-server'

async function getAdminClient(request: NextRequest) {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return { error: 'Unauthorized', status: 401, adminClient: null }

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', session.user.id)
    .single()

  if (profile?.role !== 'admin') return { error: 'Forbidden', status: 403, adminClient: null }

  const adminClient = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  return { error: null, status: 200, adminClient }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const { error: authError, status, adminClient } = await getAdminClient(request)
    if (authError || !adminClient) {
      return NextResponse.json({ error: authError }, { status })
    }

    const { error } = await adminClient.from('posts').delete().eq('id', id)
    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting post:', error)
    return NextResponse.json({ error: 'Failed to delete post' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const { error: authError, status, adminClient } = await getAdminClient(request)
    if (authError || !adminClient) {
      return NextResponse.json({ error: authError }, { status })
    }

    const { action } = await request.json()
    const deleted_at = action === 'restore' ? null : new Date().toISOString()

    const { error } = await adminClient
      .from('posts')
      .update({ deleted_at })
      .eq('id', id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating post:', error)
    return NextResponse.json({ error: 'Failed to update post' }, { status: 500 })
  }
}
