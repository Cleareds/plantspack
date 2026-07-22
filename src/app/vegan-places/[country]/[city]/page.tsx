import { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'

// Mirror of COUNTRY_REDIRECTS in ../page.tsx. Old country slugs that still
// appear in external links / old indexes are 301'd to the canonical form.
const COUNTRY_REDIRECTS: Record<string, string> = {
  'macedonia': 'north-macedonia',
  'italia': 'italy',
  'czechia': 'czech-republic',
  'ivory-coast': 'cote-d-ivoire',
  'laramie': 'united-states',
  'marktheidenfeld-altfeld': 'germany',
}

// City slug renames after a merge. Keyed by country slug. Hits when an
// external link or old index used the variant slug; we 301 to canonical.
const CITY_REDIRECTS: Record<string, Record<string, string>> = {
  germany: {
    'koln': 'cologne',
    'nurnberg': 'nuremberg',
    'hanover': 'hannover',
    'brunswick': 'braunschweig',
    'frankfurt': 'frankfurt-am-main',
    'halle': 'halle-saale',
  },
  // GSC 2026-05-14 export: 15 apex-domain 404s on /vegan-places paths
  // with the city listed under the wrong country, plus "city-of-X" and
  // "-district" suffix patterns. Specific known cases below; the apex
  // -> www middleware redirect handles the duplicate-domain issue, and
  // these handle the in-URL country/city normalisation.
  thailand: {
    'mae-sai-district': 'mae-sai',
  },
  indonesia: {
    'city-of-medan': 'medan',
  },
  'united-kingdom': {
    'city-of-westminster': 'westminster',
    // "City of London" is the historic Square Mile admin boundary; for
    // a vegan directory it folds naturally into "London". Audit on
    // 2026-05-14 showed 1 place lives under the City-of-London slug
    // and would otherwise orphan.
    'city-of-london': 'london',
  },
}

// Cities in the wrong country in the URL. Cross-country 301 to the
// canonical country/city pair. Innsbruck is Austrian; legacy imports
// or external links sometimes filed it under Germany.
const CROSS_COUNTRY_CITY_REDIRECTS: Record<string, { country: string; city: string }> = {
  'germany/innsbruck': { country: 'austria', city: 'innsbruck' },
}
import { Globe, MapPin } from 'lucide-react'
import AddPlaceButton from '@/components/places/AddPlaceButton'
import { getCityDishChips } from '@/lib/dish-page-data'
import PinCityButton from '@/components/places/PinCityButton'
import FollowCityButton from '@/components/places/FollowCityButton'
import { generateCityDescription, generateCityMetaDescription, filterCuisinesForDisplay } from '@/lib/vegan-scene-descriptions'
import { FilteredTotal, FilteredLabel, FullyVeganNote } from '@/components/ui/FilteredCount'
import { getGradeColor, getScoreBarColor } from '@/lib/score-utils'
import CityPlacesList from '@/components/places/CityPlacesList'
import CityExperiencesSection from '@/components/city/CityExperiencesSection'
import { CityFaq } from '@/components/city/CityFaq'
import { buildBreadcrumbs, HOME_CRUMB } from '@/lib/schema/breadcrumbs'
import { loadCityImages } from '@/lib/city-images-server'
import { getCityImage } from '@/lib/city-images'
import { getCityIntro } from '@/lib/city-intros'
import { getRegionForCity, getRegionCityStats } from '@/lib/regions'
import { getCountryAuditPost } from '@/lib/country-audit-post'
import { createAdminClient } from '@/lib/supabase-admin'
import { getCityPlacesDirect, getScoresDirect, getCityExperiencesDirect } from '@/lib/directory-data'

// SEO: city pages must be cacheable so Google spends crawl budget on them.
// `force-dynamic` (no-store) means thousands of city pages are uncrawlable.
// Mutation paths (place add/edit/delete) call revalidatePath() so new places
// appear immediately.
export const revalidate = 21600 // 6h; place mutations revalidatePath on-demand (cost cut 2026-07-10)

interface PageProps {
  params: Promise<{ country: string; city: string }>
  // searchParams.level === 'fully-vegan' is set by the next.config rewrite
  // for /vegan-places/<country>/<city>/fully-vegan. When present, the page
  // serves the same layout but filters places to fully_vegan, swaps the
  // title/description, and points the canonical at the /fully-vegan URL.
  searchParams?: Promise<{ level?: string }>
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
  verification_level?: number | null
  verification_method?: string | null
  last_verified_at?: string | null
}

// Map our { Mon: "10:00-18:00", ... } shape to schema.org openingHoursSpecification.
export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
  const { country, city } = await params
  const { level } = (await searchParams) || {}
  const isFullyVeganMode = level === 'fully-vegan'
  const { places: allPlaces, city: cityName, country: countryName } = await fetchCityPlaces(country, city)
  const places = isFullyVeganMode ? allPlaces.filter((p: Place) => p.vegan_level === 'fully_vegan') : allPlaces

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

  // SERP location label. When city == country (e.g. Guatemala City in
  // Guatemala, Singapore in Singapore, Luxembourg in Luxembourg) the
  // doubled name "Guatemala, Guatemala" reads as a typo in SERPs and
  // tanks CTR. Render just the name in that case.
  const sameNameLoc = cityName.toLowerCase() === countryName.toLowerCase()
  const locLabel = sameNameLoc ? cityName : `${cityName}, ${countryName}`

  // Suppress the country argument in the meta-description generator when
  // it doubles the city — otherwise the description reads
  // "2 vegan places in Guatemala, Guatemala..." which compounds the
  // SERP weirdness alongside the title fix above.
  const metaDesc = generateCityMetaDescription(cityName, sameNameLoc ? '' : countryName, {
    total: places.length,
    categories: { eat, store, hotel },
    cuisines: Array.from(cuisineSet).slice(0, 6),
    sampleNames,
    fullyVegan: fv,
    petFriendly: pet,
  })

  // Drop the "— N Spots" suffix when the count is small enough to look
  // anaemic in SERP (under 10). The page still indexes (>=5 places passes
  // the thin-content gate) but the title now sells the destination, not
  // the small count.
  const showCount = allPlaces.length >= 10
  const countSuffix = showCount
    ? fv > 0
      ? ` — ${allPlaces.length} Spots (${fv} Fully Vegan)`
      : ` — ${allPlaces.length} Spots`
    : fv > 0
      ? ` (${fv} Fully Vegan)`
      : ''

  // Title term swap (2026-06-15 GSC fix): when the page is dominated by
  // restaurants we say "Vegan Restaurants in X" instead of "Vegan Places",
  // so it matches the "vegan restaurants" query (3,534 impressions, 0 clicks
  // on 30+ directory pages before this fix). Stays honest by keeping "Places"
  // when restaurants are <60% of the inventory or the count is too small to
  // be a meaningful claim. eat is computed over the current view (FV-filtered
  // when applicable) so the FV restaurant share decides FV-mode wording.
  const fvEat = isFullyVeganMode ? places.filter((p: Place) => p.category === 'eat').length : eat
  const eatShare = places.length > 0 ? fvEat / places.length : 0
  const eatDominant = places.length >= 5 && eatShare >= 0.6
  const placeTerm = eatDominant ? 'Restaurants' : 'Places'

  const title = isFullyVeganMode
    ? eatDominant
      ? `100% Vegan Restaurants in ${locLabel} — ${places.length} Verified | Plants Pack`
      : `100% Vegan in ${locLabel} — ${places.length} Verified ${places.length === 1 ? 'Venue' : 'Venues'} | Plants Pack`
    : `Vegan ${placeTerm} in ${locLabel}${countSuffix} | Plants Pack`

  // FV-mode meta description. Honest: "fully vegan" is the vegan_level
  // classification (source-provided for imports), NOT an is_verified flag —
  // so we say "listed as 100% vegan", not "manually verified/hand-checked".
  const fvDesc = `${places.length} ${places.length === 1 ? 'venue' : 'venues'} in ${cityName}, ${countryName} listed as 100% vegan — fully plant-based restaurants, cafés, bakeries and stores. Admin-confirmed spots carry a verified badge. Free, ad-free, no paid listings.`

  // Per-city og:image - improves SERP rich snippets and social previews.
  // When the city has no hero image on disk, return undefined so Next.js
  // falls back to the file-based opengraph-image.tsx generator (the
  // brand-mark default), not the now-deleted static og-image.png.
  const cityImages = loadCityImages()
  const cityImgUrl = getCityImage(cityImages, cityName, countryName)
  const ogImage = cityImgUrl ? { url: cityImgUrl, width: 1200, height: 630, alt: `Vegan places in ${cityName}, ${countryName}` } : null

  // When in fully-vegan mode, canonical points at the /fully-vegan URL
  // (not the underlying ?level=fully-vegan that the rewrite uses).
  const canonical = isFullyVeganMode
    ? `https://www.plantspack.com/vegan-places/${country}/${city}/fully-vegan`
    : `https://www.plantspack.com/vegan-places/${country}/${city}`

  return {
    title,
    description: isFullyVeganMode ? fvDesc : metaDesc,
    alternates: { canonical },
    // Indexation hygiene: cities with fewer than 5 places are too thin to
    // earn rankings and dilute the site's quality signal. They stay
    // crawlable (follow=true) so internal links to richer pages keep flowing.
    robots:
      places.length < 5
        ? { index: false, follow: true }
        : { index: true, follow: true, googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1 } },
    openGraph: {
      title: isFullyVeganMode
        ? eatDominant ? `100% Vegan Restaurants in ${locLabel}` : `100% Vegan in ${locLabel}`
        : `Vegan ${placeTerm} in ${locLabel}`,
      description: isFullyVeganMode ? fvDesc : metaDesc,
      type: 'website',
      siteName: 'Plants Pack',
      url: canonical,
      // Only set images when we actually have a city hero. Otherwise
      // omit so Next.js inherits the file-based default (the brand-mark
      // OG generator at src/app/opengraph-image.tsx).
      ...(ogImage ? { images: [ogImage] } : {}),
      locale: 'en_US',
    },
    // Same logic for the Twitter card.
    ...(cityImgUrl ? {
      twitter: {
        card: 'summary_large_image' as const,
        title: `Vegan Places in ${locLabel}`,
        description: metaDesc,
        images: [cityImgUrl],
      },
    } : {}),
  }
}

