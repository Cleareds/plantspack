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
    const exportData: any = {
      export_date: new Date().toISOString(),
      user_id: userId,
      data: {}
    }

    // 1. User profile
    const { data: profile } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()

    exportData.data.profile = profile

    // 2. Posts
    const { data: posts } = await supabase
      .from('posts')
      .select('*')
      .eq('user_id', userId)
      .is('deleted_at', null)

    exportData.data.posts = posts

    // 3. Comments
    const { data: comments } = await supabase
      .from('comments')
      .select('*')
      .eq('user_id', userId)

    exportData.data.comments = comments

    // 4. Likes
    const { data: likes } = await supabase
      .from('post_likes')
      .select('*')
      .eq('user_id', userId)

    exportData.data.likes = likes

    // 5. Following
    const { data: following } = await supabase
      .from('follows')
      .select('*')
      .eq('follower_id', userId)

    exportData.data.following = following

    // 6. Followers
    const { data: followers } = await supabase
      .from('follows')
      .select('*')
      .eq('following_id', userId)

    exportData.data.followers = followers

    // 7. Favorite places
    const { data: favoritePlaces } = await supabase
      .from('favorite_places')
      .select('*, places(*)')
      .eq('user_id', userId)

    exportData.data.favorite_places = favoritePlaces

    // 8. Added places
    const { data: addedPlaces } = await supabase
      .from('places')
      .select('*')
      .eq('user_id', userId)

    exportData.data.added_places = addedPlaces

    // 9. Blocked users
    const { data: blockedUsers } = await supabase
      .from('user_blocks')
      .select('*')
      .eq('blocker_id', userId)

    exportData.data.blocked_users = blockedUsers

    // 10. Muted users
    const { data: mutedUsers } = await supabase
      .from('user_mutes')
      .select('*')
      .eq('muter_id', userId)

    exportData.data.muted_users = mutedUsers

    // 11. Reports made
    const { data: reportsMade } = await supabase
      .from('reports')
      .select('*')
      .eq('reporter_id', userId)

    exportData.data.reports_made = reportsMade

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
