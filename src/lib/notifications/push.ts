import { createAdminClient } from '@/lib/supabase-admin'
import type { NotificationType } from '@/types/notifications'

const EXPO_PUSH_ENDPOINT = 'https://exp.host/--/api/v2/push/send'

// Short push titles per type; the body carries the full message.
const TITLES: Partial<Record<NotificationType, string>> = {
  submission_approved: 'Your place is live 🌱',
  submission_received: 'Suggestion received',
  correction_approved: 'Correction applied',
  correction_received: 'Correction received',
  place_nearby: 'New vegan spot nearby',
}

/**
 * Deliver an Expo push to all of a user's registered devices. Best-effort:
 * swallows every error so it never breaks the notification insert. Respects the
 * user's master push toggle (user_preferences.push_notifications); the mobile
 * app owns that switch.
 *
 * `data` is forwarded to the device so the app can deep-link on tap (mirrors the
 * web NotificationBell link rules: entity_type 'place' → place screen, etc.).
 */
export async function sendPushToUser(opts: {
  userId: string
  type: NotificationType
  body: string
  data?: Record<string, string | null>
}): Promise<void> {
  const { userId, type, body, data } = opts
  try {
    const admin = createAdminClient()

    // Master push toggle — default ON when the user has no preferences row.
    const { data: prefs } = await admin
      .from('user_preferences')
      .select('push_notifications')
      .eq('user_id', userId)
      .maybeSingle()
    if (prefs && (prefs as { push_notifications?: boolean }).push_notifications === false) return

    const { data: tokens } = await admin
      .from('user_push_tokens')
      .select('token')
      .eq('user_id', userId)
    if (!tokens?.length) return

    const messages = tokens.map(t => ({
      to: t.token,
      title: TITLES[type] ?? 'PlantsPack',
      body,
      sound: 'default',
      data: data ?? {},
    }))

    await fetch(EXPO_PUSH_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(messages),
    })
  } catch (e) {
    console.error('[sendPushToUser] threw', (e as Error)?.message)
  }
}
