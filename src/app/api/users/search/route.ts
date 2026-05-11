import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')
    const limit = parseInt(searchParams.get('limit') || '10')

    if (!query || query.length < 1) {
      return NextResponse.json({ users: [] })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    // Search for users by username, first name, or last name.
    // is_banned can be NULL for most users, so exclude only rows where it is explicitly true.
    const { data: users, error } = await supabase
      .from('users')
      .select('id, username, first_name, last_name, avatar_url')
      .or(`username.ilike.${query}%,first_name.ilike.${query}%,last_name.ilike.${query}%`)
      .not('is_banned', 'is', true)
      .limit(limit)
      .order('username', { ascending: true })

    if (error) throw error

    return NextResponse.json({ users: users || [] })
  } catch (error) {
    console.error('Error searching users:', error)
    return NextResponse.json(
      { error: 'Failed to search users' },
      { status: 500 }
    )
  }
}
