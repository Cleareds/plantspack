import { NextResponse } from 'next/server'
import { computeAllScores } from '@/lib/compute-scores'

// Cap drift between this endpoint and /api/home (which reads city_scores
// fresh) at 1 hour — a Lemmy reviewer hit a 24h drift that showed F/29
// here vs D/33 on the home hero after the sub-grade migration refreshed
// the MV. city_scores query is ~30ms indexed, so tighter cache is cheap.
export const revalidate = 3600

export async function GET() {
  const { scores, totalPlaces } = await computeAllScores()

  return NextResponse.json({
    scores,
    totalCities: scores.length,
    totalPlaces,
    generatedAt: new Date().toISOString(),
  }, {
    headers: {
      // Edge cache: 10 min served-as-fresh, 1h stale-while-revalidate.
      'Cache-Control': 's-maxage=600, stale-while-revalidate=3600',
    },
  })
}
