import { createAdminClient } from '@/lib/supabase-admin'
import { createNotification } from '@/lib/notifications/server'

const MAX_NEARBY = 200

/**
 * Notify users about a NEW place in a city they care about — their home_city
 * or a city they follow (user_followed_cities). City-level only: we store no
 * GPS for users.
 *
 * IMPORTANT: only call this from curated single-place paths (approved
 * submissions, individually admin-added places). NEVER from bulk import
 * scripts — otherwise a 2,000-row import would fan out tens of thousands of
 * notifications. Capped at MAX_NEARBY recipients with a log if it clips.
 *
 * Best-effort: returns the number notified, never throws into the caller.
 */
export async function notifyNearbyUsers(opts: {
  place: { id: string; name: string; city: string | null; country: string | null }
  excludeUserId?: string | null
}): Promise<number> {
  const { place, excludeUserId } = opts
  if (!place.city || !place.country) return 0

  try {
    const admin = createAdminClient()
    const recipients = new Set<string>()

    // 1) Home-city residents
    const { data: residents } = await admin
      .from('users')
      .select('id')
      .ilike('home_city', place.city)
      .ilike('home_country', place.country)
      .limit(MAX_NEARBY)
    for (const r of residents || []) recipients.add(r.id)

    // 2) Followers of that city
    const { data: followers } = await admin
      .from('user_followed_cities')
      .select('user_id')
      .ilike('city', place.city)
      .ilike('country', place.country)
      .limit(MAX_NEARBY)
    for (const f of followers || []) recipients.add(f.user_id)

    if (excludeUserId) recipients.delete(excludeUserId)
    if (recipients.size === 0) return 0

    let ids = [...recipients]
    if (ids.length > MAX_NEARBY) {
      console.warn(`[notifyNearbyUsers] ${ids.length} recipients for ${place.name} (${place.city}); capping at ${MAX_NEARBY}`)
      ids = ids.slice(0, MAX_NEARBY)
    }

    const message = `New vegan spot in ${place.city}: ${place.name}`
    await Promise.all(ids.map(uid =>
      createNotification({ userId: uid, type: 'place_nearby', entityType: 'place', entityId: place.id, message })
    ))
    return ids.length
  } catch (e) {
    console.error('[notifyNearbyUsers] threw', (e as Error)?.message)
    return 0
  }
}
