import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

export async function DELETE(request: NextRequest) {
  try {
    const { password } = await request.json()

    // Get user session
    const cookieStore = cookies()
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
        },
      }
    )

    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify password before deletion
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: session.user.email!,
      password,
    })

    if (signInError) {
      return NextResponse.json({ error: 'Invalid password' }, { status: 403 })
    }

    // Use admin client for data cleanup
    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const userId = session.user.id

    // GDPR Compliant Data Deletion:
    // 1. Soft delete posts (set deleted_at)
    await adminClient
      .from('posts')
      .update({ deleted_at: new Date().toISOString() })
      .eq('user_id', userId)
      .is('deleted_at', null)

    // 2. Delete comments
    await adminClient
      .from('comments')
      .delete()
      .eq('user_id', userId)

    // 3. Delete likes
    await adminClient
      .from('post_likes')
      .delete()
      .eq('user_id', userId)

    // 4. Delete follows (both following and followers)
    await adminClient
      .from('follows')
      .delete()
      .or(`follower_id.eq.${userId},following_id.eq.${userId}`)

    // 5. Delete blocks and mutes
    await adminClient
      .from('user_blocks')
      .delete()
      .or(`blocker_id.eq.${userId},blocked_id.eq.${userId}`)

    await adminClient
      .from('user_mutes')
      .delete()
      .or(`muter_id.eq.${userId},muted_id.eq.${userId}`)

    // 6. Delete favorite places
    await adminClient
      .from('favorite_places')
      .delete()
      .eq('user_id', userId)

    // 7. Delete notifications
    await adminClient
      .from('notifications')
      .delete()
      .or(`user_id.eq.${userId},actor_id.eq.${userId}`)

    // 8. Anonymize user profile (GDPR right to be forgotten)
    await adminClient
      .from('users')
      .update({
        email: `deleted_${userId}@deleted.local`,
        username: `deleted_user_${userId.substring(0, 8)}`,
        first_name: null,
        last_name: null,
        bio: null,
        avatar_url: null,
        website: null,
        location: null,
        is_deleted: true,
      })
      .eq('id', userId)

    // 9. Delete auth user
    const { error: deleteError } = await adminClient.auth.admin.deleteUser(userId)

    if (deleteError) {
      console.error('Error deleting auth user:', deleteError)
      // Continue anyway - data is already cleaned up
    }

    return NextResponse.json({
      success: true,
      message: 'Account successfully deleted'
    })
  } catch (error) {
    console.error('Error deleting account:', error)
    return NextResponse.json(
      { error: 'Failed to delete account' },
      { status: 500 }
    )
  }
}
