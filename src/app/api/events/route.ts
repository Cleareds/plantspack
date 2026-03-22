import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)

    const search = searchParams.get('search')
    const upcoming = searchParams.get('upcoming') !== 'false' // default true
    const location = searchParams.get('location')
    const month = searchParams.get('month') // YYYY-MM for calendar
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')

    const fetchLimit = month ? 500 : limit + offset + 100

    let query = supabase
      .from('posts')
      .select(`
        *,
        users!inner(id, username, first_name, last_name, avatar_url, subscription_tier, is_banned),
        post_likes(id),
        comments(id)
      `)
      .eq('category', 'event')
      .eq('privacy', 'public')
      .is('deleted_at', null)
      .eq('users.is_banned', false)
      .not('event_data', 'is', null)
      .order('created_at', { ascending: false })
      .limit(fetchLimit)

    if (search) {
      query = query.ilike('content', `%${search}%`)
    }

    const { data: posts, error } = await query

    if (error) {
      console.error('[Events API] Error:', error)
      throw error
    }

    let filtered = posts || []
    const now = new Date().toISOString()

    // Filter upcoming/past
    if (!month) {
      if (upcoming) {
        filtered = filtered.filter((p: any) => {
          const start = p.event_data?.start_time
          return !start || start >= now
        })
      } else {
        filtered = filtered.filter((p: any) => {
          const start = p.event_data?.start_time
          return start && start < now
        })
      }
    }

    // Filter by month for calendar view
    if (month) {
      const [year, mon] = month.split('-').map(Number)
      const monthStart = new Date(year, mon - 1, 1).toISOString()
      const monthEnd = new Date(year, mon, 0, 23, 59, 59).toISOString()
      filtered = filtered.filter((p: any) => {
        const start = p.event_data?.start_time
        return start && start >= monthStart && start <= monthEnd
      })
    }

    // Filter by location
    if (location) {
      const loc = location.toLowerCase()
      filtered = filtered.filter((p: any) => {
        const eventLoc = p.event_data?.location
        return eventLoc && eventLoc.toLowerCase().includes(loc)
      })
    }

    // Sort by start_time
    filtered.sort((a: any, b: any) => {
      const aTime = a.event_data?.start_time || ''
      const bTime = b.event_data?.start_time || ''
      return upcoming ? aTime.localeCompare(bTime) : bTime.localeCompare(aTime)
    })

    // For calendar mode, return all events in the month
    if (month) {
      return NextResponse.json({ events: filtered, hasMore: false })
    }

    const paginated = filtered.slice(offset, offset + limit)
    const hasMore = filtered.length > offset + limit

    return NextResponse.json({ events: paginated, hasMore })
  } catch (error) {
    console.error('[Events API] Error:', error)
    return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 })
  }
}
