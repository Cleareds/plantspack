import { createAdminClient } from '@/lib/supabase-admin'
import { sendPushToUser } from '@/lib/notifications/push'
import type { NotificationType, NotificationEntityType } from '@/types/notifications'

/**
 * Session-less notification creator for server flows (admin approvals, the
 * daily submissions batch, etc.) where there is no acting user session — unlike
 * /api/notifications/create which derives the actor from the request session.
 *
 * - `actorId` may be null for system messages (acks, "your place is live").
 * - Skips self-notification only when an actor is set and equals the recipient.
 * - Best-effort: never throws into the caller's critical path (approving a
 *   place must not fail because a notification insert hiccupped). Returns the
 *   created row id or null.
 *
 * Preference gating: the place/submission/correction types are intentionally
 * NOT gated on notification_preferences — they're low-volume, high-value, and
 * directly about the user's own action. The classic social types keep their
 * existing gating in /api/notifications/create.
 */
export async function createNotification(opts: {
  userId: string
  type: NotificationType
  actorId?: string | null
  entityType?: NotificationEntityType | null
  entityId?: string | null
  message?: string | null
}): Promise<string | null> {
  const { userId, type, actorId = null, entityType = null, entityId = null, message = null } = opts
  if (!userId) return null
  if (actorId && actorId === userId) return null

  try {
    const admin = createAdminClient()
    const { data, error } = await admin
      .from('notifications')
      .insert({ user_id: userId, actor_id: actorId, type, entity_type: entityType, entity_id: entityId, message })
      .select('id')
      .single()
    if (error) {
      console.error('[createNotification]', type, error.message)
      return null
    }

    // Fire the mobile push (best-effort; no-op if the user has no device token).
    if (message) {
      await sendPushToUser({
        userId,
        type,
        body: message,
        data: { type, entityType: entityType ?? null, entityId: entityId ?? null },
      })
    }

    return data?.id ?? null
  } catch (e) {
    console.error('[createNotification] threw', (e as Error)?.message)
    return null
  }
}
