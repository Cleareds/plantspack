import { Metadata } from 'next'
import Link from 'next/link'
import { Globe } from 'lucide-react'
import AddPlaceButton from '@/components/places/AddPlaceButton'
import { generateCityDescription } from '@/lib/vegan-scene-descriptions'
import CityPlacesList from '@/components/places/CityPlacesList'

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
  // Single query — cache() deduplicates with page render
  const { places, city: cityName, country: countryName } = await fetchCityPlaces(country, city)

  const title = `Vegan Restaurants & Places in ${cityName}, ${countryName} (${places.length})`
  const description = `Discover ${places.length} vegan restaurants, stores, and stays in ${cityName}. Community-verified with ratings and reviews.`

  return {
    title: `${title} | PlantsPack`,
    description,
    alternates: { canonical: `https://plantspack.com/vegan-places/${country}/${city}` },
    openGraph: {
      title,
      description,
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
    const res = await fetch(`${baseUrl}/api/places/directory?level=places&country=${encodeURIComponent(country)}&city=${encodeURIComponent(city)}&limit=500`, { cache: 'no-store' })
    if (!res.ok) return { places: [], city: city.replace(/-/g, ' '), country: country.replace(/-/g, ' '), total: 0 }
    return res.json()
  } catch {
    return { places: [], city: city.replace(/-/g, ' '), country: country.replace(/-/g, ' '), total: 0 }
  }
}

export default async function CityPage({ params }: PageProps) {
  const { country, city } = await params
  const { places, city: cityName, country: countryName } = await fetchCityPlaces(country, city)

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
          <h1 className="font-headline font-extrabold text-3xl md:text-4xl text-on-surface tracking-tight mb-3">
            Vegan Places in <span className="text-primary">{cityName}</span>
          </h1>
          <p className="text-on-surface-variant text-base mb-3">
            {places.length > 0
              ? <>{places.length.toLocaleString()} vegan restaurants, stores, and stays in {cityName}, {countryName}.</>
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
          </div>
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