// JSON-LD structured data for SEO. Each place renders as a typed schema.org
// entity (Restaurant / Store / LodgingBusiness) with the minimal fields
// that drive rich results (name, image, geo, aggregateRating) - extras
// like description / phone / hours live on the place's own page where
// Google can crawl them once instead of paying for them on every city
// listing page.
function generateJsonLd(places: Place[], cityName: string, countryName: string) {
  // Top 20, not 50 - this JSON-LD is inlined as <script> and ALSO
  // re-serialized into React's RSC Flight payload, so every byte
  // doubles. Berlin city page was ~85 KB just from this block.
  // Top 20 still gives Google a meaningful ItemList for ranking
  // without dragging the page weight.
  const top = [...places]
    .sort((a, b) => (b.review_count || 0) - (a.review_count || 0) || (b.average_rating || 0) - (a.average_rating || 0))
    .slice(0, 20)
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `Vegan Places in ${cityName}, ${countryName}`,
    numberOfItems: places.length,
    itemListElement: top.map((place, i) => {
      const placeUrl = place.slug ? `https://www.plantspack.com/place/${place.slug}` : undefined
      const image = place.main_image_url || place.images?.[0] || undefined
      const itemType = place.category === 'hotel' ? 'LodgingBusiness' : place.category === 'store' ? 'Store' : 'Restaurant'
      // Minimal Restaurant/Store entity: only fields that drive rich
      // results (aggregateRating, geo) or are required for valid markup
      // (name, address with locality). Description / streetAddress /
      // telephone / openingHoursSpecification / servesCuisine all live
      // on the place's own page where Google crawls them once - they
      // don't need to ship inline for every city page.
      return {
        '@type': 'ListItem',
        position: i + 1,
        url: placeUrl,
        item: {
          '@type': itemType,
          '@id': placeUrl,
          name: place.name,
          ...(image ? { image } : {}),
          address: {
            '@type': 'PostalAddress',
            addressLocality: cityName,
            addressCountry: countryName,
          },
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
              bestRating: 5,
              worstRating: 1,
            },
          } : {}),
        },
      }
    }),
  }
}

