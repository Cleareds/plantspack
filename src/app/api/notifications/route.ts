import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '20')
    const unreadOnly = searchParams.get('unreadOnly') === 'true'

    // Get user session
    const supabase = await createClient()

    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Build query - get notifications data
    let query = supabase
      .from('notifications')
      .select(`
        *,
        actor:users!notifications_actor_id_fkey (
          id,
          username,
          avatar_url,
          first_name,
          last_name
        )
      `)
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (unreadOnly) {
      query = query.eq('read', false)
    }

    const { data, error } = await query

    if (error) throw error

    // Get unread count with same query (optimized - single query)
    // If we're already fetching unread only and limit >= results, use that count
    let unreadCount = 0
    if (unreadOnly && data && data.length < limit) {
      unreadCount = data.length
    } else {
      // Otherwise, do a separate count (only when needed)
      const { count } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', session.user.id)
        .eq('read', false)
      unreadCount = count || 0
    }

    return NextResponse.json({
      notifications: data || [],
      unreadCount
    })
  } catch (error) {
    console.error('Error fetching notifications:', error)
    return NextResponse.json(
      { error: 'Failed to fetch notifications' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { notificationIds, markAllAsRead } = await request.json()

    // Get user session
    const supabase = await createClient()

    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (markAllAsRead) {
      // Mark all notifications as read
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', session.user.id)
        .eq('read', false)

      if (error) throw error
    } else if (notificationIds && Array.isArray(notificationIds)) {
      // Mark specific notifications as read
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .in('id', notificationIds)
        .eq('user_id', session.user.id)

      if (error) throw error
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating notifications:', error)
    return NextResponse.json(
      { error: 'Failed to update notifications' },
      { status: 500 }
    )
  }
}
