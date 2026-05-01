import Link from 'next/link'
import { CountryRegion } from '@/lib/regions'
import { slugifyCityOrCountry } from '@/lib/places/slugify'

interface RegionCard {
  region: CountryRegion
  totalPlaces: number
  fullyVegan: number
  // Auto-picked thumbnail: top-place-count city in the region that has an
  // image on disk. Null if none of the region's cities are illustrated.
  heroImage: string | null
  // All cities in the region with data, sorted by place_count desc.
  // Component renders top 8 inline + the rest inside a <details> expander
  // so every city link stays crawlable while the default UI stays clean.
  cities: { city: string; city_slug: string; place_count: number }[]
}

const VISIBLE_CITY_COUNT = 8

/**
 * "Browse by region" block on the country page. Groups cities by region
 * and lists each region with its top cities. Cities not assigned to any
 * region appear in the country page's existing cities grid below.
 */
export default function CountryRegionsSection({
  countrySlug,
  countryName,
  regions,
}: {
  countrySlug: string
  countryName: string
  regions: RegionCard[]
}) {
  if (regions.length === 0) return null
  return (
    <div className="mb-10">
      <h2 className="text-lg font-semibold text-on-surface mb-4">Browse {countryName} by region</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {regions.map(({ region, totalPlaces, fullyVegan, cities, heroImage }) => {
          const visibleCities = cities.slice(0, VISIBLE_CITY_COUNT)
          const hiddenCities = cities.slice(VISIBLE_CITY_COUNT)
          return (
            <div
              key={region.region_slug}
              className="bg-surface-container-lowest ghost-border rounded-xl overflow-hidden hover:border-primary/30 transition-colors flex flex-col"
            >
              <Link
                href={`/vegan-places/${countrySlug}/region/${region.region_slug}`}
                className="block group"
              >
                {heroImage ? (
                  <div className="relative h-32 overflow-hidden">
                    <img
                      src={heroImage}
                      alt={region.region_name}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />
                    <h3 className="absolute bottom-2 left-3 right-3 font-semibold text-white text-base drop-shadow-md">
                      {region.region_name}
                    </h3>
                  </div>
                ) : (
                  <div className="px-5 pt-5 pb-1">
                    <h3 className="font-semibold text-on-surface text-base group-hover:text-primary">
                      {region.region_name}
                    </h3>
                  </div>
                )}
              </Link>
              <div className="px-5 pt-3 pb-5 flex flex-col flex-1">
                <p className="text-xs text-on-surface-variant mb-3">
                  <strong>{totalPlaces}</strong> {totalPlaces === 1 ? 'place' : 'places'}
                  {fullyVegan > 0 ? <> · <strong>{fullyVegan}</strong> fully vegan</> : null}
                  {' '}· {cities.length} {cities.length === 1 ? 'city' : 'cities'}
                </p>
              {visibleCities.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {visibleCities.map(c => (
                    <Link
                      key={c.city_slug}
                      href={`/vegan-places/${countrySlug}/${c.city_slug}`}
                      className="text-xs px-2 py-1 rounded-md bg-surface-container-low text-on-surface-variant hover:bg-surface-container hover:text-primary transition-colors"
                    >
                      {c.city} <span className="opacity-60">({c.place_count})</span>
                    </Link>
                  ))}
                </div>
              )}
              {hiddenCities.length > 0 && (
                /* <details> keeps the hidden city links in the static HTML so
                   Google still crawls them; only the default UI is collapsed.
                   Using `group` to flip the chevron on open. */
                <details className="group mb-2">
                  <summary className="text-xs font-medium text-on-surface-variant cursor-pointer hover:text-primary transition-colors list-none flex items-center gap-1 select-none">
                    <span className="inline-block transition-transform group-open:rotate-90">›</span>
                    <span>+ {hiddenCities.length} more {hiddenCities.length === 1 ? 'city' : 'cities'}</span>
                  </summary>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {hiddenCities.map(c => (
                      <Link
                        key={c.city_slug}
                        href={`/vegan-places/${countrySlug}/${c.city_slug}`}
                        className="text-xs px-2 py-1 rounded-md bg-surface-container-low text-on-surface-variant hover:bg-surface-container hover:text-primary transition-colors"
                      >
                        {c.city} <span className="opacity-60">({c.place_count})</span>
                      </Link>
                    ))}
                  </div>
                </details>
              )}
              <Link
                href={`/vegan-places/${countrySlug}/region/${region.region_slug}`}
                className="text-xs font-medium text-primary hover:underline mt-auto"
              >
                View all of {region.region_name} →
              </Link>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export type { RegionCard }
export { slugifyCityOrCountry }