// FAQ JSON-LD - eligible for rich snippets in Google SERP. Only fires for
// pages with enough data to answer real questions honestly.
function generateFaqJsonLd(args: {
  cityName: string; countryName: string;
  total: number; fullyVegan: number; topPlace?: Place; veganLevel4?: Place;
  cuisineSample?: string[]; storeCount: number; hotelCount: number;
}): any | null {
  const { cityName, countryName, total, fullyVegan, topPlace, cuisineSample, storeCount, hotelCount } = args
  if (total < 5) return null
  const main: any[] = []
  main.push({
    '@type': 'Question',
    name: `How many vegan places are in ${cityName}?`,
    acceptedAnswer: {
      '@type': 'Answer',
      text: `${total} vegan and vegan-friendly places in ${cityName}, ${countryName} on Plants Pack, including ${fullyVegan} fully vegan${storeCount ? `, ${storeCount} vegan stores` : ''}${hotelCount ? `, ${hotelCount} vegan-friendly stays` : ''}.`,
    },
  })
  if (fullyVegan > 0) {
    main.push({
      '@type': 'Question',
      name: `Are there fully vegan restaurants in ${cityName}?`,
      acceptedAnswer: {
        '@type': 'Answer',
        text: `Yes - ${fullyVegan} fully vegan ${fullyVegan === 1 ? 'spot serves' : 'spots serve'} no animal products at all in ${cityName}. The rest of the ${total - fullyVegan} places are vegan-friendly, with plant-based options on the menu.`,
      },
    })
  }
  if (topPlace && (topPlace.review_count || 0) >= 1 && (topPlace.average_rating || 0) > 0) {
    const isFv = topPlace.vegan_level === 'fully_vegan'
    main.push({
      '@type': 'Question',
      name: isFv
        ? `What's the top-rated fully vegan place in ${cityName}?`
        : `What's the most-reviewed vegan-friendly spot in ${cityName}?`,
      acceptedAnswer: {
        '@type': 'Answer',
        text: `${topPlace.name}${isFv ? ' is fully vegan and' : ''} has the highest community rating (${topPlace.average_rating!.toFixed(1)}/5 from ${topPlace.review_count} ${topPlace.review_count === 1 ? 'review' : 'reviews'}) on Plants Pack.`,
      },
    })
  }
  if (cuisineSample && cuisineSample.length) {
    main.push({
      '@type': 'Question',
      name: `What kind of vegan food can I find in ${cityName}?`,
      acceptedAnswer: {
        '@type': 'Answer',
        text: `${cityName} has a varied vegan scene - cuisines include ${cuisineSample.slice(0, 6).join(', ')}, plus cafes, bakeries, and stores stocking vegan products.`,
      },
    })
  }
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: main,
  }
}

// Direct-DB loaders (src/lib/directory-data.ts) replaced the self-HTTP
// fetches here 2026-07-11 — one billed invocation per regeneration
// instead of four. React cache() in the lib dedupes generateMetadata +
// page body within a single render.
async function fetchCityPlaces(country: string, city: string) {
  return getCityPlacesDirect(country, city)
}

async function getCityScore(cityName: string, countryName: string) {
  try {
    const scores = await getScoresDirect()
    const mine = scores.find((s: any) => s.city === cityName && s.country === countryName)
    if (!mine) return null
    // Rank among scored cities in the same country. Ties share the higher
    // rank (1224-style ranking). Rendered only when the country has >=5
    // scored cities so "#1 of 2" never appears.
    const countryScores = scores.filter((s: any) => s.country === countryName)
    const countryRank = countryScores.filter((s: any) => s.score > mine.score).length + 1
    return { ...mine, countryRank, countryCityCount: countryScores.length }
  } catch { return null }
}

// Latest review excerpts for places in this city — real UGC quotes make the
// hub page unique in a way no template copy can (no other directory has this
// text). One review per place so a single venue can't dominate the block;
// only substantive reviews (>=40 chars) qualify.
async function fetchCityReviews(cityName: string, countryName: string) {
  try {
    const { data } = await createAdminClient()
      .from('place_reviews')
      .select('id, rating, content, created_at, users!inner(username, first_name), place:place_id!inner(name, slug, city, country)')
      .eq('place.city', cityName)
      .eq('place.country', countryName)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(12)
    const seen = new Set<string>()
    const out: Array<{ id: string; rating: number; content: string; created_at: string; reviewer: string; placeName: string; placeSlug: string | null }> = []
    for (const r of (data || []) as any[]) {
      if (!r.content || r.content.trim().length < 40) continue
      if (seen.has(r.place?.name)) continue
      seen.add(r.place?.name)
      out.push({
        id: r.id,
        rating: r.rating,
        content: r.content.trim(),
        created_at: r.created_at,
        reviewer: r.users?.first_name || r.users?.username || 'Plants Pack member',
        placeName: r.place?.name,
        placeSlug: r.place?.slug || null,
      })
      if (out.length >= 3) break
    }
    return out
  } catch { return [] }
}

async function fetchCityExperiences(country: string, city: string) {
  return getCityExperiencesDirect(country, city)
}

