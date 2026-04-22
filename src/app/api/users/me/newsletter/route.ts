import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'

/**
 * PATCH /api/users/me/newsletter - Toggle the logged-in user's marketing
 * newsletter opt-in. Writes the audit trio (opt_in, opted_in_at OR
 * unsubscribed_at, source='settings-page') so we can later prove when and
 * how consent was given or withdrawn — required by GDPR.
 */
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const optIn = body?.newsletter_opt_in === true

    const nowIso = new Date().toISOString()
    const admin = createAdminClient()

    const { error } = await admin
      .from('users')
      .update({
        newsletter_opt_in: optIn,
        newsletter_opted_in_at: optIn ? nowIso : null,
        newsletter_unsubscribed_at: optIn ? null : nowIso,
        newsletter_source: 'settings-page',
      })
      .eq('id', user.id)

    if (error) {
      console.error('Newsletter update error:', error)
      return NextResponse.json({ error: 'Failed to update preference' }, { status: 500 })
    }

    return NextResponse.json({ success: true, newsletter_opt_in: optIn })
  } catch (err) {
    console.error('Newsletter PATCH error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
