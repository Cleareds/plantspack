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

/**
 * Admin broadcast: writes one `announcement` notification row per user (the
 * in-app bell, web + mobile) and fires an OS push to users who opted in to
 * announcements. Title is optional (defaults to "PlantsPack" in the push).
 *
 * Body: { message: string; title?: string; url?: string }
 *   - message  : required, the announcement text (rendered verbatim, no actor).
 *   - title    : optional push title.
 *   - url       : optional https link forwarded in push `data` for tap routing.
 */
export async function POST(req: Request) {
  const adminId = await requireAdmin()
  if (!adminId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  let payload: { message?: string; title?: string; url?: string }
  try { payload = await req.json() } catch { return NextResponse.json({ error: 'Bad JSON' }, { status: 400 }) }

  const message = (payload.message ?? '').trim()
  const title = (payload.title ?? '').trim() || 'PlantsPack'
  const url = (payload.url ?? '').trim() || null
  if (!message) return NextResponse.json({ error: 'message is required' }, { status: 400 })
  if (message.length > 500) return NextResponse.json({ error: 'message too long (max 500)' }, { status: 400 })

  const admin = createAdminClient()

  // All recipient ids. (User base is small; a flat fetch is fine. Chunk inserts
  // so we never exceed payload limits as it grows.)
  const { data: users, error: usersErr } = await admin.from('users').select('id')
  if (usersErr) return NextResponse.json({ error: usersErr.message }, { status: 500 })
  const ids = (users ?? []).map((u) => (u as { id: string }).id)

  let inserted = 0
  for (let i = 0; i < ids.length; i += 500) {
    const rows = ids.slice(i, i + 500).map((user_id) => ({
      user_id,
      actor_id: null,
      type: 'announcement' as const,
      entity_type: null,
      entity_id: null,
      message,
    }))
    const { error } = await admin.from('notifications').insert(rows)
    if (error) return NextResponse.json({ error: error.message, insertedSoFar: inserted }, { status: 500 })
    inserted += rows.length
  }

  // OS push to opted-in devices only (compliance). `url` lets the app deep-link.
  const pushed = await sendAnnouncementPush({
    title,
    body: message,
    data: { type: 'announcement', url },
  })

  return NextResponse.json({ ok: true, recipients: inserted, pushed })
}
