import Link from 'next/link'
import { CountryRegion } from '@/lib/regions'
import { slugifyCityOrCountry } from '@/lib/places/slugify'

interface RegionCard {
  region: CountryRegion
  totalPlaces: number
  fullyVegan: number
  topCities: { city: string; city_slug: string; place_count: number }[]
}

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
        {regions.map(({ region, totalPlaces, fullyVegan, topCities }) => (
          <div
            key={region.region_slug}
            className="bg-surface-container-lowest ghost-border rounded-xl p-5 hover:border-primary/30 transition-colors flex flex-col"
          >
            <Link
              href={`/vegan-places/${countrySlug}/region/${region.region_slug}`}
              className="block"
            >
              <h3 className="font-semibold text-on-surface text-base group-hover:text-primary mb-1">
                {region.region_name}
              </h3>
              <p className="text-xs text-on-surface-variant mb-3">
                <strong>{totalPlaces}</strong> {totalPlaces === 1 ? 'place' : 'places'}
                {fullyVegan > 0 ? <> · <strong>{fullyVegan}</strong> fully vegan</> : null}
              </p>
            </Link>
            {topCities.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-3">
                {topCities.slice(0, 6).map(c => (
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
            <Link
              href={`/vegan-places/${countrySlug}/region/${region.region_slug}`}
              className="text-xs font-medium text-primary hover:underline mt-auto"
            >
              View all of {region.region_name} →
            </Link>
          </div>
        ))}
      </div>
    </div>
  )
}

export type { RegionCard }
export { slugifyCityOrCountry }
