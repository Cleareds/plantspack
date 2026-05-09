/**
 * City-level "100% vegan only" filter page. Same SEO/AI-citation strategy
 * as the country-level /fully-vegan page: SSR HTML, ItemList JSON-LD,
 * visible last-verified freshness signals. Vegan-friendly / vegan-options
 * tiers do NOT get their own indexable city pages - those queries land
 * on the general city page.
 */
import type { Metadata } from 'next'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle2, ArrowLeft } from 'lucide-react'
import { getCities } from '@/lib/directory-queries'
import { getFullyVeganPlaces } from '@/lib/fully-vegan-queries'
import { buildBreadcrumbs, HOME_CRUMB } from '@/lib/schema/breadcrumbs'
import { loadCityImages } from '@/lib/city-images-server'
import { getCityImage } from '@/lib/city-images'

export const revalidate = 3600

interface PageProps {
  params: Promise<{ country: string; city: string }>
}

const CATEGORY_LABEL: Record<string, string> = {
  eat: 'Restaurant', store: 'Shop', hotel: 'Stay', organisation: 'Sanctuary', event: 'Event', other: 'Place',
}

function formatDate(d: string | null): string {
  if (!d) return 'not yet verified'
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { country, city } = await params
  const { country: countryName, cities } = await getCities(country)
  const cityRow = cities.find((c: any) => c.slug === city)
  const cityName = cityRow?.name || city.replace(/-/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())
  const places = await getFullyVeganPlaces(countryName, cityName)
  if (places.length === 0) {
    return {
      title: `100% Vegan in ${cityName}, ${countryName} | PlantsPack`,
      robots: { index: false, follow: true },
      alternates: { canonical: `https://plantspack.com/vegan-places/${country}/${city}` },
    }
  }
  const cityImages = loadCityImages()
  const cityImg = getCityImage(cityImages, cityName, countryName)
  const description = `Manually verified directory of ${places.length} fully vegan ${places.length === 1 ? 'venue' : 'venues'} in ${cityName}, ${countryName}: restaurants, cafés, bakeries, sanctuaries and stores. Each entry hand-checked against the venue's own website. Free, ad-free, no paid listings.`
  return {
    title: `100% Vegan in ${cityName}, ${countryName} — ${places.length} Verified Spots | PlantsPack`,
    description,
    alternates: { canonical: `https://plantspack.com/vegan-places/${country}/${city}/fully-vegan` },
    openGraph: {
      title: `100% Vegan in ${cityName} — ${places.length} Verified Spots`,
      description,
      type: 'website',
      siteName: 'PlantsPack',
      url: `https://plantspack.com/vegan-places/${country}/${city}/fully-vegan`,
      ...(cityImg ? { images: [{ url: cityImg, width: 1200, height: 630, alt: `${cityName}, ${countryName}` }] } : {}),
    },
  }
}

