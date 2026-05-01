import { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { Globe } from 'lucide-react'
import { getRegion, getRegionCityStats, getRegionPlaces, getRegionsForCountry } from '@/lib/regions'
import { getCities } from '@/lib/directory-queries'
import CityPlacesList from '@/components/places/CityPlacesList'
import { buildBreadcrumbs, HOME_CRUMB } from '@/lib/schema/breadcrumbs'

// Country redirects mirror the city/country page so an old link to e.g.
// /vegan-places/italia/region/<r> still resolves to /italy/region/<r>.
const COUNTRY_REDIRECTS: Record<string, string> = {
  'macedonia': 'north-macedonia',
  'italia': 'italy',
  'czechia': 'czech-republic',
  'ivory-coast': 'cote-d-ivoire',
  'laramie': 'united-states',
  'marktheidenfeld-altfeld': 'germany',
}

export const revalidate = 3600

interface PageProps {
  params: Promise<{ country: string; region: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { country, region } = await params
  const r = await getRegion(country, region)
  if (!r) return { title: 'Region not found | PlantsPack' }
  // Use the directory_countries display name via getCities (deduped through cache())
  const { country: countryName } = await getCities(country)
  return {
    title: `Vegan Places in ${r.region_name}, ${countryName} | PlantsPack`,
    description: r.description ?? `Vegan and vegan-friendly places across ${r.region_name}, ${countryName}.`,
    alternates: { canonical: `https://plantspack.com/vegan-places/${country}/region/${region}` },
    robots: { index: true, follow: true },
    openGraph: {
      title: `Vegan Places in ${r.region_name}`,
      description: r.description ?? '',
      type: 'website',
      siteName: 'PlantsPack',
      url: `https://plantspack.com/vegan-places/${country}/region/${region}`,
    },
  }
}

export default async function RegionPage({ params }: PageProps) {
  const { country, region } = await params
  if (COUNTRY_REDIRECTS[country]) redirect(`/vegan-places/${COUNTRY_REDIRECTS[country]}/region/${region}`)

  const r = await getRegion(country, region)
  if (!r) notFound()

  const { country: countryName } = await getCities(country)
  const [cityStats, places] = await Promise.all([
    getRegionCityStats(r, countryName),
    getRegionPlaces(r, countryName),
  ])

  const totalPlaces = places.length
  const fullyVegan = places.filter((p: any) => p.vegan_level === 'fully_vegan').length

  return (
    <div className="min-h-screen bg-surface">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            buildBreadcrumbs([
              HOME_CRUMB,
              { name: 'Vegan Places', url: 'https://plantspack.com/vegan-places' },
              { name: countryName, url: `https://plantspack.com/vegan-places/${country}` },
              { name: r.region_name, url: `https://plantspack.com/vegan-places/${country}/region/${region}` },
            ]),
          ),
        }}
      />
      <div className="max-w-5xl mx-auto px-4 py-8 md:py-12">
        <nav className="flex items-center gap-2 text-sm text-on-surface-variant mb-6">
          <Link href="/" className="hidden md:inline hover:text-primary transition-colors">Home</Link>
          <span className="hidden md:inline text-outline">/</span>
          <Link href="/vegan-places" className="hidden md:inline hover:text-primary transition-colors">Vegan Places</Link>
          <span className="hidden md:inline text-outline">/</span>
          <Link href={`/vegan-places/${country}`} className="hover:text-primary transition-colors">{countryName}</Link>
          <span className="text-outline">/</span>
          <span className="text-on-surface font-medium">{r.region_name}</span>
        </nav>

        <div className="mb-8">
          <h1 className="font-headline font-extrabold text-3xl md:text-4xl text-on-surface tracking-tight mb-3">
            Vegan Places in <span className="text-primary">{r.region_name}</span>
          </h1>
          <p className="text-on-surface-variant text-base mb-3">
            <strong>{totalPlaces}</strong> vegan and vegan-friendly places
            {fullyVegan > 0 ? <> ({fullyVegan} fully vegan)</> : null}
            {' '}across <strong>{cityStats.length}</strong> {cityStats.length === 1 ? 'city' : 'cities'} in {r.region_name}, {countryName}.
          </p>
          {r.description && (
            <p className="text-on-surface-variant text-sm leading-relaxed max-w-3xl">{r.description}</p>
          )}
          <div className="flex gap-3 mt-4">
            <Link href={`/map?location=${encodeURIComponent(r.region_name + ', ' + countryName)}`}
              className="inline-flex items-center gap-2 text-sm font-medium silk-gradient text-on-primary-btn px-4 py-2 rounded-lg transition-colors hover:opacity-90">
              <Globe className="h-4 w-4" /> View on map
            </Link>
          </div>
        </div>

        {cityStats.length > 0 && (
          <div className="mb-10">
            <h2 className="text-lg font-semibold text-on-surface mb-4">Cities in {r.region_name}</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {cityStats.map(c => (
                <Link
                  key={c.city_slug}
                  href={`/vegan-places/${country}/${c.city_slug}`}
                  className="bg-surface-container-lowest ghost-border rounded-lg p-3 hover:border-primary/30 transition-colors"
                >
                  <div className="font-medium text-on-surface text-sm">{c.city}</div>
                  <div className="text-xs text-on-surface-variant mt-0.5">
                    {c.place_count} {c.place_count === 1 ? 'place' : 'places'}
                    {c.fully_vegan_count > 0 ? <> · {c.fully_vegan_count} fully vegan</> : null}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {places.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-on-surface mb-4">All places in {r.region_name}</h2>
            <CityPlacesList places={places as any} cityName={r.region_name} countryName={countryName} />
          </div>
        )}

        {places.length === 0 && (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">🌱</div>
            <h2 className="text-xl font-semibold text-on-surface mb-2">No places yet in {r.region_name}</h2>
            <p className="text-on-surface-variant">Help us cover this region — add a place!</p>
          </div>
        )}
      </div>
    </div>
  )
}

// Pre-build region pages at deploy time so the first visit is fast.
export async function generateStaticParams() {
  // We only have Belgium seeded today. Kept generic so it picks up future
  // countries automatically.
  const sb = (await import('@/lib/supabase-admin')).createAdminClient()
  const { data } = await sb.from('country_regions').select('country_slug, region_slug')
  return (data || []).map((r: any) => ({ country: r.country_slug, region: r.region_slug }))
}
