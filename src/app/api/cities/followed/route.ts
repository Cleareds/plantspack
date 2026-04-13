import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'

// GET /api/cities/followed — get user's followed cities with live scores + deltas
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Get user's followed cities
    const { data: followed } = await supabase
      .from('user_followed_cities')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })

    if (!followed || followed.length === 0) {
      return NextResponse.json({ cities: [] })
    }

    // Get live scores from cached API (much faster than recomputing)
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://plantspack.com'
    const scoresRes = await fetch(`${baseUrl}/api/scores`, { next: { revalidate: 600 } })
    const scoresData = await scoresRes.json()
    const scores = scoresData.scores || []
    const scoreMap = new Map(scores.map((s: any) => [`${s.city}|||${s.country}`, s]))

    // Grade thresholds for "next grade" calculation
    const gradeThresholds = [
      { grade: 'A+', min: 90 },
      { grade: 'A', min: 80 },
      { grade: 'B', min: 65 },
      { grade: 'C', min: 50 },
      { grade: 'D', min: 35 },
    ]

    const cities = followed.map((f: any) => {
      const score = scoreMap.get(`${f.city}|||${f.country}`)
      const currentScore = score?.score || 0
      const currentGrade = score?.grade || 'F'
      const delta = f.last_seen_score != null ? currentScore - f.last_seen_score : null

      // Next grade info
      let nextGrade = null
      let pointsToNext = null
      for (const t of gradeThresholds) {
        if (currentScore < t.min) {
          nextGrade = t.grade
          pointsToNext = t.min - currentScore
        }
      }

      return {
        city: f.city,
        country: f.country,
        currentScore,
        currentGrade,
        lastSeenScore: f.last_seen_score,
        lastSeenGrade: f.last_seen_grade,
        delta,
        nextGrade,
        pointsToNext,
        placeCount: score?.placeCount || 0,
        fvCount: score?.fvCount || 0,
        breakdown: score?.breakdown,
      }
    })

    // Update last_seen scores (mark as read)
    const admin = createAdminClient()
    for (const f of followed) {
      const score = scoreMap.get(`${f.city}|||${f.country}`)
      if (score && (f.last_seen_score !== score.score || f.last_seen_grade !== score.grade)) {
        await admin.from('user_followed_cities').update({
          last_seen_score: score.score,
          last_seen_grade: score.grade,
          last_visited_at: new Date().toISOString(),
        }).eq('id', f.id)
      }
    }

    return NextResponse.json({ cities })
  } catch (error) {
    console.error('[Followed Cities] Error:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