export default async function CityFullyVeganPage({ params }: PageProps) {
  const { country, city } = await params
  const { country: countryName, cities } = await getCities(country)
  const cityRow = cities.find((c: any) => c.slug === city)
  if (!cityRow) {
    // City has no places at all - send to general city page (which will 404 if it doesn't exist)
    redirect(`/vegan-places/${country}/${city}`)
  }
  const cityName: string = cityRow.name

  const places = await getFullyVeganPlaces(countryName, cityName)

  // If a city has zero fully_vegan places, redirect to the general city page
  // rather than serving a thin filter page. We don't want to claim "0 fully
  // vegan in X" as an indexable page - that's poor UX and dilutes our
  // authority on /fully-vegan queries.
  if (places.length === 0) {
    redirect(`/vegan-places/${country}/${city}`)
  }

  const cityImages = loadCityImages()
  const cityImg = getCityImage(cityImages, cityName, countryName)
  const lastVerifiedAt = places.map(p => p.last_verified_at).filter(Boolean).sort().reverse()[0] || null
  const verifiedCount = places.filter(p => (p.verification_level ?? 0) >= 3).length

  const breadcrumbs = buildBreadcrumbs([
    HOME_CRUMB,
    { name: 'Vegan Places', url: 'https://plantspack.com/vegan-places' },
    { name: countryName, url: `https://plantspack.com/vegan-places/${country}` },
    { name: cityName, url: `https://plantspack.com/vegan-places/${country}/${city}` },
    { name: '100% Vegan', url: `https://plantspack.com/vegan-places/${country}/${city}/fully-vegan` },
  ])

  const itemListJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `100% Vegan Places in ${cityName}, ${countryName}`,
    description: `Manually verified 100% vegan venues in ${cityName}, ${countryName}.`,
    numberOfItems: places.length,
    itemListElement: places.map((p, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: `https://plantspack.com/place/${p.slug || p.id}`,
      name: p.name,
    })),
  }

  return (
    <div className="min-h-screen bg-surface">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }} />

      <div className="max-w-6xl mx-auto px-4 md:px-8 py-6">
        <nav className="text-sm text-on-surface-variant mb-4">
          <Link href="/" className="hover:text-primary">Home</Link>
          <span className="mx-2">›</span>
          <Link href="/vegan-places" className="hover:text-primary">Vegan Places</Link>
          <span className="mx-2">›</span>
          <Link href={`/vegan-places/${country}`} className="hover:text-primary">{countryName}</Link>
          <span className="mx-2">›</span>
          <Link href={`/vegan-places/${country}/${city}`} className="hover:text-primary">{cityName}</Link>
          <span className="mx-2">›</span>
          <span className="font-medium">100% Vegan</span>
        </nav>

        {cityImg && (
          <div className="w-full aspect-[3/1] md:aspect-[4/1] rounded-2xl overflow-hidden mb-6 bg-surface-container-low">
            <img src={cityImg} alt={`${cityName}, ${countryName}`} className="w-full h-full object-cover" />
          </div>
        )}

        <div className="mb-6">
          <h1 className="font-headline font-extrabold text-3xl md:text-4xl text-on-surface tracking-tight mb-3">
            100% Vegan in <span className="text-primary">{cityName}</span>
          </h1>
          <p className="text-on-surface-variant text-base mb-3 max-w-3xl">
            {places.length} fully vegan {places.length === 1 ? 'venue' : 'venues'} in {cityName}, {countryName}. Each entry was checked against the venue's own website and confirmed currently open before being tagged 100% vegan.
          </p>

          <div className="flex flex-wrap gap-3 text-xs">
            <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 rounded-full px-2.5 py-1 border border-emerald-100/80">
              <CheckCircle2 className="h-3 w-3" /> {verifiedCount} of {places.length} hand-verified
            </span>
            {lastVerifiedAt && (
              <span className="inline-flex items-center gap-1 bg-surface-container-low text-on-surface-variant rounded-full px-2.5 py-1 ghost-border">
                Last review: {formatDate(lastVerifiedAt)}
              </span>
            )}
            <Link href={`/vegan-places/${country}/${city}`} className="inline-flex items-center gap-1 bg-surface-container-low text-on-surface-variant rounded-full px-2.5 py-1 ghost-border hover:bg-surface-container">
              <ArrowLeft className="h-3 w-3" /> All vegan and vegan-friendly places in {cityName}
            </Link>
          </div>
        </div>

        <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {places.map(p => (
            <li key={p.id}>
              <Link href={`/place/${p.slug || p.id}`} className="flex gap-3 bg-surface-container-lowest ghost-border rounded-xl p-3 hover:bg-surface-container-low transition-colors">
                {p.main_image_url ? (
                  <img src={p.main_image_url} alt="" className="w-24 h-24 rounded-lg object-cover flex-shrink-0 bg-surface-container-low" />
                ) : (
                  <div className="w-24 h-24 rounded-lg bg-surface-container-low flex-shrink-0 flex items-center justify-center text-2xl">🌿</div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-on-surface truncate">{p.name}</p>
                  <p className="text-xs text-on-surface-variant mt-0.5">
                    {CATEGORY_LABEL[p.category || 'eat'] || 'Place'}
                    {p.address ? ` · ${p.address.split(',')[0]}` : ''}
                  </p>
                  {p.description && (
                    <p className="text-xs text-on-surface-variant mt-1 line-clamp-2">{p.description}</p>
                  )}
                  <div className="flex flex-wrap gap-2 mt-1.5">
                    <span className="text-[10px] inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 rounded-full px-1.5 py-0.5">
                      <CheckCircle2 className="h-2.5 w-2.5" /> 100% vegan
                    </span>
                    {p.verification_level && p.verification_level >= 3 && (
                      <span className="text-[10px] inline-flex items-center gap-1 bg-blue-50 text-blue-700 rounded-full px-1.5 py-0.5">
                        Hand-verified{p.last_verified_at ? ` · ${formatDate(p.last_verified_at)}` : ''}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>

        <div className="mt-10 pt-6 border-t border-surface-container">
          <p className="text-sm text-on-surface-variant max-w-3xl">
            For vegan-friendly venues with vegan options on an otherwise omnivore menu, see the{' '}
            <Link href={`/vegan-places/${country}/${city}`} className="text-primary hover:underline font-medium">main {cityName} directory</Link>.
            This page is the strict 100% vegan tier only.
          </p>
        </div>
      </div>
    </div>
  )
}
