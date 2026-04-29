import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'

// POST /api/cities/followed/seen — mark one followed city as "seen now",
// resetting the delta baseline to the current city score. Replaces the
// fire-and-forget write the old GET handler used to do, so deltas stop
// drifting just because someone refreshed the homepage.
//
// Body: { city: string, country: string }
// Returns: { ok: true } | { ok: false, reason: 'not_followed' | 'no_score' }
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json().catch(() => ({})) as { city?: string; country?: string }
    const { city, country } = body
    if (!city || !country) return NextResponse.json({ error: 'Missing city/country' }, { status: 400 })

    const admin = createAdminClient()

    // Fetch the user's row + the current score in parallel.
    const [followedRes, scoreRes] = await Promise.all([
      supabase
        .from('user_followed_cities')
        .select('id, last_seen_score, last_seen_grade')
        .eq('user_id', session.user.id)
        .eq('city', city)
        .eq('country', country)
        .maybeSingle(),
      admin
        .from('city_scores')
        .select('score, grade')
        .eq('city', city)
        .eq('country', country)
        .maybeSingle(),
    ])

    if (!followedRes.data) return NextResponse.json({ ok: false, reason: 'not_followed' })
    const score = scoreRes.data
    if (!score) return NextResponse.json({ ok: false, reason: 'no_score' })

    // No-op if nothing actually changed.
    if (followedRes.data.last_seen_score === score.score && followedRes.data.last_seen_grade === score.grade) {
      return NextResponse.json({ ok: true })
    }

    const { error } = await admin
      .from('user_followed_cities')
      .update({
        last_seen_score: score.score,
        last_seen_grade: score.grade,
        last_visited_at: new Date().toISOString(),
      })
      .eq('id', followedRes.data.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[Followed Cities seen] Error:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
