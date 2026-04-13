import { Metadata } from 'next'
import { computeAllScores } from '@/lib/compute-scores'
import CityRanksTable from '@/components/vegan-score/CityRanksTable'

export const revalidate = 600

export const metadata: Metadata = {
  title: 'City Ranks — Most Vegan-Friendly Cities | PlantsPack',
  description: '1,000+ cities ranked by vegan-friendliness. Scores based on place density, variety, and community ratings. See how your city compares.',
  alternates: { canonical: 'https://plantspack.com/city-ranks' },
}

export default async function CityRanksPage() {
  const { scores } = await computeAllScores()

  return <CityRanksTable scores={scores} />
}
