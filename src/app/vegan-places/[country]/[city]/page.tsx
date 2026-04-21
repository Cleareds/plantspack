import { Metadata } from 'next'
import Link from 'next/link'
import { Globe } from 'lucide-react'
import AddPlaceButton from '@/components/places/AddPlaceButton'
import PinCityButton from '@/components/places/PinCityButton'
import FollowCityButton from '@/components/places/FollowCityButton'
import { generateCityDescription, generateCityMetaDescription } from '@/lib/vegan-scene-descriptions'
import { FilteredTotal } from '@/components/ui/FilteredCount'
import { getGradeColor, getScoreBarColor } from '@/lib/score-utils'
import CityPlacesList from '@/components/places/CityPlacesList'
import CityExperiencesSection from '@/components/city/CityExperiencesSection'

export const dynamic = 'force-dynamic' // Always fetch fresh data — no stale ISR cache

interface PageProps {
  params: Promise<{ country: string; city: string }>
}

interface Place {
  id: string
  slug: string | null
  name: string
  category: string
  address: string
  description: string | null
  images: string[]
  main_image_url: string | null
  average_rating: number
  review_count: number
  is_pet_friendly: boolean
  website: string | null
  phone: string | null
  opening_hours: Record<string, string> | null
  google_place_id: string | null
  latitude: number
  longitude: number
  vegan_level: string | null
  cuisine_types: string[]
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { country, city } = await params
  const { places, city: cityName, country: countryName } = await fetchCityPlaces(country, city)

  const fv = places.filter((p: Place) => p.vegan_level === 'fully_vegan').length
  const eat = places.filter((p: Place) => p.category === 'eat').length
  const store = places.filter((p: Place) => p.category === 'store').length
  const hotel = places.filter((p: Place) => p.category === 'hotel').length
  const pet = places.filter((p: Place) => p.is_pet_friendly).length
  const cuisineSet = new Set<string>()
  for (const p of places) (p.cuisine_types || []).forEach((c: string) => {
    if (c && c !== 'vegan' && c !== 'regional') cuisineSet.add(c.replace(/_/g, ' '))
  })
  const sampleNames = places.slice(0, 6).map((p: Place) => p.name)

  const metaDesc = generateCityMetaDescription(cityName, countryName, {
    total: places.length,
    categories: { eat, store, hotel },
    cuisines: Array.from(cuisineSet).slice(0, 6),
    sampleNames,
    fullyVegan: fv,
    petFriendly: pet,
  })

  const title = fv > 0
    ? `Vegan Places in ${cityName}, ${countryName} — ${places.length} Spots (${fv} Fully Vegan) | PlantsPack`
    : `Vegan Places in ${cityName}, ${countryName} — ${places.length} Spots | PlantsPack`

  return {
    title,
    description: metaDesc,
    alternates: { canonical: `https://plantspack.com/vegan-places/${country}/${city}` },
    openGraph: {
      title: `Vegan Places in ${cityName}, ${countryName}`,
      description: metaDesc,
      type: 'website',
      siteName: 'PlantsPack',
    },
  }
}

// JSON-LD structured data for SEO
function generateJsonLd(places: Place[], cityName: string, countryName: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `Vegan Places in ${cityName}, ${countryName}`,
    numberOfItems: places.length,
    itemListElement: places.slice(0, 50).map((place, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      item: {
        '@type': place.category === 'hotel' ? 'LodgingBusiness' : place.category === 'store' ? 'Store' : 'Restaurant',
        name: place.name,
        address: place.address,
        geo: {
          '@type': 'GeoCoordinates',
          latitude: place.latitude,
          longitude: place.longitude,
        },
        ...(place.average_rating > 0 ? {
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: place.average_rating,
            reviewCount: place.review_count || 1,
          },
        } : {}),
        ...(place.website ? { url: place.website } : {}),
      },
    })),
  }
}

