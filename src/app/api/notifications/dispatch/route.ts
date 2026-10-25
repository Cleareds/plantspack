import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'
import { sendPushToUser } from '@/lib/notifications/push'
import { sendNotificationEmail } from '@/lib/email'
import type { NotificationType } from '@/types/notifications'

/**
 * Push + email fan-out for social notification rows.
 *
 * Called only by the Postgres trigger `dispatch_notification` (migration
 * 20261025140000) through pg_net, with the Vault-backed REVALIDATE_SECRET.
 * The DB triggers create the row for every like / comment / reply / follow /
 * mention, whether it came from the web or straight from the mobile app, so
 * this route is the one place that turns a row into a push and an email.
 */

const VERB: Record<string, string> = {
  like: 'liked your post',
  comment: 'commented on your post',
  reply: 'replied to your comment',
  follow: 'started following you',
  mention: 'mentioned you',
}

const PUSH_PREF: Record<string, string> = {
  like: 'push_likes',
  comment: 'push_comments',
  reply: 'push_comments',
  follow: 'push_follows',
  mention: 'push_mentions',
}

const EMAIL_PREF: Record<string, string> = {
  like: 'email_likes',
  comment: 'email_comments',
  reply: 'email_comments',
  follow: 'email_follows',
  mention: 'email_mentions',
}

const SITE = 'https://www.plantspack.com'

export async function POST(request: NextRequest) {
  const auth = request.headers.get('authorization') ?? ''
  const secret = process.env.REVALIDATE_SECRET
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { notification_id } = (await request.json().catch(() => ({}))) as { notification_id?: string }
  if (!notification_id) return NextResponse.json({ error: 'notification_id required' }, { status: 400 })

  const admin = createAdminClient()
  const { data: n } = await admin
    .from('notifications')
    .select('id, user_id, actor_id, type, entity_type, entity_id, url, message')
    .eq('id', notification_id)
    .maybeSingle()
  if (!n) return NextResponse.json({ ok: true, skipped: 'missing' })

  const [{ data: actor }, { data: recipient }] = await Promise.all([
    n.actor_id
      ? admin.from('users').select('username, first_name, last_name').eq('id', n.actor_id).maybeSingle()
      : Promise.resolve({ data: null }),
    admin.from('users').select('email, username').eq('id', n.user_id).maybeSingle(),
  ])

  const actorName =
    [actor?.first_name, actor?.last_name].filter(Boolean).join(' ').trim() || actor?.username || 'Someone'
  const body = n.message || `${actorName} ${VERB[n.type] ?? 'sent you a notification'}`

  // Per-type switches; a missing row means everything is on. push_likes is
  // off by default, so likes reach the bell but not the phone.
  const { data: prefRow } = await admin
    .from('notification_preferences')
    .select('push_likes, push_comments, push_follows, push_mentions, email_likes, email_comments, email_follows, email_mentions')
    .eq('user_id', n.user_id)
    .maybeSingle()
  const prefs = (prefRow ?? {}) as Record<string, boolean | null>
  const on = (key: string | undefined) => !key || prefs[key] !== false

  if (on(PUSH_PREF[n.type])) {
    await sendPushToUser({
      userId: n.user_id,
      type: n.type as NotificationType,
      body,
      data: { type: n.type, entityType: n.entity_type ?? null, entityId: n.entity_id ?? null, url: n.url ?? null },
    })
  }

  // Email keeps the pre-2026-10-25 behaviour: the old web route sent no
  // email when push_* was off, so an email needs BOTH switches. Without this,
  // push_likes=false / email_likes=true (every account's default) would start
  // emailing every like.
  const emailKey = EMAIL_PREF[n.type]
  if (emailKey && recipient?.email && actor?.username) {
    if (on(emailKey) && on(PUSH_PREF[n.type])) {
      const entityUrl = n.url ? (n.url.startsWith('/') ? `${SITE}${n.url}` : n.url) : undefined
      await sendNotificationEmail(
        recipient.email,
        recipient.username ?? '',
        n.type as 'like' | 'comment' | 'reply' | 'follow' | 'mention',
        actor.username,
        entityUrl,
      ).catch((err) => console.error('[dispatch] email failed', (err as Error)?.message))
    }
  }

  return NextResponse.json({ ok: true })
}
