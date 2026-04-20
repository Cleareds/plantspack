import { NextResponse } from 'next/server'
import { computeAllScores } from '@/lib/compute-scores'

// Scores change slowly (new places trickle in). Daily ISR regen,
// plus a 10-minute edge cache with 24h stale-while-revalidate so
// Vercel's CDN absorbs most of the traffic instead of us recomputing.
export const revalidate = 86400

export async function GET() {
  const { scores, totalPlaces } = await computeAllScores()

  return NextResponse.json({
    scores,
    totalCities: scores.length,
    totalPlaces,
    generatedAt: new Date().toISOString(),
  }, {
    headers: {
      'Cache-Control': 's-maxage=600, stale-while-revalidate=86400',
    },
  })
}
