import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase-server'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { NotificationType, NotificationEntityType } from '@/types/notifications'

// Tap target stored on the row (see src/lib/notifications/link.ts).
async function notificationUrl(
  admin: SupabaseClient,
  entityType: string | undefined,
  entityId: string | undefined,
): Promise<string | null> {
  if (!entityId) return null
  if (entityType === 'post') return `/post/${entityId}`
  if (entityType === 'place_review') {
    const { data } = await admin
      .from('place_reviews')
      .select('places(slug)')
      .eq('id', entityId)
      .maybeSingle()
    const slug = (data as { places?: { slug?: string } | null } | null)?.places?.slug
    return slug ? `/place/${slug}` : null
  }
  return null
}

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

    // push_* / email_* preferences are applied by /api/notifications/dispatch
    // (the bell always gets the row, matching the DB function social_notify).

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
        url: await notificationUrl(adminClient, entityType, entityId),
      })
      .select()
      .single()

    if (error) {
      console.error('[Notification] Database error:', error)
      throw error
    }

    // Push + email are sent by /api/notifications/dispatch, which the DB
    // trigger dispatch_notification calls for every social row.

    return NextResponse.json({ success: true, notification: data })
  } catch (error) {
    console.error('Error creating notification:', error)
    return NextResponse.json(
      { error: 'Failed to create notification' },
      { status: 500 }
    )
  }
}
