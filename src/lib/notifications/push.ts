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

type ExpoTicket = { status: 'ok' | 'error'; id?: string; message?: string; details?: { error?: string } }

// POST the messages in <=100 chunks and return one ticket per message, in the
// same order (null where a chunk failed at the transport level, so indices stay
// aligned with the input for token pruning).
async function sendExpo(messages: object[]): Promise<(ExpoTicket | null)[]> {
  const tickets: (ExpoTicket | null)[] = []
  for (let i = 0; i < messages.length; i += EXPO_BATCH) {
    const chunk = messages.slice(i, i + EXPO_BATCH)
    try {
      const res = await fetch(EXPO_PUSH_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(chunk),
      })
      const json = (await res.json().catch(() => null)) as { data?: ExpoTicket[] } | null
      const data = json?.data ?? []
      for (let k = 0; k < chunk.length; k++) tickets.push(data[k] ?? null)
    } catch {
      for (let k = 0; k < chunk.length; k++) tickets.push(null)
    }
  }
  return tickets
}

// Act on the immediate tickets: drop tokens Expo reports as DeviceNotRegistered
// (uninstalled / permission revoked) so we stop pushing to dead devices, and
// log any other error. NOTE: DeviceNotRegistered also surfaces later in push
// *receipts* (fetched ~15 min after send); polling those is a future
// enhancement — this handles the cases Expo returns synchronously.
async function pruneDeadTokens(
  admin: ReturnType<typeof createAdminClient>,
  tokens: string[],
  tickets: (ExpoTicket | null)[],
): Promise<void> {
  const dead: string[] = []
  tickets.forEach((t, i) => {
    if (t?.status !== 'error') return
    const err = t.details?.error
    if (err === 'DeviceNotRegistered' && tokens[i]) dead.push(tokens[i])
    else console.error('[push] ticket error', err ?? t.message)
  })
  if (!dead.length) return
  try {
    await admin.from('user_push_tokens').delete().in('token', dead)
    console.log(`[push] pruned ${dead.length} dead token(s)`)
  } catch (e) {
    console.error('[push] prune failed', (e as Error)?.message)
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
    const tickets = await sendExpo(messages)
    await pruneDeadTokens(admin, tokens, tickets)
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
 * app owns that switch. Prunes tokens Expo reports as no longer registered.
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

    const toks = tokens.map((t) => (t as { token: string }).token)
    const messages = toks.map((to) => ({
      to,
      title: TITLES[type] ?? 'PlantsPack',
      body,
      sound: 'default',
      data: data ?? {},
    }))

    const tickets = await sendExpo(messages)
    await pruneDeadTokens(admin, toks, tickets)
  } catch (e) {
    console.error('[sendPushToUser] threw', (e as Error)?.message)
  }
}
