import { Metadata } from 'next'
import { computeAllScores } from '@/lib/compute-scores'
import CityRanksTable from '@/components/vegan-score/CityRanksTable'

export const revalidate = 600

export const metadata: Metadata = {
  title: 'City Ranks — Most Vegan-Friendly Cities | PlantsPack',
  description: 'Discover the most vegan-friendly cities worldwide. See rankings, scores, and contribute to improve your city.',
  alternates: { canonical: 'https://plantspack.com/city-ranks' },
}

export default async function CityRanksPage() {
  const { scores } = await computeAllScores()

  return <CityRanksTable scores={scores} />
}
