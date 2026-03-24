import { Metadata } from 'next'
import Link from 'next/link'
import { MapPin, Globe, ArrowRight } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Vegan Places Directory - Find Vegan Restaurants & Stores | PlantsPack',
  description: 'Discover vegan restaurants, stores, and places worldwide. Community-verified directory with ratings, reviews, and detailed information.',
  alternates: { canonical: 'https://plantspack.com/vegan-places' },
  openGraph: {
    title: 'Vegan Places Directory | PlantsPack',
    description: 'Find vegan-friendly restaurants, stores, and stays. Community-driven, free forever.',
    type: 'website',
    siteName: 'PlantsPack',
  },
}

async function getCountries() {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://plantspack.com'
    const res = await fetch(`${baseUrl}/api/places/directory?level=countries`, {
      next: { revalidate: 3600 },
    })
    if (!res.ok) return { countries: [], total: 0 }
    return res.json()
  } catch {
    return { countries: [], total: 0 }
  }
}

export default async function VeganPlacesPage() {
  const { countries, total } = await getCountries()

  return (
    <div className="min-h-screen bg-surface">
      <div className="max-w-5xl mx-auto px-4 py-8 md:py-12">
        {/* Hero */}
        <div className="text-center mb-8">
          <h1 className="font-headline font-extrabold text-3xl md:text-4xl text-on-surface tracking-tight leading-[1.1] mb-3">
            Find Vegan Places in <span className="text-primary">Europe</span>
          </h1>
          <p className="text-on-surface-variant text-base md:text-lg leading-relaxed max-w-2xl mx-auto mb-3">
            {total > 0
              ? <><strong className="text-on-surface">{total.toLocaleString()}</strong> community-verified vegan restaurants, stores, and stays across {countries.length} countries.</>
              : <>Community-verified vegan restaurants, stores, and stays.</>
            }
          </p>
          <div className="flex flex-wrap justify-center gap-3 mt-4">
            <Link
              href="/map"
              className="inline-flex items-center gap-2 silk-gradient hover:opacity-90 text-on-primary-btn px-5 py-2.5 rounded-xl text-sm font-medium transition-colors"
            >
              <Globe className="h-4 w-4" />
              Explore Map
            </Link>
            <Link
              href="/map"
              className="inline-flex items-center gap-2 ghost-border hover:bg-surface-container-low text-on-surface px-5 py-2.5 rounded-xl text-sm font-medium transition-colors"
            >
              <MapPin className="h-4 w-4" />
              Add a Place
            </Link>
          </div>
        </div>

        {/* Countries Grid */}
        {countries.length > 0 ? (
          <div>
            <h2 className="text-2xl font-bold text-on-surface mb-6">Browse by Country</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {countries.map((country: any) => (
                <Link
                  key={country.slug}
                  href={`/vegan-places/${country.slug}`}
                  className="group flex items-center justify-between p-5 bg-surface-container-lowest rounded-xl editorial-shadow ghost-border hover:border-primary/20 transition-all hover:-translate-y-0.5"
                >
                  <div>
                    <h3 className="font-semibold text-on-surface group-hover:text-primary transition-colors">
                      {country.name}
                    </h3>
                    <p className="text-sm text-on-surface-variant mt-0.5">
                      {country.count.toLocaleString()} {country.count === 1 ? 'place' : 'places'}
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-outline group-hover:text-primary transition-colors" />
                </Link>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">🗺️</div>
            <h2 className="text-xl font-semibold text-on-surface mb-2">Places are being added</h2>
            <p className="text-on-surface-variant mb-6 max-w-md mx-auto">
              We&apos;re importing and verifying thousands of vegan places across Europe. Check back soon or help by adding places to the map.
            </p>
            <Link
              href="/map"
              className="inline-flex items-center gap-2 silk-gradient hover:opacity-90 text-on-primary-btn px-6 py-3 rounded-xl font-medium"
            >
              <MapPin className="h-5 w-5" />
              Add the first place
            </Link>
          </div>
        )}

        {/* Expansion Note */}
        <div className="mt-10 text-center">
          <p className="text-sm text-on-surface-variant">
            Currently focused on Europe. Expanding to other continents soon.{' '}
            <Link href="/contact" className="text-primary hover:underline">Want your region?</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
