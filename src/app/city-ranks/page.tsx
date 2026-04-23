import { Metadata } from 'next'
import { computeAllScores } from '@/lib/compute-scores'
import { loadCityImages } from '@/lib/city-images'
import CityRanksTable from '@/components/vegan-score/CityRanksTable'

// 1h cache keeps drift with /api/home capped. MV read is cheap (~30ms).
export const revalidate = 3600

export const metadata: Metadata = {
  title: 'City Ranks — Most Vegan-Friendly Cities | PlantsPack',
  description: '1,000+ cities ranked by vegan-friendliness. Scores based on place density, variety, and community ratings. See how your city compares.',
  alternates: { canonical: 'https://plantspack.com/city-ranks' },
}

export default async function CityRanksPage() {
  const [{ scores }, cityImages] = await Promise.all([
    computeAllScores(),
    loadCityImages(),
  ])

  return <CityRanksTable scores={scores} cityImages={cityImages} />
}
