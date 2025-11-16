import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import type { NotificationType, NotificationEntityType } from '@/types/notifications'

export async function POST(request: NextRequest) {
  try {
    const { userId, type, entityType, entityId, message } = await request.json()

    // Get actor session
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
      .single()

    // Skip if user has disabled this type of notification
    const prefKey = `push_${type}s` as keyof typeof prefs
    if (prefs && prefs[prefKey] === false) {
      return NextResponse.json({ success: true, skipped: true })
    }

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

    if (error) throw error

    // TODO: Send email notification if enabled
    // This would integrate with SendGrid/AWS SES/etc

    return NextResponse.json({ success: true, notification: data })
  } catch (error) {
    console.error('Error creating notification:', error)
    return NextResponse.json(
      { error: 'Failed to create notification' },
      { status: 500 }
    )
  }
}