export default async function CityPage({ params, searchParams }: PageProps) {
  const { country, city } = await params
  const sp = (await searchParams) || {}
  const level = sp.level
  // Read the vl param (forwarded directly via the rewrite). The pill UI in
  // CityPlacesList writes vl=<value> for non-FV levels; FV is encoded as
  // the /fully-vegan path segment instead, so vl=fully_vegan should never
  // appear here in normal navigation.
  const vl = (sp as any).vl as string | undefined
  let isFullyVeganMode = level === 'fully-vegan'

  // URL conflict resolution: if user lands on /fully-vegan?vl=<other>,
  // honour the explicit ?vl= and redirect to the non-FV URL with it.
  // Conversely, if not on /fully-vegan but ?vl=fully_vegan is set,
  // redirect to the canonical /fully-vegan path.
  const otherSp = new URLSearchParams()
  for (const [k, v] of Object.entries(sp)) if (k !== 'level' && k !== 'vl' && typeof v === 'string') otherSp.set(k, v)
  if (isFullyVeganMode && vl && vl !== 'fully_vegan') {
    otherSp.set('vl', vl)
    const qs = otherSp.toString()
    redirect(`/vegan-places/${country}/${city}${qs ? '?' + qs : ''}`)
  }
  if (!isFullyVeganMode && vl === 'fully_vegan') {
    const qs = otherSp.toString()
    redirect(`/vegan-places/${country}/${city}/fully-vegan${qs ? '?' + qs : ''}`)
  }

  if (COUNTRY_REDIRECTS[country]) redirect(`/vegan-places/${COUNTRY_REDIRECTS[country]}/${city}${isFullyVeganMode ? '/fully-vegan' : ''}`)
  // Wrong-country redirect (e.g. Innsbruck filed under Germany should
  // be Austria). Runs before the same-country alias redirect so the
  // country is fixed first.
  const crossCountry = CROSS_COUNTRY_CITY_REDIRECTS[`${country}/${city}`]
  if (crossCountry) redirect(`/vegan-places/${crossCountry.country}/${crossCountry.city}${isFullyVeganMode ? '/fully-vegan' : ''}`)
  const cityAlias = CITY_REDIRECTS[country]?.[city]
  if (cityAlias) redirect(`/vegan-places/${country}/${cityAlias}${isFullyVeganMode ? '/fully-vegan' : ''}`)
  const [{ places: allPlaces, city: cityName, country: countryName }, cityScore, cityExperiences, dishChips] = await Promise.all([
    fetchCityPlaces(country, city),
    getCityScore(city.replace(/-/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()), country.replace(/-/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())),
    fetchCityExperiences(country, city),
    getCityDishChips(country, city),
  ])
  // Depends on the canonical cityName/countryName from fetchCityPlaces, so
  // it can't join the Promise.all above.
  const cityReviews = await fetchCityReviews(cityName, countryName)

  // FV-mode filters the place list at SSR. Empty filter -> redirect back
  // to the regular city page rather than serving "0 fully vegan in X".
  const places = isFullyVeganMode ? allPlaces.filter((p: Place) => p.vegan_level === 'fully_vegan') : allPlaces
  if (allPlaces.length === 0) notFound()
  if (isFullyVeganMode && places.length === 0) redirect(`/vegan-places/${country}/${city}`)

  // Region back-link banner. Resolved by canonical city name (e.g. "Brussels",
  // "Saint-Josse-ten-Noode") so spelling variants stay grouped. Null for any
  // city not assigned to a region.
  const region = await getRegionForCity(country, cityName)

  // Surface the country-level audit blog post on the city page too. When a
  // country has a published audit, every city inside it benefits from the
  // editorial context + internal link to the post (the user can also reach
  // it from the country page; we duplicate the entry point for the city flow).
  const auditPost = await getCountryAuditPost(country)

  // Compute the city centroid from its places (cheap — already in memory).
  // Used to find nearby cities, and also handy for any future "near me"
  // features on this page.
  let cityCentroidLat: number | null = null
  let cityCentroidLng: number | null = null
  {
    let sumLat = 0, sumLng = 0, n = 0
    for (const p of allPlaces) {
      if (typeof p.latitude === 'number' && typeof p.longitude === 'number') {
        sumLat += p.latitude
        sumLng += p.longitude
        n++
      }
    }
    if (n > 0) {
      cityCentroidLat = sumLat / n
      cityCentroidLng = sumLng / n
    }
  }

  // Nearby cities (same country, sorted by distance, min 5 places to
  // match the country-page threshold) + other cities in the region
  // when the city belongs to one. Both surface as related-city blocks
  // at the bottom of the page — improves crawl graph and gives AI
  // agents more paths through the directory.
  const nearbyCitiesPromise = (cityCentroidLat !== null && cityCentroidLng !== null)
    ? createAdminClient().rpc('nearby_cities', {
        src_lat: cityCentroidLat,
        src_lng: cityCentroidLng,
        src_country: countryName,
        lim: 6,
        exclude_city: cityName,
        min_places: 5,
      }).then((res: any) => (res.data || []) as Array<{ city: string; city_slug: string; place_count: number; fully_vegan_count: number; distance_km: number }>)
    : Promise.resolve([] as Array<{ city: string; city_slug: string; place_count: number; fully_vegan_count: number; distance_km: number }>)
  const regionCitiesPromise = region
    ? getRegionCityStats(region, countryName).then(stats => stats.filter(s => s.city !== cityName))
    : Promise.resolve([] as Awaited<ReturnType<typeof getRegionCityStats>>)
  const [nearbyCities, regionCities] = await Promise.all([nearbyCitiesPromise, regionCitiesPromise])

  // Build stats from fetched places for data-driven description
  const cityStats: any = {
    total: places.length,
    categories: {} as Record<string, number>,
    fullyVegan: 0,
    mostlyVegan: 0,
    petFriendly: 0,
    verified: 0,
    withWebsite: 0,
    withHours: 0,
    cuisines: [] as string[],
    sampleNames: places.slice(0, 8).map((p: Place) => p.name),
    topPicks: [] as string[],
  }
  const cuisineCounts: Record<string, number> = {}
  // Rank places for "top picks": prefer fully_vegan + verified + has reviews/rating
  const ranked = [...places].sort((a: any, b: any) => {
    const score = (p: any) =>
      (p.vegan_level === 'fully_vegan' ? 4 : p.vegan_level === 'mostly_vegan' ? 3 : p.vegan_level === 'vegan_friendly' ? 1 : 0) +
      (p.verification_level >= 3 ? 3 : 0) +
      (p.average_rating ? Math.min(p.average_rating, 5) * 0.6 : 0) +
      (p.review_count ? Math.min(p.review_count, 20) * 0.05 : 0)
    return score(b) - score(a)
  })
  cityStats.topPicks = ranked
    .slice(0, 5)
    .map((p: any) => p.name)
    .filter((n: string) => n && n.length > 2 && n.length < 40)
  for (const p of places) {
    cityStats.categories[p.category] = (cityStats.categories[p.category] || 0) + 1
    if ((p as any).vegan_level === 'fully_vegan') cityStats.fullyVegan++
    if ((p as any).vegan_level === 'mostly_vegan') cityStats.mostlyVegan++
    if (p.is_pet_friendly) cityStats.petFriendly++
    if ((p as any).verification_level >= 3) cityStats.verified++
    if ((p as any).website) cityStats.withWebsite++
    if ((p as any).opening_hours && Object.keys((p as any).opening_hours).length > 0) cityStats.withHours++
    for (const ct of ((p as any).cuisine_types || [])) {
      if (ct) cuisineCounts[ct] = (cuisineCounts[ct] || 0) + 1
    }
  }
  // Filter out venue-type tags (coffee_shop, fast_food, sandwich, etc.) so
  // the cuisine list shows actual cuisines (italian, vietnamese, indian).
  const rankedCuisines = Object.entries(cuisineCounts).sort((a, b) => b[1] - a[1]).map(([k]) => k)
  cityStats.cuisines = filterCuisinesForDisplay(rankedCuisines).slice(0, 5)
  const sceneDescription = generateCityDescription(cityName, countryName, cityStats)
  // Top-100 cities also get a longer auto-generated, data-grounded intro
  // (public/data/city-intros.json). Null for cities under 10 places.
  const cityIntro = !isFullyVeganMode ? getCityIntro(cityName, countryName) : null

  const categories = [...new Set(places.map((p: Place) => p.category))] as string[]
  categories.sort()

  // Freshness signal computed once: most recent last_verified_at across
  // the FV set, plus admin-reviewed count. Used both in the verification
  // paragraph and when rendering per-tile badges.
  const fvSet: Place[] = isFullyVeganMode ? places : []
  const fvLastVerified = fvSet
    .map((p: Place) => p.last_verified_at)
    .filter((d): d is string => !!d)
    .sort()
    .reverse()[0] || null
  const fvAdminReviewed = fvSet.filter((p: Place) => (p.verification_level ?? 0) >= 3).length
  const formatVerifiedDate = (d: string) =>
    new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })

  // ItemList JSON-LD for AI-search citation: only on /fully-vegan, with
  // the verified FV venues listed as ListItem entries. AI parsers (ChatGPT,
  // Perplexity, Claude) read this as structured source data they can cite.
  const fvItemListJsonLd = isFullyVeganMode && fvSet.length > 0 ? {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `100% Vegan Places in ${cityName}, ${countryName}`,
    description: `Venues in ${cityName}, ${countryName} with fully plant-based (100% vegan) menus.`,
    numberOfItems: fvSet.length,
    itemListElement: fvSet.map((p: Place, i: number) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: `https://www.plantspack.com/place/${p.slug || p.id}`,
      name: p.name,
    })),
  } : null

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
      {fvItemListJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(fvItemListJsonLd) }}
        />
      )}
      {(() => {
        const eatList = places.filter((p: Place) => p.category === 'eat')
        const storeCount = places.filter((p: Place) => p.category === 'store').length
        const hotelCount = places.filter((p: Place) => p.category === 'hotel').length
        // Same picker as the visible FAQ - reviews>=1 minimum bar, prefer
        // fully_vegan, fall back to any reviewed. Avoids 0-review tiebreak
        // picking arbitrary places as the "top".
        const reviewed = eatList.filter((p: Place) => (p.review_count || 0) >= 1 && (p.average_rating || 0) > 0)
        const cmpRR = (a: Place, b: Place) =>
          (b.review_count || 0) - (a.review_count || 0) || (b.average_rating || 0) - (a.average_rating || 0)
        const topFv = reviewed.filter((p: Place) => p.vegan_level === 'fully_vegan').sort(cmpRR)[0]
        const topPlace: Place | undefined = topFv || [...reviewed].sort(cmpRR)[0]
        const cuisineCounts: Record<string, number> = {}
        for (const p of places) for (const c of (p.cuisine_types || [])) {
          if (c) cuisineCounts[c] = (cuisineCounts[c] || 0) + 1
        }
        const rankedJsonLdCuisines = Object.entries(cuisineCounts).sort((a, b) => b[1] - a[1]).map(([k]) => k)
        const cuisineSample = filterCuisinesForDisplay(rankedJsonLdCuisines).slice(0, 6)
        const faq = generateFaqJsonLd({
          cityName, countryName,
          total: places.length,
          fullyVegan: places.filter((p: Place) => p.vegan_level === 'fully_vegan').length,
          topPlace,
          cuisineSample,
          storeCount, hotelCount,
        })
        return faq ? (
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(faq) }}
          />
        ) : null
      })()}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            buildBreadcrumbs([
              HOME_CRUMB,
              { name: 'Vegan Places', url: 'https://www.plantspack.com/vegan-places' },
              { name: countryName, url: `https://www.plantspack.com/vegan-places/${country}` },
              { name: cityName, url: `https://www.plantspack.com/vegan-places/${country}/${city}` },
            ]),
          ),
        }}
      />

      <div className="max-w-7xl mx-auto px-4 py-5 md:py-8">
        {/* Breadcrumbs — mobile: Country > City, desktop: full path */}
        <nav className="flex items-center gap-2 text-sm text-on-surface-variant mb-4">
          <Link href="/" className="hidden md:inline hover:text-primary transition-colors">Home</Link>
          <span className="hidden md:inline text-outline">/</span>
          <Link href="/vegan-places" className="hidden md:inline hover:text-primary transition-colors">Vegan Places</Link>
          <span className="hidden md:inline text-outline">/</span>
          <Link href={`/vegan-places/${country}`} className="hover:text-primary transition-colors">{countryName}</Link>
          <span className="text-outline">/</span>
          <span className="text-on-surface font-medium">{cityName}</span>
        </nav>

        {/* Header */}
        <div className="mb-5">
          <div className="flex items-start justify-between gap-4 mb-3">
            <h1 className="font-headline font-extrabold text-3xl md:text-4xl text-on-surface tracking-tight">
              {isFullyVeganMode ? '100% Vegan in ' : 'Vegan Places in '}<span className="text-primary">{cityName}</span>
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
              <span>Accessibility <strong>{cityScore.breakdown.accessibility}</strong>/25</span>
              <span>Choice <strong>{cityScore.breakdown.choice}</strong>/25</span>
              <span>Variety <strong>{cityScore.breakdown.variety}</strong>/25</span>
              <span>Quality <strong>{cityScore.breakdown.quality}</strong>/25</span>
            </div>
          )}
          {cityScore && (
            <div className="max-w-xs mb-3">
              <div className="h-1.5 bg-surface-container-low rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${getScoreBarColor(cityScore.score)} transition-all`} style={{ width: `${cityScore.score}%` }} />
              </div>
            </div>
          )}
          {cityScore && cityScore.countryCityCount >= 5 && (
            <p className="text-xs text-on-surface-variant mb-3">
              Ranked <strong className="text-on-surface">#{cityScore.countryRank}</strong> of {cityScore.countryCityCount} {countryName} cities on the{' '}
              <Link href="/city-ranks" className="text-primary hover:underline">Plants Pack vegan city score</Link>.
            </p>
          )}
          <p className="text-on-surface-variant text-base mb-3">
            {places.length > 0
              ? (() => {
                  const fv = places.filter((p: any) => p.vegan_level === 'fully_vegan').length
                  if (isFullyVeganMode) {
                    return <>{places.length} fully vegan {places.length === 1 ? 'place' : 'places'} in {cityName}, {countryName}, listed with 100% plant-based menus{fvAdminReviewed > 0 ? <>; {fvAdminReviewed} admin-verified against the venue&apos;s own website</> : null}.</>
                  }
                  return (
                    <>
                      <FilteredTotal total={places.length} fullyVegan={fv} />{' '}
                      <FilteredLabel allLabel="vegan and vegan-friendly" veganLabel="fully vegan" />{' '}
                      places in {cityName}, {countryName}<FullyVeganNote count={fv} />.
                    </>
                  )
                })()
              : <>Discover vegan-friendly places in {cityName}.</>
            }
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href={`/map?location=${encodeURIComponent(cityName + ', ' + countryName)}`}
              className="inline-flex items-center gap-2 text-sm font-medium silk-gradient text-on-primary-btn px-4 py-2 rounded-lg transition-colors hover:opacity-90"
            >
              <Globe className="h-4 w-4" />
              View on map
            </Link>
            {/* Filter pills inside CityPlacesList already let users switch
                between vegan levels - and they route to the canonical
                /fully-vegan URL when 100% Vegan is selected. No extra
                button needed here. */}
            <AddPlaceButton
              cityName={cityName}
              countryName={countryName}
              className="inline-flex items-center gap-2 text-sm font-medium text-on-surface-variant ghost-border px-4 py-2 rounded-lg transition-colors hover:bg-surface-container-low"
            />
            <PinCityButton cityName={cityName} countryName={countryName} />
            <FollowCityButton cityName={cityName} countryName={countryName} currentScore={cityScore?.score} currentGrade={cityScore?.grade} />
          </div>
        </div>

        {/* Places list with client-side category filter + map */}
        {places.length > 0 ? (
          <>
            {/* FV-only verification block. Two purposes:
                (a) Adds 60-80 words of unique copy on /fully-vegan that no
                    other URL has, helping Google treat it as a distinct
                    page intent rather than a near-duplicate of /<city>.
                (b) Surfaces freshness (last_verified_at) so AI search
                    systems can quote it as a reliability signal. */}
            {isFullyVeganMode && (
              <section className="mb-6 rounded-2xl bg-emerald-50 ghost-border border-emerald-100/80 p-5 text-sm leading-relaxed text-on-surface">
                <h2 className="font-headline font-bold text-base mb-2 text-emerald-900">How this list is compiled</h2>
                <p className="mb-2">
                  {fvAdminReviewed > 0
                    ? `${fvAdminReviewed} of ${fvSet.length} ${fvSet.length === 1 ? 'venue' : 'venues'} here are at our highest verification tier — opened on their own website, checked for animal products on the menu, cross-referenced against secondary sources (HappyCow, local vegan blogs) and confirmed currently open before being tagged 100% vegan${fvLastVerified ? `; the most recent review was ${formatVerifiedDate(fvLastVerified)}` : ''}. The rest are listed as 100% vegan from vegan-first source data and haven't been individually re-checked yet.`
                    : `These ${fvSet.length} ${fvSet.length === 1 ? 'venue is' : 'venues are'} listed as 100% vegan based on vegan-first source data (OpenStreetMap, VegGuide, HappyCow and local vegan blogs). None have been individually admin-verified against the venue's own website yet — once checked, a venue carries a "Confirmed" badge on its page.`}
                </p>
                <p className="text-xs text-on-surface-variant">
                  Full audit methodology: <Link href="/methodology" className="text-primary hover:underline">/methodology</Link>. Found a place we have classified wrong, or know of a fully vegan venue in {cityName} that should be here? Use Suggest Correction on any place page or write to <a href="mailto:hello@plantspack.com" className="text-primary hover:underline">hello@plantspack.com</a>.
                </p>
              </section>
            )}
            {/* Long-tail dish chips - jumps to best-vegan/{dish} pages */}
            {dishChips.length > 0 && (
              <section className="mb-6">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <h2 className="font-headline font-bold text-base md:text-xl truncate min-w-0">Best vegan dishes in {cityName}</h2>
                  <Link
                    href={`/vegan-places/${country}/${city}/best-vegan`}
                    className="text-sm text-primary hover:underline font-medium shrink-0 whitespace-nowrap"
                  >
                    See all {dishChips.length} dish guides →
                  </Link>
                </div>
                {/* Subtitle + chip grid are desktop-only — on mobile we keep
                    just the heading + "See all N dish guides" link to save space. */}
                <p className="hidden md:block text-sm text-on-surface-variant mb-3">Curated picks by dish, ranked by community + verification confidence.</p>
                <div className="hidden md:flex flex-wrap gap-2">
                  {dishChips.slice(0, 16).map(d => (
                    <Link
                      key={d.slug}
                      href={`/vegan-places/${country}/${city}/best-vegan/${d.slug}`}
                      className="px-3 py-1.5 rounded-full bg-surface-container-low hover:bg-surface-container text-sm font-medium text-on-surface ghost-border"
                    >
                      Vegan {d.label} <span className="text-on-surface-variant">({d.count})</span>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            <CityPlacesList places={places} allPlaces={allPlaces} cityName={cityName} countryName={countryName} />

            {/* Server-rendered crawlable index of EVERY place in the city.
                CityPlacesList paginates client-side (30/page) and its
                Next/Prev are onClick buttons, not <a> — so crawlers only ever
                saw the first 30 place links per city. Deep inventory in big
                cities had no crawlable inbound link and sat in "Discovered –
                not indexed". This always-in-DOM <nav> gives Googlebot a real
                link to every place without touching the interactive UI. Only
                rendered when the list exceeds one page (otherwise redundant). */}
            {allPlaces.length > 30 && (
              <nav aria-label={`All vegan places in ${cityName}`} className="mt-10 pt-6 border-t border-outline-variant/15">
                <h2 className="font-headline font-bold text-base mb-3 text-on-surface">
                  All {allPlaces.length} vegan &amp; vegan-friendly places in {cityName}
                </h2>
                <ul className="columns-2 md:columns-3 gap-x-6 text-sm [&>li]:mb-1.5 [&>li]:break-inside-avoid">
                  {[...allPlaces]
                    .sort((a: Place, b: Place) => (a.name || '').localeCompare(b.name || ''))
                    .map((p: Place) => (
                      <li key={p.id}>
                        <Link href={`/place/${p.slug || p.id}`} prefetch={false} className="text-on-surface-variant hover:text-primary hover:underline">
                          {p.name}
                        </Link>
                      </li>
                    ))}
                </ul>
              </nav>
            )}
          </>
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

        {/* --- Context below the data --- Answer-first: the place list comes
            first so visitors see places on the first screen. These SEO/context
            blocks stay in the DOM (Google reads full document order) but render
            below the list. */}

        {/* Long-form description — moved here so visitors see places first.
            Still in the DOM for SEO/AI-search; the one-line count stays up top. */}
        {(sceneDescription || cityIntro) && (
          <section className="mt-10 mb-6 max-w-3xl">
            <h2 className="font-headline font-bold text-lg mb-2">About vegan places in {cityName}</h2>
            {sceneDescription && (
              <p className="text-on-surface-variant text-sm leading-relaxed mb-2">{sceneDescription}</p>
            )}
            {cityIntro && (
              <p className="text-on-surface-variant text-sm leading-relaxed">{cityIntro}</p>
            )}
          </section>
        )}

        {/* Latest community reviews — real quotes from place_reviews rows in
            this city. Unique UGC text per hub page; grows as the mobile app
            funnels reviews. Hidden entirely when the city has no substantive
            reviews (most cities today — renders on ~40 as of 2026-07). */}
        {cityReviews.length > 0 && (
          <section className="mt-10 mb-6 max-w-3xl">
            <h2 className="font-headline font-bold text-lg mb-3">What vegans say about {cityName}</h2>
            <ul className="space-y-3">
              {cityReviews.map((r) => (
                <li key={r.id} className="bg-surface-container-lowest ghost-border rounded-xl p-4">
                  <blockquote className="text-sm text-on-surface leading-relaxed mb-2">&ldquo;{r.content}&rdquo;</blockquote>
                  <p className="text-xs text-on-surface-variant">
                    <span className="text-amber-500" aria-label={`${r.rating} out of 5 stars`}>{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</span>
                    {' '}&middot; {r.reviewer} on{' '}
                    {r.placeSlug ? (
                      <Link href={`/place/${r.placeSlug}`} className="text-primary hover:underline font-medium">{r.placeName}</Link>
                    ) : (
                      <span className="font-medium">{r.placeName}</span>
                    )}
                    {' '}&middot; {new Date(r.created_at).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Region back-link banner — shown only when this city is part of a
            seeded country region (today: Belgium). Lets visitors zoom out to
            see all places across the wider region. */}
        {region && (
          <Link
            href={`/vegan-places/${country}/region/${region.region_slug}`}
            className="block mt-8 mb-6 bg-primary/5 border border-primary/20 rounded-xl px-4 py-3 hover:bg-primary/10 transition-colors"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm">
                <span className="text-on-surface-variant">Part of </span>
                <span className="font-semibold text-on-surface">{region.region_name}</span>
                <span className="text-on-surface-variant"> — see every vegan place across the region.</span>
              </div>
              <span className="text-primary text-sm font-medium flex-shrink-0">View region →</span>
            </div>
          </Link>
        )}

        {/* Country-audit blog callout — shown on every city within a country
            that has a published audit post. Same callout shape as the country
            page so users get a consistent entry point and Google sees the
            audit referenced from many internal pages. */}
        {auditPost && (
          <Link
            href={`/blog/${auditPost.slug}`}
            className="block mt-8 mb-6 group bg-surface-container-lowest hover:bg-surface-container-low ghost-border rounded-2xl overflow-hidden editorial-shadow transition-colors"
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

        {/* Vegan experiences for this city — SSR-fed so there's no loading
            flash + delete/edit flow uses router.refresh() for re-render. */}
        <div className="mb-8">
          <CityExperiencesSection
            countrySlug={country}
            citySlug={city}
            cityName={cityName}
            initialExperiences={cityExperiences.experiences}
            initialSummary={cityExperiences.summary}
          />
        </div>

        {/* Visible FAQ - mirrors the FAQ JSON-LD for rich-snippet eligibility
            (Google rewards FAQ schema more when the questions are visible
            on the page). All answers are grounded in real DB data. */}
        {(() => {
          const eatList = places.filter((p: Place) => p.category === 'eat')
          // Pick top place: only places with at least one review qualify
          // (otherwise "highest-rated" becomes a sort-tiebreak coin flip).
          // Prefer fully_vegan, fall back to any with reviews. Sort by
          // review count then rating.
          const reviewed = eatList.filter((p: Place) => (p.review_count || 0) >= 1 && (p.average_rating || 0) > 0)
          const sortByReviewsRating = (a: Place, b: Place) =>
            (b.review_count || 0) - (a.review_count || 0) || (b.average_rating || 0) - (a.average_rating || 0)
          const topFullyVegan = reviewed.filter((p: Place) => p.vegan_level === 'fully_vegan').sort(sortByReviewsRating)[0]
          const topReviewed = [...reviewed].sort(sortByReviewsRating)[0]
          const topPlace = topFullyVegan || topReviewed
          const storeCount = places.filter((p: Place) => p.category === 'store').length
          const hotelCount = places.filter((p: Place) => p.category === 'hotel').length
          const cuisineCounts: Record<string, number> = {}
          for (const p of places) for (const c of (p.cuisine_types || [])) {
            if (c) cuisineCounts[c] = (cuisineCounts[c] || 0) + 1
          }
          const rankedFaqCuisines = Object.entries(cuisineCounts).sort((a, b) => b[1] - a[1]).map(([k]) => k)
          const cuisines = filterCuisinesForDisplay(rankedFaqCuisines).slice(0, 6)
          return (
            <CityFaq
              cityName={cityName}
              countryName={countryName}
              total={places.length}
              fullyVegan={places.filter((p: Place) => p.vegan_level === 'fully_vegan').length}
              topPlaceName={topPlace?.name}
              topPlaceSlug={topPlace?.slug}
              topPlaceRating={topPlace?.average_rating || undefined}
              topPlaceReviews={topPlace?.review_count || undefined}
              topPlaceIsFullyVegan={topPlace?.vegan_level === 'fully_vegan'}
              cuisines={cuisines}
              storeCount={storeCount}
              hotelCount={hotelCount}
            />
          )
        })()}

        {/* Related cities — two sections that improve crawl graph and
            give AI agents more paths through the directory.

            "Other cities in <region>" only renders when the city
            belongs to a seeded region (Belgium has these; most other
            countries don't yet).

            "Nearby cities" is geographic — closest cities in the same
            country by ST_Distance over the city centroids of their
            places. Falls back to silence if we couldn't compute a
            centroid (city with no geocoded places). */}
        {regionCities.length > 0 && region && (
          <div className="mt-16 pt-8 border-t border-outline-variant/15">
            <h2 className="text-lg font-semibold text-on-surface mb-1">
              Other cities in {region.region_name}
            </h2>
            <p className="text-xs text-on-surface-variant mb-4">
              Part of the same region as {cityName}.{' '}
              <Link href={`/vegan-places/${country}/region/${region.region_slug}`} className="text-primary hover:underline">
                See the full region →
              </Link>
            </p>
            <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {regionCities.slice(0, 9).map((c) => (
                <li key={c.city_slug}>
                  <Link
                    href={`/vegan-places/${country}/${c.city_slug}`}
                    className="flex items-center gap-3 p-3 rounded-lg bg-surface-container-low hover:bg-surface-container transition-colors"
                  >
                    <span className="text-xl" aria-hidden>🏙️</span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-on-surface truncate">{c.city}</p>
                      <p className="text-xs text-on-surface-variant truncate">
                        {c.place_count} {c.place_count === 1 ? 'place' : 'places'}
                        {c.fully_vegan_count > 0 && ` · ${c.fully_vegan_count} fully vegan`}
                      </p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        {nearbyCities.length > 0 && (
          <div className="mt-12 pt-8 border-t border-outline-variant/15">
            <h2 className="text-lg font-semibold text-on-surface mb-1">
              Nearby cities
            </h2>
            <p className="text-xs text-on-surface-variant mb-4">
              Other vegan-friendly cities within day-trip distance of {cityName}.
            </p>
            <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {nearbyCities.map((c) => (
                <li key={c.city_slug}>
                  <Link
                    href={`/vegan-places/${country}/${c.city_slug}`}
                    className="flex items-center gap-3 p-3 rounded-lg bg-surface-container-low hover:bg-surface-container transition-colors"
                  >
                    <MapPin className="h-4 w-4 text-primary flex-shrink-0" aria-hidden />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-on-surface truncate">{c.city}</p>
                      <p className="text-xs text-on-surface-variant truncate">
                        {Math.round(c.distance_km)} km · {c.place_count} {c.place_count === 1 ? 'place' : 'places'}
                        {c.fully_vegan_count > 0 && ` · ${c.fully_vegan_count} fully vegan`}
                      </p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Related: country-wide browse */}
        <div className="mt-12 pt-8 border-t border-outline-variant/15">
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
