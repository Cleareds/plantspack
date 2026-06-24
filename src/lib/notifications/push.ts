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
  announcement: 'PlantsPack',
}

// Expo's push API accepts at most 100 messages per request.
const EXPO_BATCH = 100

async function postExpo(messages: object[]): Promise<void> {
  for (let i = 0; i < messages.length; i += EXPO_BATCH) {
    const chunk = messages.slice(i, i + EXPO_BATCH)
    await fetch(EXPO_PUSH_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(chunk),
    })
  }
}

/**
 * Broadcast an OS push to every device whose owner has opted in to
 * announcements. Opt-in is required for promotional push (App Store 4.5.4):
 * we send only to users with push_announcements = TRUE who have NOT disabled
 * the master push toggle. The in-app notification rows are inserted separately
 * by the broadcast route so the bell reaches everyone regardless of opt-in.
 *
 * `platforms` restricts the push to specific device platforms (e.g. ['ios'] for
 * an iOS-only broadcast). Omit to push to all platforms.
 *
 * Returns how many device messages were dispatched. Best-effort on transport.
 */
export async function sendAnnouncementPush(opts: {
  title: string
  body: string
  data?: Record<string, string | null>
  platforms?: ('ios' | 'android')[]
}): Promise<number> {
  const { title, body, data, platforms } = opts
  try {
    const admin = createAdminClient()

    // Opted-in users: explicit announcement opt-in AND master push not disabled.
    const { data: prefs } = await admin
      .from('user_preferences')
      .select('user_id, push_notifications, push_announcements')
      .eq('push_announcements', true)
    const optedIn = (prefs ?? [])
      .filter((p) => (p as { push_notifications?: boolean }).push_notifications !== false)
      .map((p) => (p as { user_id: string }).user_id)
    if (!optedIn.length) return 0

    const tokens: string[] = []
    // Chunk the IN() filter to keep the query well under PostgREST URL limits.
    for (let i = 0; i < optedIn.length; i += 500) {
      const ids = optedIn.slice(i, i + 500)
      let q = admin
        .from('user_push_tokens')
        .select('token')
        .in('user_id', ids)
      if (platforms?.length) q = q.in('platform', platforms)
      const { data: rows } = await q
      for (const r of rows ?? []) tokens.push((r as { token: string }).token)
    }
    if (!tokens.length) return 0

    const messages = tokens.map((to) => ({
      to, title, body, sound: 'default', data: data ?? {},
    }))
    await postExpo(messages)
    return messages.length
  } catch (e) {
    console.error('[sendAnnouncementPush] threw', (e as Error)?.message)
    return 0
  }
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
