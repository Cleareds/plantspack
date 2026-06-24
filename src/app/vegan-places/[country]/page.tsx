import { Metadata } from 'next'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Globe, BookOpen, UtensilsCrossed, Printer } from 'lucide-react'

// Country-name aliases for slugs that should redirect to the canonical name.
// Add entries here when a country renames or when we consolidate variants.
const COUNTRY_REDIRECTS: Record<string, string> = {
  'macedonia': 'north-macedonia',
  'italia': 'italy',
  'czechia': 'czech-republic',
  'ivory-coast': 'cote-d-ivoire',
  'laramie': 'united-states',
  'marktheidenfeld-altfeld': 'germany',
}
import { generateCountryDescription, generateCountryMetaDescription } from '@/lib/vegan-scene-descriptions'
import { getCities } from '@/lib/directory-queries'
import { getRegionsForCountry } from '@/lib/regions'
import { getCountryAuditPost } from '@/lib/country-audit-post'
import { hasTravelGuide } from '@/lib/vegan-content'
import { loadCityImages } from '@/lib/city-images-server'
import { getCityImage } from '@/lib/city-images'
import { getGradeColor } from '@/lib/score-utils'
import { FilteredTotal, FilteredLabel, FullyVeganNote } from '@/components/ui/FilteredCount'
import CityPlacesList from '@/components/places/CityPlacesList'
import CountryCityGrid from '@/components/places/CountryCityGrid'
import CountryRegionsSection, { RegionCard } from '@/components/places/CountryRegionsSection'
import { buildBreadcrumbs, HOME_CRUMB } from '@/lib/schema/breadcrumbs'

export const revalidate = 3600

interface PageProps {
  params: Promise<{ country: string }>
  searchParams?: Promise<{ level?: string }>
}

async function getCityScores(): Promise<any[]> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.plantspack.com'
    const res = await fetch(`${baseUrl}/api/scores`, { next: { revalidate: 3600 } })
    if (!res.ok) return []
    const data = await res.json()
    return data.scores || []
  } catch { return [] }
}

async function fetchCountryPlaces(country: string) {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.plantspack.com'
    // 3000 covers every country in our DB except the US — keeps "All N places
    // in <country>" honest. Paid Vercel/Supabase tiers absorb the bigger SSR
    // payload; the bottleneck is render, and CityPlacesList paginates client-
    // side at 30 per page so the DOM stays light.
    const res = await fetch(`${baseUrl}/api/places/directory?level=places&country=${encodeURIComponent(country)}&limit=3000`, { next: { revalidate: 3600 } })
    if (!res.ok) return { places: [], country: country.replace(/-/g, ' '), total: 0 }
    return res.json()
  } catch { return { places: [], country: country.replace(/-/g, ' '), total: 0 } }
}

