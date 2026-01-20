import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase-server'
import { createClient } from '@supabase/supabase-js'
import type { NotificationType, NotificationEntityType } from '@/types/notifications'
import { sendNotificationEmail } from '@/lib/email'

export async function POST(request: NextRequest) {
  try {
    const { userId, type, entityType, entityId, message } = await request.json()

    // Get actor session using proper server client
    const supabase = await createServerClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Don't create notification if user is notifying themselves
    if (session.user.id === userId) {
      return NextResponse.json({ success: true, skipped: true })
    }

    // Use service role to create notification
    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    // Check user's notification preferences
    const { data: prefs } = await adminClient
      .from('notification_preferences')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle() // Use maybeSingle() for new users who may not have preferences yet

    // Skip if user has disabled this type of notification
    // Map notification type to preference field name
    const typeToFieldMap: Record<string, string> = {
      'like': 'push_likes',
      'comment': 'push_comments',
      'reply': 'push_comments', // replies use comment preference
      'follow': 'push_follows',
      'mention': 'push_mentions',
    }

    const prefKey = typeToFieldMap[type]
    if (prefs && prefKey && (prefs as any)[prefKey] === false) {
      console.log('[Notification] Skipping - user disabled', type, 'notifications')
      return NextResponse.json({ success: true, skipped: true })
    }

    console.log('[Notification] Creating notification:', {
      type,
      userId,
      actorId: session.user.id,
      entityType,
      entityId,
      hasPrefs: !!prefs
    })

    // Create notification
    const { data, error } = await adminClient
      .from('notifications')
      .insert({
        user_id: userId,
        actor_id: session.user.id,
        type: type as NotificationType,
        entity_type: entityType as NotificationEntityType,
        entity_id: entityId,
        message,
      })
      .select()
      .single()

    if (error) {
      console.error('[Notification] Database error:', error)
      throw error
    }

    console.log('[Notification] Successfully created:', data.id)

    // Send email notification if enabled
    // Map notification type to email preference field name
    const emailPrefMap: Record<string, string> = {
      'like': 'email_likes',
      'comment': 'email_comments',
      'reply': 'email_comments',
      'follow': 'email_follows',
      'mention': 'email_mentions',
    }

    const emailPrefKey = emailPrefMap[type]
    const shouldSendEmail = !prefs || (prefs as any)[emailPrefKey] !== false

    if (shouldSendEmail) {
      // Get user and actor details for the email
      const [userResult, actorResult] = await Promise.all([
        adminClient.from('users').select('email, username').eq('id', userId).single(),
        adminClient.from('users').select('username').eq('id', session.user.id).single()
      ])

      if (userResult.data?.email && actorResult.data?.username) {
        // Build entity URL
        let entityUrl: string | undefined
        if (entityType === 'post' && entityId) {
          entityUrl = `https://www.plantspack.com/post/${entityId}`
        } else if (entityType === 'user' && actorResult.data.username) {
          entityUrl = `https://www.plantspack.com/profile/${actorResult.data.username}`
        }

        // Send email in background (don't await)
        sendNotificationEmail(
          userResult.data.email,
          userResult.data.username,
          type as 'like' | 'comment' | 'reply' | 'follow' | 'mention',
          actorResult.data.username,
          entityUrl
        ).catch((err) => {
          console.error('[Notification] Failed to send email:', err)
        })
      }
    }

    return NextResponse.json({ success: true, notification: data })
  } catch (error) {
    console.error('Error creating notification:', error)
    return NextResponse.json(
      { error: 'Failed to create notification' },
      { status: 500 }
    )
  }
}
