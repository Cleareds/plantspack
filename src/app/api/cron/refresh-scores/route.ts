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

  revalidatePath('/city-ranks')
  revalidatePath('/')

  return NextResponse.json({
    success: true,
    durationMs: Date.now() - started,
    refreshedAt: new Date().toISOString(),
  })
}