export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
  const { country } = await params
  const { level } = (await searchParams) || {}
  const isFullyVeganMode = level === 'fully-vegan'
  if (COUNTRY_REDIRECTS[country]) redirect(`/vegan-places/${COUNTRY_REDIRECTS[country]}${isFullyVeganMode ? '/fully-vegan' : ''}`)
  const { cities, country: countryName } = await getCities(country)
  const totalPlaces = cities.reduce((sum: number, c: any) => sum + c.count, 0)
  const totalFv = cities.reduce((sum: number, c: any) => sum + (c.stats?.fullyVegan || 0), 0)
  const totalEat = cities.reduce((sum: number, c: any) => sum + (c.stats?.categories?.eat || 0), 0)
  const totalStore = cities.reduce((sum: number, c: any) => sum + (c.stats?.categories?.store || 0), 0)
  const totalHotel = cities.reduce((sum: number, c: any) => sum + (c.stats?.categories?.hotel || 0), 0)
  // Sanctuary/organisation count is not in directory_cities MV, so derive
  // from total - the three known categories. Ok approximation for meta tag.
  const totalSanctuary = Math.max(0, totalPlaces - totalEat - totalStore - totalHotel)
  const totalPet = cities.reduce((sum: number, c: any) => sum + (c.stats?.petFriendly || 0), 0)
  const cuisineSet = new Set<string>()
  const sampleSet = new Set<string>()
  for (const c of cities) {
    ;(c.stats?.cuisines || []).forEach((x: string) => cuisineSet.add(x))
    ;(c.stats?.sampleNames || []).forEach((x: string) => sampleSet.add(x))
  }

  const metaDesc = generateCountryMetaDescription(countryName, {
    total: totalPlaces,
    categories: { eat: totalEat, store: totalStore, hotel: totalHotel, organisation: totalSanctuary },
    cuisines: Array.from(cuisineSet).slice(0, 6),
    sampleNames: Array.from(sampleSet).slice(0, 6),
    fullyVegan: totalFv,
    petFriendly: totalPet,
    cityCount: cities.length,
  })

  // Title term swap (2026-06-15 GSC fix): when restaurants dominate the
  // country's inventory we lead with "Vegan Restaurants in X" so the title
  // matches "vegan restaurants" search intent (Iraq/Duhok ranked #4 with 0
  // clicks for this query before this fix). Honest fallback to "Places"
  // when restaurants are <60% (e.g. sanctuary-heavy regions) or the country
  // has fewer than 5 places total. We can't recompute FV-mode eat share
  // here without re-running the per-city query, so FV-mode keeps the
  // existing wording for now.
  const eatShare = totalPlaces > 0 ? totalEat / totalPlaces : 0
  const eatDominant = totalPlaces >= 5 && eatShare >= 0.6
  const placeTerm = eatDominant ? 'Restaurants' : 'Places'

  const title = isFullyVeganMode
    ? `100% Vegan in ${countryName} — ${totalFv} Hand-Verified Spots | PlantsPack`
    : cities.length > 1
      ? `Vegan ${placeTerm} in ${countryName} — ${totalPlaces} Spots Across ${cities.length} Cities | PlantsPack`
      : `Vegan ${placeTerm} in ${countryName} — ${totalPlaces} Verified Spots | PlantsPack`

  const fvDesc = `Manually verified directory of ${totalFv} fully vegan ${totalFv === 1 ? 'venue' : 'venues'} in ${countryName}: restaurants, cafés, bakeries, sanctuaries and stores. Each entry hand-checked against the venue's own website. Free, ad-free, no paid listings.`

  const canonical = isFullyVeganMode
    ? `https://www.plantspack.com/vegan-places/${country}/fully-vegan`
    : `https://www.plantspack.com/vegan-places/${country}`

  return {
    title,
    description: isFullyVeganMode ? fvDesc : metaDesc,
    alternates: { canonical },
    openGraph: {
      title: isFullyVeganMode ? `100% Vegan in ${countryName}` : `Vegan ${placeTerm} in ${countryName}`,
      description: isFullyVeganMode ? fvDesc : metaDesc,
      type: 'website',
      siteName: 'PlantsPack',
      url: canonical,
    },
  }
}

