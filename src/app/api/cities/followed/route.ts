import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'

// GET /api/cities/followed — user's followed cities with live scores + deltas.
// Queries city_scores directly (a single indexed lookup per followed city)
// instead of loading the full scores array via /api/scores.
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: followed } = await supabase
      .from('user_followed_cities')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })

    if (!followed || followed.length === 0) {
      return NextResponse.json({ cities: [] })
    }

    const admin = createAdminClient()
    const cityKeys = followed.map((f: any) => ({ city: f.city, country: f.country }))
    const { data: scoresRows } = await admin
      .from('city_scores')
      .select('city, country, score, grade, place_count, fv_count, accessibility, choice, variety, quality')
      .in('city', cityKeys.map(k => k.city))
      .in('country', cityKeys.map(k => k.country))

    const scoreMap: Record<string, any> = {}
    for (const s of scoresRows || []) scoreMap[`${s.city}|||${s.country}`] = s

    // Grade thresholds aligned with the v2 formula
    const gradeThresholds = [
      { grade: 'A+', min: 88 },
      { grade: 'A', min: 78 },
      { grade: 'B', min: 62 },
      { grade: 'C', min: 45 },
      { grade: 'D', min: 30 },
    ]

    const cities = followed.map((f: any) => {
      const score = scoreMap[`${f.city}|||${f.country}`]
      const currentScore = score?.score ?? 0
      const currentGrade = score?.grade ?? 'F'
      const delta = f.last_seen_score != null ? currentScore - f.last_seen_score : null

      let nextGrade: string | null = null
      let pointsToNext: number | null = null
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
        placeCount: score?.place_count ?? 0,
        fvCount: score?.fv_count ?? 0,
        breakdown: score
          ? {
              accessibility: score.accessibility,
              choice: score.choice,
              variety: score.variety,
              quality: score.quality,
            }
          : undefined,
      }
    })

    for (const f of followed) {
      const score = scoreMap[`${f.city}|||${f.country}`]
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
