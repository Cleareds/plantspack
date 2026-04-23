import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase-admin'

// Vercel cron safety net: refreshes directory + city_scores MVs daily.
// Mutation endpoints already trigger refresh_directory_views() on each write,
// so this is belt-and-suspenders. Revalidates the pages that embed score data.
export const runtime = 'nodejs'
export const maxDuration = 60

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const started = Date.now()
  const supabase = createAdminClient()

  const { error } = await supabase.rpc('refresh_directory_views')
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Piggy-backing on the daily cron: archive any place whose
  // scheduled_archive_at has passed. Avoids a separate cron slot.
  let scheduledArchived = 0
  try {
    const nowIso = new Date().toISOString()
    const { data: archived, error: archErr } = await supabase
      .from('places')
      .update({ archived_at: nowIso, archived_reason: 'scheduled-closure' })
      .is('archived_at', null)
      .lte('scheduled_archive_at', nowIso)
      .not('scheduled_archive_at', 'is', null)
      .select('id, slug')
    if (archErr) {
      console.error('[cron] scheduled-archive error:', archErr.message)
    } else {
      scheduledArchived = archived?.length || 0
      if (scheduledArchived > 0) {
        console.log(`[cron] archived ${scheduledArchived} scheduled places:`, (archived || []).map((r: any) => r.slug).join(', '))
      }
    }
  } catch (e: any) {
    console.error('[cron] scheduled-archive exception:', e?.message)
  }

  revalidatePath('/city-ranks')
  revalidatePath('/')

  return NextResponse.json({
    success: true,
    durationMs: Date.now() - started,
    refreshedAt: new Date().toISOString(),
    scheduledArchived,
  })
}
