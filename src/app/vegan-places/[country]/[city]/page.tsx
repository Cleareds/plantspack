import { Metadata } from 'next'
import Link from 'next/link'
import { MapPin, Star, PawPrint, Globe, ExternalLink } from 'lucide-react'
import CityMap from '@/components/places/CityMap'
import { generateCityDescription } from '@/lib/vegan-scene-descriptions'
import { getCityPlaces } from '@/lib/directory-queries'

export const revalidate = 3600

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
  latitude: number
  longitude: number
  vegan_level: string | null
  cuisine_types: string[]
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { country, city } = await params
  // Single query — cache() deduplicates with page render
  const { places, city: cityName, country: countryName } = await getCityPlaces(country, city)

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

const CATEGORY_LABELS: Record<string, string> = {
  eat: 'Eat',
  hotel: 'Stay',
  store: 'Store',
  event: 'Event',
  organisation: 'Organisation',
  other: 'Other',
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

export default async function CityPage({ params }: PageProps) {
  const { country, city } = await params
  // Single query — cache() deduplicates with generateMetadata
  const { places, city: cityName, country: countryName } = await getCityPlaces(country, city)

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
        {/* Breadcrumbs */}
        <nav className="flex items-center gap-2 text-sm text-on-surface-variant mb-6">
          <Link href="/" className="hover:text-primary transition-colors">Home</Link>
          <span className="text-outline">/</span>
          <Link href="/vegan-places" className="hover:text-primary transition-colors">Vegan Places</Link>
          <span className="text-outline">/</span>
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
            <p className="text-on-surface-variant text-sm leading-relaxed max-w-3xl">{sceneDescription}</p>
          )}
          <div className="flex flex-wrap gap-3">
            <Link
              href={`/map?location=${encodeURIComponent(cityName + ', ' + countryName)}`}
              className="inline-flex items-center gap-2 text-sm font-medium silk-gradient text-on-primary-btn px-4 py-2 rounded-lg transition-colors hover:opacity-90"
            >
              <Globe className="h-4 w-4" />
              View on map
            </Link>
            <Link
              href={`/map?location=${encodeURIComponent(cityName + ', ' + countryName)}`}
              className="inline-flex items-center gap-2 text-sm font-medium text-on-surface-variant ghost-border px-4 py-2 rounded-lg transition-colors hover:bg-surface-container-low"
            >
              <MapPin className="h-4 w-4" />
              Add a place in {cityName}
            </Link>
          </div>
        </div>

        {/* Category filter pills */}
        {categories.length > 1 && (
          <div className="flex flex-wrap gap-2 mb-8">
            <span className="px-3 py-1.5 bg-primary text-on-primary-btn rounded-full text-sm font-medium">
              All ({places.length})
            </span>
            {categories.map((cat: string) => {
              const count = places.filter((p: Place) => p.category === cat).length
              return (
                <span key={cat} className="px-3 py-1.5 bg-surface-container-low text-on-surface-variant rounded-full text-sm font-medium">
                  {CATEGORY_LABELS[cat] || cat} ({count})
                </span>
              )
            })}
          </div>
        )}

        {/* Map + List Layout */}
        {places.length > 0 ? (
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Places List */}
            <div className="flex-1 space-y-4 min-w-0">
              {places.map((place: Place) => {
                const thumbnail = place.main_image_url || place.images?.[0]
                return (
                  <Link
                    key={place.id}
                    href={`/place/${place.slug || place.id}`}
                    className="group flex gap-4 p-4 bg-surface-container-lowest rounded-xl editorial-shadow ghost-border hover:border-primary/20 transition-all hover:-translate-y-0.5"
                  >
                    {/* Thumbnail */}
                    {thumbnail ? (
                      <img
                        src={thumbnail}
                        alt={place.name}
                        className="w-20 h-20 md:w-28 md:h-20 rounded-lg object-cover flex-shrink-0"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-20 h-20 md:w-28 md:h-20 rounded-lg bg-surface-container-low flex items-center justify-center flex-shrink-0">
                        <MapPin className="h-6 w-6 text-outline" />
                      </div>
                    )}

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h2 className="font-semibold text-on-surface text-sm group-hover:text-primary transition-colors line-clamp-1">
                          {place.name}
                        </h2>
                        {place.website && (
                          <ExternalLink className="h-3.5 w-3.5 text-outline flex-shrink-0 mt-0.5" />
                        )}
                      </div>

                      <div className="flex items-center flex-wrap gap-1.5 mt-1">
                        <span className="bg-secondary-container text-on-surface px-1.5 py-0.5 rounded text-xs capitalize font-medium">
                          {CATEGORY_LABELS[place.category] || place.category}
                        </span>
                        {place.is_pet_friendly && (
                          <span className="bg-orange-100 text-orange-800 px-1.5 py-0.5 rounded text-xs flex items-center gap-0.5">
                            <PawPrint className="h-3 w-3" />
                            Pets
                          </span>
                        )}
                        {place.average_rating > 0 && (
                          <span className="flex items-center gap-0.5 text-xs text-on-surface-variant">
                            <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                            {place.average_rating.toFixed(1)}
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-on-surface-variant mt-1 line-clamp-1">{place.address}</p>
                    </div>
                  </Link>
                )
              })}
            </div>

            {/* Sticky Map */}
            <div className="lg:w-[400px] flex-shrink-0">
              <div className="lg:sticky lg:top-24">
                <CityMap
                  places={places.map((p: Place) => ({ id: p.id, name: p.name, latitude: p.latitude, longitude: p.longitude, category: p.category }))}
                  className="h-[300px] lg:h-[calc(100vh-8rem)]"
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">🌱</div>
            <h2 className="text-xl font-semibold text-on-surface mb-2">No places yet in {cityName}</h2>
            <p className="text-on-surface-variant mb-6">
              Know a vegan restaurant or store in {cityName}? Be the first to add it!
            </p>
            <Link
              href="/map"
              className="inline-flex items-center gap-2 silk-gradient hover:opacity-90 text-on-primary-btn px-6 py-3 rounded-xl font-medium"
            >
              <MapPin className="h-5 w-5" />
              Add a place
            </Link>
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
              Missing a place? <Link href="/map" className="text-primary hover:underline font-semibold">Add it to the map</Link> and help the vegan community in {cityName}.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
