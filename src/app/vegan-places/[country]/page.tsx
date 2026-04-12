import { Metadata } from 'next'
import Link from 'next/link'
import { Globe } from 'lucide-react'
import { generateCountryDescription } from '@/lib/vegan-scene-descriptions'
import { getCities } from '@/lib/directory-queries'
import { loadCityImages } from '@/lib/city-images'
import { getGradeColor } from '@/lib/score-utils'
import { FilteredTotal } from '@/components/ui/FilteredCount'
import CityPlacesList from '@/components/places/CityPlacesList'
import CountryCityGrid from '@/components/places/CountryCityGrid'

export const revalidate = 300

interface PageProps {
  params: Promise<{ country: string }>
}

async function getCityScores(): Promise<any[]> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://plantspack.com'
    const res = await fetch(`${baseUrl}/api/scores`, { next: { revalidate: 600 } })
    if (!res.ok) return []
    const data = await res.json()
    return data.scores || []
  } catch { return [] }
}

async function fetchCountryPlaces(country: string) {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://plantspack.com'
    const res = await fetch(`${baseUrl}/api/places/directory?level=places&country=${encodeURIComponent(country)}&limit=500`, { cache: 'no-store' })
    if (!res.ok) return { places: [], country: country.replace(/-/g, ' '), total: 0 }
    return res.json()
  } catch { return { places: [], country: country.replace(/-/g, ' '), total: 0 } }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { country } = await params
  const { cities, country: countryName } = await getCities(country)
  const totalPlaces = cities.reduce((sum: number, c: any) => sum + c.count, 0)

  return {
    title: `Vegan Places in ${countryName} (${totalPlaces}) | PlantsPack`,
    description: `Find ${totalPlaces} vegan restaurants, stores, and stays in ${countryName}. Browse by city with ratings and reviews.`,
    alternates: { canonical: `https://plantspack.com/vegan-places/${country}` },
    openGraph: {
      title: `Vegan Places in ${countryName}`,
      description: `Discover ${totalPlaces} vegan-friendly places across ${cities.length} cities in ${countryName}.`,
      type: 'website',
      siteName: 'PlantsPack',
    },
  }
}

export default async function CountryPage({ params }: PageProps) {
  const { country } = await params
  const [{ cities, country: countryName }, { places }, allScores, cityImages] = await Promise.all([
    getCities(country),
    fetchCountryPlaces(country),
    getCityScores(),
    loadCityImages(),
  ])
  const totalPlaces = cities.reduce((sum: number, c: any) => sum + c.count, 0)
  const totalFv = cities.reduce((sum: number, c: any) => sum + (c.stats?.fullyVegan || 0), 0)

  // Country scores (for city cards, no average displayed)
  const countryScores = allScores.filter((s: any) => s.country === countryName)

  // Country description
  const countryStats = {
    total: totalPlaces, categories: {} as Record<string, number>,
    fullyVegan: 0, petFriendly: 0, cuisines: [] as string[],
    sampleNames: [] as string[], cityCount: cities.length,
  }
  const cuisineCounts: Record<string, number> = {}
  for (const city of cities) {
    if (!city.stats) continue
    for (const [cat, n] of Object.entries(city.stats.categories || {})) {
      countryStats.categories[cat] = (countryStats.categories[cat] || 0) + (n as number)
    }
    countryStats.fullyVegan += city.stats.fullyVegan || 0
    countryStats.petFriendly += city.stats.petFriendly || 0
    for (const c of city.stats.cuisines || []) cuisineCounts[c] = (cuisineCounts[c] || 0) + 1
    if (countryStats.sampleNames.length < 5) countryStats.sampleNames.push(...(city.stats.sampleNames || []).slice(0, 2))
  }
  countryStats.cuisines = Object.entries(cuisineCounts).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([k]) => k)
  countryStats.sampleNames = countryStats.sampleNames.slice(0, 5)
  const sceneDescription = generateCountryDescription(countryName, countryStats)

  return (
    <div className="min-h-screen bg-surface">
      <div className="max-w-5xl mx-auto px-4 py-8 md:py-12">
        {/* Breadcrumbs */}
        <nav className="flex items-center gap-2 text-sm text-on-surface-variant mb-6">
          <Link href="/" className="hover:text-primary transition-colors">Home</Link>
          <span className="text-outline">/</span>
          <Link href="/vegan-places" className="hover:text-primary transition-colors">Vegan Places</Link>
          <span className="text-outline">/</span>
          <span className="text-on-surface font-medium">{countryName}</span>
        </nav>

        {/* Header */}
        <div className="mb-8">
          <h1 className="font-headline font-extrabold text-3xl md:text-4xl text-on-surface tracking-tight mb-3">
            Vegan Places in <span className="text-primary">{countryName}</span>
          </h1>
          <p className="text-on-surface-variant text-base mb-3">
            {totalPlaces > 0
              ? <><FilteredTotal total={totalPlaces} fullyVegan={totalFv} /> vegan restaurants, stores, and stays across {cities.length} {cities.length === 1 ? 'city' : 'cities'}.</>
              : <>Explore vegan-friendly places in {countryName}.</>
            }
          </p>
          {sceneDescription && (
            <p className="text-on-surface-variant text-sm leading-relaxed max-w-3xl mb-2">{sceneDescription}</p>
          )}
          <div className="flex gap-3 mt-4">
            <Link href={`/map?location=${encodeURIComponent(countryName)}`}
              className="inline-flex items-center gap-2 text-sm font-medium silk-gradient text-on-primary-btn px-4 py-2 rounded-lg transition-colors hover:opacity-90">
              <Globe className="h-4 w-4" /> View on map
            </Link>
          </div>
        </div>

        {/* Cities Grid — interactive with sorting */}
        {cities.length > 0 && (
          <>
            <h2 className="text-lg font-semibold text-on-surface mb-4">Cities in {countryName}</h2>
            <CountryCityGrid
              cities={cities}
              cityImages={cityImages}
              countryName={countryName}
              countrySlug={country}
              cityScores={countryScores}
            />
          </>
        )}

        {/* All places in country with map */}
        {places.length > 0 && (
          <div className="mt-12">
            <h2 className="text-lg font-semibold text-on-surface mb-4">All {places.length} places in {countryName}</h2>
            <CityPlacesList places={places} />
          </div>
        )}

        {places.length === 0 && cities.length === 0 && (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">🗺️</div>
            <h2 className="text-xl font-semibold text-on-surface mb-2">No places yet in {countryName}</h2>
            <p className="text-on-surface-variant mb-6">Be the first to add a vegan place!</p>
          </div>
        )}
      </div>
    </div>
  )
}
