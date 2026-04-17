import { createAdminClient } from '@/lib/supabase-admin'
import type { CityScore } from '@/lib/score-utils'

/**
 * Reads pre-computed scores from the `city_scores` materialized view.
 * The MV is refreshed by `refresh_directory_views()` on place/review mutations
 * and by a daily Vercel cron as a safety net. Formula lives in SQL.
 */
export async function computeAllScores(): Promise<{ scores: CityScore[]; totalPlaces: number }> {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('city_scores')
    .select('city, country, score, grade, fv_count, place_count, per_capita, center_lat, center_lng, accessibility, choice, variety, quality')
    .order('score', { ascending: false })

  if (error) throw error

  const scores: CityScore[] = (data || []).map((r: any) => ({
    city: r.city,
    country: r.country,
    score: r.score,
    grade: r.grade,
    fvCount: r.fv_count,
    placeCount: r.place_count,
    perCapita: r.per_capita ?? undefined,
    center: r.center_lat != null && r.center_lng != null
      ? [Number(r.center_lat), Number(r.center_lng)]
      : undefined,
    breakdown: {
      accessibility: r.accessibility,
      choice: r.choice,
      variety: r.variety,
      quality: r.quality,
    },
  }))

  const totalPlaces = scores.reduce((sum, s) => sum + s.placeCount, 0)
  return { scores, totalPlaces }
}
