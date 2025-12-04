import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  try {
    // Get user session
    const supabase = await createClient()

    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id

    // Collect all user data (GDPR Article 20 - Right to data portability)
    // Limit to 1000 items per category to prevent unbounded queries
    const EXPORT_LIMIT = 999 // Max 1000 items per category

    const exportData: any = {
      export_date: new Date().toISOString(),
      user_id: userId,
      data: {},
      note: 'Limited to 1000 most recent items per category. Contact support for complete export if needed.'
    }

    // 1. User profile
    const { data: profile } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()

    exportData.data.profile = profile

    // 2. Posts (most recent 1000)
    const { data: posts } = await supabase
      .from('posts')
      .select('*')
      .eq('user_id', userId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .range(0, EXPORT_LIMIT)

    exportData.data.posts = posts
    exportData.data.posts_count = posts?.length || 0

    // 3. Comments (most recent 1000)
    const { data: comments } = await supabase
      .from('comments')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(0, EXPORT_LIMIT)

    exportData.data.comments = comments
    exportData.data.comments_count = comments?.length || 0

    // 4. Likes (most recent 1000)
    const { data: likes } = await supabase
      .from('post_likes')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(0, EXPORT_LIMIT)

    exportData.data.likes = likes
    exportData.data.likes_count = likes?.length || 0

    // 5. Following (most recent 1000)
    const { data: following } = await supabase
      .from('follows')
      .select('*')
      .eq('follower_id', userId)
      .order('created_at', { ascending: false })
      .range(0, EXPORT_LIMIT)

    exportData.data.following = following
    exportData.data.following_count = following?.length || 0

    // 6. Followers (most recent 1000)
    const { data: followers } = await supabase
      .from('follows')
      .select('*')
      .eq('following_id', userId)
      .order('created_at', { ascending: false })
      .range(0, EXPORT_LIMIT)

    exportData.data.followers = followers
    exportData.data.followers_count = followers?.length || 0

    // 7. Favorite places (limit to 1000)
    const { data: favoritePlaces } = await supabase
      .from('favorite_places')
      .select('*, places(*)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(0, EXPORT_LIMIT)

    exportData.data.favorite_places = favoritePlaces
    exportData.data.favorite_places_count = favoritePlaces?.length || 0

    // 8. Added places (limit to 1000)
    const { data: addedPlaces } = await supabase
      .from('places')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(0, EXPORT_LIMIT)

    exportData.data.added_places = addedPlaces
    exportData.data.added_places_count = addedPlaces?.length || 0

    // 9. Blocked users (limit to 1000)
    const { data: blockedUsers } = await supabase
      .from('user_blocks')
      .select('*')
      .eq('blocker_id', userId)
      .order('created_at', { ascending: false })
      .range(0, EXPORT_LIMIT)

    exportData.data.blocked_users = blockedUsers
    exportData.data.blocked_users_count = blockedUsers?.length || 0

    // 10. Muted users (limit to 1000)
    const { data: mutedUsers } = await supabase
      .from('user_mutes')
      .select('*')
      .eq('muter_id', userId)
      .order('created_at', { ascending: false })
      .range(0, EXPORT_LIMIT)

    exportData.data.muted_users = mutedUsers
    exportData.data.muted_users_count = mutedUsers?.length || 0

    // 11. Reports made (limit to 1000)
    const { data: reportsMade } = await supabase
      .from('reports')
      .select('*')
      .eq('reporter_id', userId)
      .order('created_at', { ascending: false })
      .range(0, EXPORT_LIMIT)

    exportData.data.reports_made = reportsMade
    exportData.data.reports_made_count = reportsMade?.length || 0

    // Return as JSON file download
    return new NextResponse(JSON.stringify(exportData, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="plantspack_data_export_${new Date().toISOString().split('T')[0]}.json"`
      }
    })
  } catch (error) {
    console.error('Error exporting data:', error)
    return NextResponse.json(
      { error: 'Failed to export data' },
      { status: 500 }
    )
  }
}