export default async function CountryPage({ params, searchParams }: PageProps) {
  const { country } = await params
  const sp = (await searchParams) || {}
  const level = sp.level
  const vl = (sp as any).vl as string | undefined
  const isFullyVeganMode = level === 'fully-vegan'

  // URL conflict resolution mirrors the city page: prefer explicit ?vl=
  // when both are set, and redirect ?vl=fully_vegan to the canonical path.
  const otherSp = new URLSearchParams()
  for (const [k, v] of Object.entries(sp)) if (k !== 'level' && k !== 'vl' && typeof v === 'string') otherSp.set(k, v)
  if (isFullyVeganMode && vl && vl !== 'fully_vegan') {
    otherSp.set('vl', vl)
    const qs = otherSp.toString()
    redirect(`/vegan-places/${country}${qs ? '?' + qs : ''}`)
  }
  if (!isFullyVeganMode && vl === 'fully_vegan') {
    const qs = otherSp.toString()
    redirect(`/vegan-places/${country}/fully-vegan${qs ? '?' + qs : ''}`)
  }

  if (COUNTRY_REDIRECTS[country]) redirect(`/vegan-places/${COUNTRY_REDIRECTS[country]}${isFullyVeganMode ? '/fully-vegan' : ''}`)
  const [{ cities: allCities, country: countryName }, { places: allRawPlaces }, allScores, cityImages, regions, auditPost] = await Promise.all([
    getCities(country),
    fetchCountryPlaces(country),
    getCityScores(),
    loadCityImages(),
    getRegionsForCountry(country),
    getCountryAuditPost(country),
  ])

  // FV-mode filters places + drops cities with zero fully_vegan venues
  // from the city list so the page reflects "100% vegan in X" honestly.
  const places = isFullyVeganMode ? allRawPlaces.filter((p: any) => p.vegan_level === 'fully_vegan') : allRawPlaces
  const cities = isFullyVeganMode
    ? allCities.map((c: any) => ({ ...c, count: c.stats?.fullyVegan || 0 })).filter((c: any) => c.count > 0)
    : allCities

  // Split cities into "in a region" vs "unassigned". Region cards roll up
  // their cities; unassigned cities fall through to the existing grid.
  const cityToRegion = new Map<string, typeof regions[number]>()
  for (const r of regions) for (const cn of r.city_names) cityToRegion.set(cn, r)
  const regionCards: RegionCard[] = regions.map(r => {
    const inRegion = cities.filter((c: any) => r.city_names.includes(c.name))
    const sortedInRegion = [...inRegion].sort((a: any, b: any) => b.count - a.count)
    // Region thumbnail: first city in the region (by place_count) that has
    // an image on disk. Same auto-hero logic as the region detail page.
    let heroImage: string | null = null
    for (const c of sortedInRegion) {
      const img = getCityImage(cityImages, c.name, countryName)
      if (img) { heroImage = img; break }
    }
    return {
      region: r,
      totalPlaces: inRegion.reduce((s: number, c: any) => s + c.count, 0),
      fullyVegan: inRegion.reduce((s: number, c: any) => s + (c.stats?.fullyVegan || 0), 0),
      heroImage,
      // All cities with data, sorted by place_count desc. The component
      // shows top 8 inline + the rest inside a <details> expander so every
      // city link stays crawlable while the default UI stays clean.
      cities: sortedInRegion.map((c: any) => ({ city: c.name, city_slug: c.slug, place_count: c.count })),
    }
  }).filter(rc => rc.totalPlaces > 0)
  // Minimum 5 places for a city to appear in the country page grid —
  // matches the City Ranks threshold and keeps single-place imports
  // (one OSM hit in a small town) out of the "Other cities" block.
  const MIN_CITY_PLACES = 5
  const unassignedCities = (regions.length > 0
    ? cities.filter((c: any) => !cityToRegion.has(c.name))
    : cities
  ).filter((c: any) => (c.count ?? 0) >= MIN_CITY_PLACES)
  const totalPlaces = cities.reduce((sum: number, c: any) => sum + c.count, 0)
  const totalFv = cities.reduce((sum: number, c: any) => sum + (c.stats?.fullyVegan || 0), 0)

  // Country scores (for city cards, no average displayed)
  const countryScores = allScores.filter((s: any) => s.country === countryName)

  // Country description. Categories are counted from the actual `places`
  // array (not the directory_cities MV which only exposes eat/store/hotel)
  // so sanctuaries/organisations and other categories show up honestly.
  const countryStats = {
    total: totalPlaces, categories: {} as Record<string, number>,
    fullyVegan: 0, petFriendly: 0, cuisines: [] as string[],
    sampleNames: [] as string[], cityCount: cities.length,
  }
  for (const p of places) {
    if (p.category) countryStats.categories[p.category] = (countryStats.categories[p.category] || 0) + 1
  }
  const cuisineCounts: Record<string, number> = {}
  for (const city of cities) {
    if (!city.stats) continue
    countryStats.fullyVegan += city.stats.fullyVegan || 0
    countryStats.petFriendly += city.stats.petFriendly || 0
    for (const c of city.stats.cuisines || []) cuisineCounts[c] = (cuisineCounts[c] || 0) + 1
    if (countryStats.sampleNames.length < 5) countryStats.sampleNames.push(...(city.stats.sampleNames || []).slice(0, 2))
  }
  countryStats.cuisines = Object.entries(cuisineCounts).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([k]) => k)
  countryStats.sampleNames = countryStats.sampleNames.slice(0, 5)
  const sceneDescription = generateCountryDescription(countryName, countryStats)

  // Freshness signal for FV mode — mirrors the city page implementation so
  // /vegan-places/<country>/fully-vegan carries the same verification copy
  // and ItemList JSON-LD that AI search systems can quote.
  const fvSet: any[] = isFullyVeganMode ? places : []
  const fvLastVerified = fvSet
    .map((p: any) => p.last_verified_at)
    .filter((d: any): d is string => !!d)
    .sort()
    .reverse()[0] || null
  const fvAdminReviewed = fvSet.filter((p: any) => (p.verification_level ?? 0) >= 3).length
  const formatVerifiedDate = (d: string) =>
    new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })

  const fvItemListJsonLd = isFullyVeganMode && fvSet.length > 0 ? {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `100% Vegan Places in ${countryName}`,
    description: `Manually verified 100% vegan venues in ${countryName}.`,
    numberOfItems: fvSet.length,
    itemListElement: fvSet.slice(0, 200).map((p: any, i: number) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: `https://www.plantspack.com/place/${p.slug || p.id}`,
      name: p.name,
    })),
  } : null

  return (
    <div className="min-h-screen bg-surface">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            buildBreadcrumbs([
              HOME_CRUMB,
              { name: 'Vegan Places', url: 'https://www.plantspack.com/vegan-places' },
              { name: countryName, url: `https://www.plantspack.com/vegan-places/${country}` },
            ]),
          ),
        }}
      />
      {fvItemListJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(fvItemListJsonLd) }}
        />
      )}
      <div className="max-w-7xl mx-auto px-4 py-5 md:py-8">
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
            {isFullyVeganMode ? '100% Vegan in ' : 'Vegan Places in '}<span className="text-primary">{countryName}</span>
          </h1>
          <p className="text-on-surface-variant text-base mb-3">
            {totalPlaces > 0
              ? isFullyVeganMode
                ? <>{totalFv} fully vegan {totalFv === 1 ? 'venue' : 'venues'} across {cities.length} {cities.length === 1 ? 'city' : 'cities'}, hand-verified against each venue&apos;s own website.</>
                : <><FilteredTotal total={totalPlaces} fullyVegan={totalFv} />{' '}
                    <FilteredLabel allLabel="vegan and vegan-friendly" veganLabel="fully vegan" />{' '}
                    places across {cities.length} {cities.length === 1 ? 'city' : 'cities'}<FullyVeganNote count={totalFv} />.</>
              : <>Explore vegan-friendly places in {countryName}.</>
            }
          </p>
          <div className="flex flex-wrap gap-3 mt-4">
            <Link href={`/map?location=${encodeURIComponent(countryName)}`}
              className="inline-flex items-center gap-2 text-sm font-medium silk-gradient text-on-primary-btn px-4 py-2 rounded-lg transition-colors hover:opacity-90">
              <Globe className="h-4 w-4" /> View on map
            </Link>
            {/* Global "100% vegan only" toggle in TopBar handles tier switching
                site-wide. /fully-vegan exists as an SEO/share URL but doesn't
                need a button here. */}
          </div>
        </div>

        {/* Travel essentials — interconnects the country page with the
            travel guide (where it exists) and the universally-useful
            menu scanner + printable cards. Positioned above-the-fold
            for travel-intent users without competing with the country
            page on the "vegan [country]" query (header framing is
            travel-utility, not alt-destination). Renders in both
            normal and fully-vegan modes since the tools help either
            audience. */}
        <section className="mb-6 rounded-2xl ghost-border bg-surface-container-lowest p-4 md:p-5">
          <h2 className="text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-3">
            Going to {countryName}? Travel essentials
          </h2>
          <div className={`grid gap-2 ${hasTravelGuide(country) ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}`}>
            {hasTravelGuide(country) && (
              <Link
                href={`/vegan/travel/${country}`}
                prefetch={false}
                className="block p-3 rounded-xl ghost-border bg-surface hover:border-primary/40 hover:bg-primary/5 transition"
              >
                <BookOpen className="h-5 w-5 text-primary mb-1.5" />
                <div className="font-bold text-sm text-on-surface mb-0.5">Travel tips for {countryName}</div>
                <div className="text-xs text-on-surface-variant leading-relaxed">Phrasebook, dish dictionary, what to watch for.</div>
              </Link>
            )}
            <Link
              href="/tools/menu-scanner"
              prefetch={false}
              className="block p-3 rounded-xl ghost-border bg-surface hover:border-primary/40 hover:bg-primary/5 transition"
            >
              <UtensilsCrossed className="h-5 w-5 text-primary mb-1.5" />
              <div className="font-bold text-sm text-on-surface mb-0.5">Menu scanner</div>
              <div className="text-xs text-on-surface-variant leading-relaxed">Photo of any menu — we highlight what&apos;s vegan.</div>
            </Link>
            <Link
              href="/tools/cards"
              prefetch={false}
              className="block p-3 rounded-xl ghost-border bg-surface hover:border-primary/40 hover:bg-primary/5 transition"
            >
              <Printer className="h-5 w-5 text-primary mb-1.5" />
              <div className="font-bold text-sm text-on-surface mb-0.5">Printable restaurant cards</div>
              <div className="text-xs text-on-surface-variant leading-relaxed">Hand to your waiter — 30+ languages.</div>
            </Link>
          </div>
        </section>

        {/* Country-audit blog callout — links Google + visitors to the
            authoritative writeup of how this country's directory was built.
            Strong internal-link signal for the audit post; honest signal to
            visitors that the data is hand-curated, not just imported. */}
        {/* Summer hub callout — links to /vegan-summer-destinations from the
            six countries that are featured in it. Season-gated like the
            homepage banner so it disappears after the Mediterranean season. */}
        {(() => {
          const SUMMER_HUB_COUNTRIES = new Set(['italy','spain','greece','portugal','croatia','turkey'])
          const m = new Date().getUTCMonth()
          const inSeason = m >= 4 && m <= 8
          if (!inSeason || !SUMMER_HUB_COUNTRIES.has(country)) return null
          return (
            <Link
              href="/vegan-summer-destinations"
              className="block mb-6 group bg-primary/5 hover:bg-primary/10 border border-primary/30 rounded-2xl overflow-hidden editorial-shadow transition-colors"
            >
              <div className="flex flex-col md:flex-row gap-0 md:items-stretch">
                <div className="flex-1 p-5 md:p-6">
                  <div className="text-[10px] uppercase tracking-widest font-bold text-primary mb-2">
                    Featured guide · Summer 2026
                  </div>
                  <h2 className="text-lg md:text-xl font-headline font-bold text-on-surface mb-2 group-hover:text-primary transition-colors leading-snug">
                    Vegan Summer Destinations in Europe
                  </h2>
                  <p className="text-sm text-on-surface-variant leading-relaxed line-clamp-3">
                    {countryName} is one of six Mediterranean countries in PlantsPack's seasonal vegan-travel hub - 29 destinations curated for plant-based summer trips.
                  </p>
                  <span className="inline-flex items-center gap-1 mt-3 text-xs font-medium text-primary">
                    Open the hub →
                  </span>
                </div>
              </div>
            </Link>
          )
        })()}

        {/* Regions section — only renders if the country has regions seeded */}
        {regionCards.length > 0 && (
          <CountryRegionsSection
            countrySlug={country}
            countryName={countryName}
            regions={regionCards}
          />
        )}

        {/* Cities Grid — interactive with sorting. When regions exist, this
            shows only cities that aren't part of any region (so visitors
            don't see e.g. Brussels-Capital communes here AND in the region
            card). When no regions exist, this shows everything. */}
        {unassignedCities.length > 0 && (
          <>
            <h2 className="text-lg font-semibold text-on-surface mb-4">
              {regionCards.length > 0 ? `Other cities in ${countryName}` : `Cities in ${countryName}`}
            </h2>
            <CountryCityGrid
              cities={unassignedCities}
              cityImages={cityImages}
              countryName={countryName}
              countrySlug={country}
              cityScores={countryScores}
            />
          </>
        )}

        {/* Long-form description — moved below the city listings so visitors
            reach cities first; kept in the DOM for SEO. */}
        {sceneDescription && !isFullyVeganMode && (
          <section className="mt-10 mb-6 max-w-3xl">
            <h2 className="font-headline font-bold text-lg mb-2">About vegan places in {countryName}</h2>
            <p className="text-on-surface-variant text-sm leading-relaxed">{sceneDescription}</p>
          </section>
        )}

        {/* Country-audit blog callout — answer-first: shown below the city
            listings so visitors reach cities first; still in the DOM for SEO. */}
        {auditPost && (
          <Link
            href={`/blog/${auditPost.slug}`}
            className="block mt-10 mb-6 group bg-surface-container-lowest hover:bg-surface-container-low ghost-border rounded-2xl overflow-hidden editorial-shadow transition-colors"
          >
            <div className="flex flex-col md:flex-row gap-0 md:items-stretch">
              {auditPost.image_url && (
                <div className="md:w-1/3 aspect-[16/9] md:aspect-auto overflow-hidden bg-surface-container-low">
                  <img src={auditPost.image_url} alt="" className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform" />
                </div>
              )}
              <div className="flex-1 p-5 md:p-6">
                <div className="text-[10px] uppercase tracking-widest font-bold text-primary mb-2">
                  How we audited {countryName}
                </div>
                <h2 className="text-lg md:text-xl font-headline font-bold text-on-surface mb-2 group-hover:text-primary transition-colors leading-snug">
                  {auditPost.title}
                </h2>
                <p className="text-sm text-on-surface-variant leading-relaxed line-clamp-3">
                  {auditPost.description}
                </p>
                <span className="inline-flex items-center gap-1 mt-3 text-xs font-medium text-primary">
                  Read the audit →
                </span>
              </div>
            </div>
          </Link>
        )}

        {/* All places in country with map.
            CityPlacesList paginates 30 per page via ?page=N, so the heading
            here intentionally states the country total only. The "1–30 of N"
            page-specific count is rendered by CityPlacesList itself. */}
        {places.length > 0 && (
          <div className="mt-12">
            <h2 className="text-lg font-semibold text-on-surface mb-4">
              All places in {countryName}
            </h2>
            {isFullyVeganMode && (
              <section className="mb-6 rounded-2xl bg-emerald-50 ghost-border border-emerald-100/80 p-5 text-sm leading-relaxed text-on-surface">
                <h3 className="font-headline font-bold text-base mb-2 text-emerald-900">How this list is verified</h3>
                <p className="mb-2">
                  Every venue here was opened on its own website, checked for animal products on the menu, cross-referenced against secondary sources (HappyCow, local vegan blogs), and confirmed currently open before being tagged 100% vegan. {fvAdminReviewed} of {fvSet.length} entries are at the highest verification tier (admin-reviewed){fvLastVerified ? `; the most recent review was ${formatVerifiedDate(fvLastVerified)}` : ''}.
                </p>
                <p className="text-xs text-on-surface-variant">
                  Full audit methodology: <Link href="/methodology" className="text-primary hover:underline">/methodology</Link>. Found a place we have classified wrong, or know of a fully vegan venue in {countryName} that should be here? Use Suggest Correction on any place page or write to <a href="mailto:hello@plantspack.com" className="text-primary hover:underline">hello@plantspack.com</a>.
                </p>
              </section>
            )}
            <CityPlacesList places={places} allPlaces={allRawPlaces} />
          </div>
        )}

        {places.length === 0 && cities.length === 0 && (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">🗺️</div>
            <h2 className="text-xl font-semibold text-on-surface mb-2">No places yet in {countryName}</h2>
            <p className="text-on-surface-variant mb-6">Be the first to add a vegan place!</p>
          </div>
        )}

        {/* Bottom travel-guide link removed — the top "Travel essentials"
            callout now carries this link prominently. Keeping one link to
            the guide avoids splitting anchor signal. */}
      </div>
    </div>
  )
}
