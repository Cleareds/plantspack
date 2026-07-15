import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'
import { sendAnnouncementPush } from '@/lib/notifications/push'

// Verify the caller is a signed-in admin. Returns the user id or null.
async function requireAdmin(): Promise<string | null> {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return null
  const admin = createAdminClient()
  const { data } = await admin.from('users').select('role').eq('id', user.id).single()
  return (data as { role?: string } | null)?.role === 'admin' ? user.id : null
}

const ALL_CHANNELS = ['web', 'ios', 'android'] as const
type Channel = (typeof ALL_CHANNELS)[number]

/**
 * Admin broadcast: writes one `announcement` notification row per recipient (the
 * in-app bell, web + mobile) and fires an OS push to opted-in devices. Title is
 * optional (defaults to "Plants Pack" in the push).
 *
 * Body: { message: string; title?: string; url?: string; channels?: string[] }
 *   - message  : required, the announcement text (rendered verbatim, no actor).
 *   - title    : optional push title.
 *   - url      : optional https link forwarded in push `data` for tap routing.
 *   - channels : subset of {'web','ios','android'}. Defaults to all (delivered
 *                everywhere). When all three are selected we store NULL so the
 *                row is unfiltered. Each client shows a row when channels IS NULL
 *                OR its surface key (web, or the device platform) is in channels.
 *
 * Recipients: if 'web' is selected, every user gets a bell row (the web bell is
 * universal). If it's an app-only broadcast, only users who actually have a
 * registered token on a selected platform get a row — no dead rows for web-only
 * users. Push fires only for the selected app platforms.
 */
export async function POST(req: Request) {
  const adminId = await requireAdmin()
  if (!adminId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  let payload: { message?: string; title?: string; url?: string; channels?: unknown }
  try { payload = await req.json() } catch { return NextResponse.json({ error: 'Bad JSON' }, { status: 400 }) }

  const message = (payload.message ?? '').trim()
  const title = (payload.title ?? '').trim() || 'Plants Pack'
  const url = (payload.url ?? '').trim() || null
  if (!message) return NextResponse.json({ error: 'message is required' }, { status: 400 })
  if (message.length > 500) return NextResponse.json({ error: 'message too long (max 500)' }, { status: 400 })

  // Channel targeting. Default = all channels.
  const requested = Array.isArray(payload.channels) ? payload.channels : null
  const channels: Channel[] = requested
    ? ALL_CHANNELS.filter((c) => requested.includes(c))
    : [...ALL_CHANNELS]
  if (!channels.length) return NextResponse.json({ error: 'select at least one channel' }, { status: 400 })
  // Store NULL when every channel is selected so the row is unfiltered.
  const channelsValue = channels.length === ALL_CHANNELS.length ? null : channels
  const includesWeb = channels.includes('web')
  const appPlatforms = channels.filter((c): c is 'ios' | 'android' => c === 'ios' || c === 'android')

  const admin = createAdminClient()

  // Recipient ids. Web is universal; an app-only broadcast targets only users
  // with a registered token on a selected platform.
  let ids: string[]
  if (includesWeb) {
    const { data: users, error: usersErr } = await admin.from('users').select('id')
    if (usersErr) return NextResponse.json({ error: usersErr.message }, { status: 500 })
    ids = (users ?? []).map((u) => (u as { id: string }).id)
  } else {
    const { data: rows, error: tokErr } = await admin
      .from('user_push_tokens').select('user_id').in('platform', appPlatforms)
    if (tokErr) return NextResponse.json({ error: tokErr.message }, { status: 500 })
    ids = [...new Set((rows ?? []).map((r) => (r as { user_id: string }).user_id))]
  }

  let inserted = 0
  for (let i = 0; i < ids.length; i += 500) {
    const rows = ids.slice(i, i + 500).map((user_id) => ({
      user_id,
      actor_id: null,
      type: 'announcement' as const,
      entity_type: null,
      entity_id: null,
      message,
      channels: channelsValue,
    }))
    const { error } = await admin.from('notifications').insert(rows)
    if (error) return NextResponse.json({ error: error.message, insertedSoFar: inserted }, { status: 500 })
    inserted += rows.length
  }

  // OS push to opted-in devices only (compliance), restricted to the selected
  // app platforms. `url` lets the app deep-link. Web-only broadcast → no push.
  const pushed = appPlatforms.length
    ? await sendAnnouncementPush({
        title,
        body: message,
        data: { type: 'announcement', url },
        platforms: appPlatforms,
      })
    : 0

  return NextResponse.json({ ok: true, recipients: inserted, pushed, channels })
}
