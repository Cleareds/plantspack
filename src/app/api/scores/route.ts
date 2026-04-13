import { NextResponse } from 'next/server'
import { computeAllScores } from '@/lib/compute-scores'

// Pre-compute all city scores server-side. Cached for 10 minutes.
export const revalidate = 86400

export async function GET() {
  const { scores, totalPlaces } = await computeAllScores()

  return NextResponse.json({
    scores,
    totalCities: scores.length,
    totalPlaces,
    generatedAt: new Date().toISOString(),
  })
}