async function fetchCityPlaces(country: string, city: string) {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://plantspack.com'
    // City query paginates server-side so we always get ALL places, no cap.
    const res = await fetch(`${baseUrl}/api/places/directory?level=places&country=${encodeURIComponent(country)}&city=${encodeURIComponent(city)}`, { next: { revalidate: 3600 } })
    if (!res.ok) return { places: [], city: city.replace(/-/g, ' '), country: country.replace(/-/g, ' '), total: 0 }
    return res.json()
  } catch {
    return { places: [], city: city.replace(/-/g, ' '), country: country.replace(/-/g, ' '), total: 0 }
  }
}

async function getCityScore(cityName: string, countryName: string) {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://plantspack.com'
    const res = await fetch(`${baseUrl}/api/scores`, { next: { revalidate: 86400 } })
    if (!res.ok) return null
    const data = await res.json()
    return data.scores?.find((s: any) => s.city === cityName && s.country === countryName) || null
  } catch { return null }
}

export default async function CityPage({ params }: PageProps) {
  const { country, city } = await params
  const [{ places, city: cityName, country: countryName }, cityScore] = await Promise.all([
    fetchCityPlaces(country, city),
    getCityScore(city.replace(/-/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()), country.replace(/-/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())),
  ])

  // Build stats from fetched places for data-driven description
  const cityStats = {
    total: places.length,
    categories: {} as Record<string, number>,
    fullyVegan: 0,
    petFriendly: 0,
    cuisines: [] as string[],
    sampleNames: places.slice(0, 8).map((p: Place) => p.name),
  }
  const cuisineCounts: Record<string, number> = {}
  for (const p of places) {
    cityStats.categories[p.category] = (cityStats.categories[p.category] || 0) + 1
    if ((p as any).vegan_level === 'fully_vegan') cityStats.fullyVegan++
    if (p.is_pet_friendly) cityStats.petFriendly++
    for (const ct of ((p as any).cuisine_types || [])) {
      if (ct && ct !== 'vegan') cuisineCounts[ct] = (cuisineCounts[ct] || 0) + 1
    }
  }
  cityStats.cuisines = Object.entries(cuisineCounts).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([k]) => k)
  const sceneDescription = generateCityDescription(cityName, countryName, cityStats)

  const categories = [...new Set(places.map((p: Place) => p.category))] as string[]
  categories.sort()

  return (
    <div className="min-h-screen bg-surface">
      {/* JSON-LD */}
      {places.length > 0 && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(generateJsonLd(places, cityName, countryName)),
          }}
        />
      )}

      <div className="max-w-5xl mx-auto px-4 py-8 md:py-12">
        {/* Breadcrumbs — mobile: Country > City, desktop: full path */}
        <nav className="flex items-center gap-2 text-sm text-on-surface-variant mb-6">
          <Link href="/" className="hidden md:inline hover:text-primary transition-colors">Home</Link>
          <span className="hidden md:inline text-outline">/</span>
          <Link href="/vegan-places" className="hidden md:inline hover:text-primary transition-colors">Vegan Places</Link>
          <span className="hidden md:inline text-outline">/</span>
          <Link href={`/vegan-places/${country}`} className="hover:text-primary transition-colors">{countryName}</Link>
          <span className="text-outline">/</span>
          <span className="text-on-surface font-medium">{cityName}</span>
        </nav>

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-start justify-between gap-4 mb-3">
            <h1 className="font-headline font-extrabold text-3xl md:text-4xl text-on-surface tracking-tight">
              Vegan Places in <span className="text-primary">{cityName}</span>
            </h1>
            {cityScore && (
              <div className="text-right flex-shrink-0">
                <span className={`text-3xl font-black ${getGradeColor(cityScore.grade)}`}>{cityScore.grade}</span>
                <p className="text-[10px] text-on-surface-variant">{cityScore.score}/100</p>
              </div>
            )}
          </div>
          {cityScore?.breakdown && (
            <div className="flex gap-4 mb-3 text-[10px] text-on-surface-variant">
              <span>Accessibility <strong>{cityScore.breakdown.accessibility}</strong>/20</span>
              <span>Choice <strong>{cityScore.breakdown.choice}</strong>/20</span>
              <span>Variety <strong>{cityScore.breakdown.variety}</strong>/30</span>
              <span>Quality <strong>{cityScore.breakdown.quality}</strong>/30</span>
            </div>
          )}
          {cityScore && (
            <div className="max-w-xs mb-3">
              <div className="h-1.5 bg-surface-container-low rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${getScoreBarColor(cityScore.score)} transition-all`} style={{ width: `${cityScore.score}%` }} />
              </div>
            </div>
          )}
          <p className="text-on-surface-variant text-base mb-3">
            {places.length > 0
              ? <><FilteredTotal total={places.length} fullyVegan={places.filter((p: any) => p.vegan_level === 'fully_vegan').length} /> vegan restaurants, stores, and stays in {cityName}, {countryName}.</>
              : <>Discover vegan-friendly places in {cityName}.</>
            }
          </p>
          {sceneDescription && (
            <p className="text-on-surface-variant text-sm leading-relaxed max-w-3xl mb-2">{sceneDescription}</p>
          )}
          <div className="flex flex-wrap gap-3">
            <Link
              href={`/map?location=${encodeURIComponent(cityName + ', ' + countryName)}`}
              className="inline-flex items-center gap-2 text-sm font-medium silk-gradient text-on-primary-btn px-4 py-2 rounded-lg transition-colors hover:opacity-90"
            >
              <Globe className="h-4 w-4" />
              View on map
            </Link>
            <AddPlaceButton
              cityName={cityName}
              countryName={countryName}
              className="inline-flex items-center gap-2 text-sm font-medium text-on-surface-variant ghost-border px-4 py-2 rounded-lg transition-colors hover:bg-surface-container-low"
            />
            <PinCityButton cityName={cityName} countryName={countryName} />
            <FollowCityButton cityName={cityName} countryName={countryName} currentScore={cityScore?.score} currentGrade={cityScore?.grade} />
          </div>
        </div>

        {/* Vegan experiences for this city */}
        <div className="mb-8">
          <CityExperiencesSection
            countrySlug={country}
            citySlug={city}
            cityName={cityName}
          />
        </div>

        {/* Places list with client-side category filter + map */}
        {places.length > 0 ? (
          <CityPlacesList places={places} />
        ) : (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">🌱</div>
            <h2 className="text-xl font-semibold text-on-surface mb-2">No places yet in {cityName}</h2>
            <p className="text-on-surface-variant mb-6">
              Know a vegan restaurant or store in {cityName}? Be the first to add it!
            </p>
            <AddPlaceButton
              cityName={cityName}
              countryName={countryName}
              className="inline-flex items-center gap-2 silk-gradient hover:opacity-90 text-on-primary-btn px-6 py-3 rounded-xl font-medium"
            />
          </div>
        )}

        {/* Related: other cities in the same country */}
        <div className="mt-16 pt-8 border-t border-outline-variant/15">
          <h2 className="text-lg font-semibold text-on-surface mb-4">
            More vegan places in {countryName}
          </h2>
          <p className="text-sm text-on-surface-variant">
            <Link href={`/vegan-places/${country}`} className="text-primary hover:underline font-medium">
              Browse all cities in {countryName} &rarr;
            </Link>
          </p>
        </div>

        {/* CTA */}
        <div className="mt-8 text-center">
          <div className="inline-block bg-surface-container-low rounded-xl px-6 py-4 max-w-lg">
            <p className="text-sm text-on-surface-variant">
              Missing a place? <AddPlaceButton cityName={cityName} countryName={countryName} className="text-primary hover:underline font-semibold inline">Add it here</AddPlaceButton> and help the vegan community in {cityName}.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
