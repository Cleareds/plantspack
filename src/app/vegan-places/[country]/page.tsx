import { Metadata } from 'next'
import Link from 'next/link'
import { MapPin, ArrowRight } from 'lucide-react'

interface PageProps {
  params: Promise<{ country: string }>
}

function fromSlug(slug: string): string {
  return slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

async function getCities(country: string) {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://plantspack.com'
    const res = await fetch(`${baseUrl}/api/places/directory?level=cities&country=${country}&limit=300`, {
      next: { revalidate: 3600 },
    })
    if (!res.ok) return { cities: [], country: fromSlug(country) }
    return res.json()
  } catch {
    return { cities: [], country: fromSlug(country) }
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { country } = await params
  const { cities, country: countryName } = await getCities(country)
  const totalPlaces = cities.reduce((sum: number, c: any) => sum + c.count, 0)

  return {
    title: `Vegan Places in ${countryName} (${totalPlaces}) | PlantsPack`,
    description: `Find ${totalPlaces} vegan restaurants, stores, and stays in ${countryName}. Browse by city with ratings and reviews.`,
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
  const { cities, country: countryName } = await getCities(country)
  const totalPlaces = cities.reduce((sum: number, c: any) => sum + c.count, 0)

  return (
    <div className="min-h-screen bg-surface">
      <div className="max-w-5xl mx-auto px-4 py-12 md:py-16">
        {/* Breadcrumbs */}
        <nav className="flex items-center gap-2 text-sm text-on-surface-variant mb-8">
          <Link href="/" className="hover:text-primary transition-colors">Home</Link>
          <span className="text-outline">/</span>
          <Link href="/vegan-places" className="hover:text-primary transition-colors">Vegan Places</Link>
          <span className="text-outline">/</span>
          <span className="text-on-surface font-medium">{countryName}</span>
        </nav>

        {/* Header */}
        <div className="mb-12">
          <h1 className="font-headline font-extrabold text-3xl md:text-5xl text-on-surface tracking-tight mb-4">
            Vegan Places in <span className="text-primary">{countryName}</span>
          </h1>
          <p className="text-on-surface-variant text-lg">
            {totalPlaces > 0
              ? <>{totalPlaces.toLocaleString()} vegan restaurants, stores, and stays across {cities.length} {cities.length === 1 ? 'city' : 'cities'}.</>
              : <>Explore vegan-friendly places in {countryName}.</>
            }
          </p>
          <div className="flex gap-3 mt-4">
            <Link
              href={`/map`}
              className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
            >
              <MapPin className="h-4 w-4" />
              View on map
            </Link>
          </div>
        </div>

        {/* Cities Grid */}
        {cities.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {cities.map((city: any) => (
              <Link
                key={city.slug}
                href={`/vegan-places/${country}/${city.slug}`}
                className="group flex items-center justify-between p-5 bg-surface-container-lowest rounded-xl editorial-shadow ghost-border hover:border-primary/20 transition-all hover:-translate-y-0.5"
              >
                <div>
                  <h2 className="font-semibold text-on-surface group-hover:text-primary transition-colors">
                    {city.name}
                  </h2>
                  <p className="text-sm text-on-surface-variant mt-0.5">
                    {city.count.toLocaleString()} {city.count === 1 ? 'place' : 'places'}
                  </p>
                </div>
                <ArrowRight className="h-4 w-4 text-outline group-hover:text-primary transition-colors" />
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">🗺️</div>
            <h2 className="text-xl font-semibold text-on-surface mb-2">No places yet in {countryName}</h2>
            <p className="text-on-surface-variant mb-6">Be the first to add a vegan place!</p>
            <Link
              href="/map"
              className="inline-flex items-center gap-2 silk-gradient hover:opacity-90 text-on-primary-btn px-6 py-3 rounded-xl font-medium"
            >
              <MapPin className="h-5 w-5" />
              Add a place
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
