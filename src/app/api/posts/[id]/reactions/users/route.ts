import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// GET /api/posts/:id/reactions/users?type=like&limit=50
// Returns the list of users who reacted to a post with the given reaction type.
// Public read — reaction signals are not private.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type') || 'like'
  const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '50', 10), 1), 100)

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    const { data, error } = await supabase
      .from('post_reactions')
      .select('user_id, created_at, users!inner(id, username, first_name, last_name, avatar_url)')
      .eq('post_id', id)
      .eq('reaction_type', type)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) throw error
    return NextResponse.json({ users: data || [] })
  } catch (error) {
    console.error('Error fetching post reaction users:', error)
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
  }
}
