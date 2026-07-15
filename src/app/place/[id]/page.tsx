import { cache } from 'react'
import { notFound, redirect } from 'next/navigation'
import { Metadata } from 'next'
import Link from 'next/link'

// SEO: place pages must be cacheable so Google spends crawl budget on them.
// `revalidate = 0` (no-store) caused 51K pages to land in "Discovered – not
// indexed". Mutation paths (reviews POST/DELETE, favorites, verify, edit)
// call revalidatePath('/place/<slug>') so user actions still feel instant.
export const revalidate = 86400 // 24h safety net; edits+reviews revalidatePath on-demand (cost: crawl-tail ISR writes, 2026-07-10)

// ISR opt-in. Without generateStaticParams a dynamic-segment route is
// fully DYNAMIC - `revalidate` above is silently ignored and every crawl
// bills a function render (discovered 2026-07-12: place pages were never
// cached; the region route, which has GSP, was the only ISR one).
// Returning [] prerenders nothing at build time; each URL is rendered on
// first request, then cached for the revalidate window.
export function generateStaticParams() {
  return []
}


import { MapPin, Globe, Heart, ExternalLink, Phone, Calendar, User, CheckCircle, PauseCircle, AlertTriangle } from 'lucide-react'
import RatingBadge from '@/components/places/RatingBadge'
import RatingDistribution from '@/components/places/RatingDistribution'
import PlaceTagBadges from '@/components/places/PlaceTagBadges'
import PlaceReviews from '@/components/places/PlaceReviews'
import MyPlaceNote from '@/components/places/MyPlaceNote'
import { createAdminClient } from '@/lib/supabase-admin'
import PlaceMap from '@/components/places/PlaceMap'
import PlaceVerifyPrompt from '@/components/places/PlaceVerifyPrompt'
import VerificationFooter from '@/components/places/VerificationFooter'
import ReportButton from '@/components/reports/ReportButton'
import FavoriteButton from '@/components/social/FavoriteButton'
import ImageSlider from '@/components/ui/ImageSlider'
import HashScroller from '@/components/ui/HashScroller'
import AddToPackButton from '@/components/places/AddToPackButton'
import PlaceImage from '@/components/places/PlaceImage'
import { buildBreadcrumbs, HOME_CRUMB } from '@/lib/schema/breadcrumbs'
import { slugifyCityOrCountry } from '@/lib/places/slugify'
import ClaimBusinessButton from '@/components/places/ClaimBusinessButton'
import PlaceEditButton from '@/components/places/PlaceEditButton'
import { pickOgImage } from '@/lib/places/og-image'
import { sanitizeDescription } from '@/lib/places/sanitize-description'
import { buildPlaceFaqJsonLd, PLACE_SPEAKABLE } from '@/lib/places/faq'
import VeganLevelInlineEditor from '@/components/places/VeganLevelInlineEditor'
import AdminDelistButton from '@/components/places/AdminDelistButton'
import { formatDistanceToNow } from 'date-fns'
import type { PlaceOwnerPublic } from '@/types/place-claims'

type PlaceData = {
  id: string
  name: string
  slug: string | null
  category: string
  address: string
  description: string | null
  website: string | null
  phone: string | null
  is_pet_friendly: boolean
  latitude: number
  longitude: number
  images: string[]
  tags: string[]
  opening_hours: Record<string, string> | null
  event_time: { start: string; end: string } | null
  city: string | null
  country: string | null
  created_at: string
  created_by: string
  users: {
    id: string
    username: string
    first_name: string | null
    last_name: string | null
    avatar_url: string | null
  }
  favorite_places: { id: string; user_id: string }[]
  average_rating: number
  review_count: number
  rating_distribution: {
    '5': number
    '4': number
    '3': number
    '2': number
    '1': number
    total: number
  }
  owner: PlaceOwnerPublic | null
}

// Direct Supabase query instead of self-fetching /api/places/<id> +
// /api/places/<id>/owner. The internal HTTP round-trips multiplied edge-
// function invocations 5x per place page render (page + 2 middleware + 2
// API lambdas) and tripped Vercel's free-tier limits. React's cache()
// dedupes the call between generateMetadata and the page body.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const getPlace = cache(async (id: string): Promise<PlaceData | null> => {
  try {
    const supabase = createAdminClient()
    const column = UUID_RE.test(id) ? 'id' : 'slug'

    const { data: place, error } = await supabase
      .from('places')
      .select(`
        *,
        users:created_by (
          id,
          username,
          first_name,
          last_name,
          avatar_url
        ),
        favorite_places (
          id,
          user_id
        )
      `)
      .eq(column, id)
      .is('archived_at', null)
      .single()

    if (error || !place) return null

    const placeId = place.id

    const [{ data: avgRating }, { data: distribution }, { count: reviewCount }, { data: ownerRow }] = await Promise.all([
      supabase.rpc('get_place_average_rating', { p_place_id: placeId }),
      supabase.rpc('get_place_rating_distribution', { p_place_id: placeId }),
      supabase
        .from('place_reviews')
        .select('*', { count: 'exact', head: true })
        .eq('place_id', placeId)
        .is('deleted_at', null),
      supabase.rpc('get_place_owner', { p_place_id: placeId }).maybeSingle(),
    ])

    const owner = ownerRow
      ? {
          user_id: (ownerRow as any).user_id,
          username: (ownerRow as any).username,
          first_name: (ownerRow as any).first_name,
          last_name: (ownerRow as any).last_name,
          avatar_url: (ownerRow as any).avatar_url,
          verified_at: (ownerRow as any).verified_at,
        }
      : null

    return {
      ...(place as any),
      average_rating: avgRating || 0,
      review_count: reviewCount || 0,
      rating_distribution: distribution || { '5': 0, '4': 0, '3': 0, '2': 0, '1': 0, total: 0 },
      owner,
    } as PlaceData
  } catch (error) {
    console.error('Error fetching place:', error)
    return null
  }
})

const REVIEWS_PER_PAGE = 20

async function getInitialReviews(placeId: string) {
  try {
    const supabase = createAdminClient()
    const { data } = await supabase
      .from('place_reviews')
      .select(`
        *,
        users (id, username, first_name, last_name, avatar_url)
      `)
      .eq('place_id', placeId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .range(0, REVIEWS_PER_PAGE - 1)

    // Stitch in owner/admin replies in a second query so SSR markup
    // ships with the full thread already rendered (no client re-fetch
    // needed for the first paint). Mirrors the GET /reviews API route.
    const reviewIds = (data ?? []).map(r => r.id)
    let repliesByReview: Record<string, unknown[]> = {}
    if (reviewIds.length > 0) {
      const { data: replies } = await supabase
        .from('place_review_replies')
        .select(`
          id, review_id, user_id, author_role, content,
          edited_at, edit_count, created_at, updated_at,
          users:user_id (id, username, first_name, last_name, avatar_url)
        `)
        .in('review_id', reviewIds)
        .is('deleted_at', null)
        .order('created_at', { ascending: true })
      repliesByReview = (replies ?? []).reduce((acc, r) => {
        const arr = acc[r.review_id] ?? (acc[r.review_id] = [])
        arr.push(r)
        return acc
      }, {} as Record<string, unknown[]>)
    }

    const reviewsWithReplies = (data ?? []).map(r => ({
      ...r,
      replies: repliesByReview[r.id] ?? [],
    }))

    return { reviews: reviewsWithReplies, hasMore: (data?.length || 0) === REVIEWS_PER_PAGE }
  } catch (error) {
    console.error('[Place page] initial reviews fetch failed:', error)
    return { reviews: [], hasMore: true }
  }
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  const place = await getPlace(id)

  if (!place) {
    return {
      title: 'Place Not Found - Plants Pack'
    }
  }

  // Category label without the "Vegan" prefix; the prefix comes from
  // veganTag (Fully Vegan / Vegan-Friendly) so combining the two no longer
  // produces "Vegan-Friendly Vegan Restaurant" duplication in SERP titles.
  const categoryLabel: Record<string, string> = {
    eat: 'Restaurant', store: 'Store', hotel: 'Stay',
    event: 'Event', organisation: 'Organisation', other: 'Place',
  }
  const cat = categoryLabel[place.category] || 'Place'
  // vegan_level can be NULL - sanctuaries/organisations don't carry a food
  // badge (a dog shelter is not "Vegan-Friendly"; community feedback
  // 2026-07-13). No level -> no vegan prefix in the SERP title.
  const veganTag = (place as any).vegan_level === 'fully_vegan'
    ? 'Fully Vegan'
    : (place as any).vegan_level ? 'Vegan-Friendly' : ''
  const location = [place.city, place.country].filter(Boolean).join(', ')
  const rating = place.average_rating > 0 ? ` · ⭐ ${place.average_rating.toFixed(1)}` : ''

  // Branch-aware title differentiation. Chains like "Max & Benito" / "Pret a
  // Manger" / "Anker" have many same-name listings in one city; without a
  // street-level discriminator GSC flags younger pages as "Duplicate, Google
  // chose a different canonical". Extract the first segment of the address
  // (typically "Rotenturmstraße 27") and inject it between the name and the
  // category tail when it adds new signal beyond the name and city.
  const addr = (place.address ?? '').trim()
  const firstSeg = addr.split(',')[0]?.trim() ?? ''
  const cityLower = (place.city ?? '').toLowerCase()
  const nameLower = (place.name ?? '').toLowerCase()
  const usefulStreet = firstSeg
    && firstSeg.length > 3
    && firstSeg.length < 60
    && !firstSeg.toLowerCase().includes(cityLower)
    && !nameLower.includes(firstSeg.toLowerCase())
  const namePart = usefulStreet ? `${place.name} at ${firstSeg}` : place.name

  const title = location
    ? `${namePart} — ${[veganTag, cat].filter(Boolean).join(' ')} in ${location}${rating} | Plants Pack`
    : `${namePart} — ${[veganTag, cat].filter(Boolean).join(' ')}${rating} | Plants Pack`

  // Build a rich fallback description if the place has no description
  const cuisines = (place as any).cuisine_types?.filter((c: string) => c && c !== 'vegan').slice(0, 3) || []
  const cuisineStr = cuisines.length ? ` ${cuisines.join(', ')} cuisine.` : ''
  const ratingText = place.review_count > 0
    ? ` Rated ${place.average_rating.toFixed(1)}/5 from ${place.review_count} review${place.review_count === 1 ? '' : 's'}.`
    : ''
  const addressLine = place.address ? ` ${place.address}.` : ''
  const fallbackDesc = `${place.name} is a ${[veganTag.toLowerCase(), cat.toLowerCase()].filter(Boolean).join(' ')}${location ? ` in ${location}` : ''}.${cuisineStr}${addressLine}${ratingText}`.trim()

  // Prefer real description if long enough; otherwise augment with fallback.
  // Skip the raw description entirely when it is dominantly non-Latin
  // (Hebrew, Arabic, CJK, Cyrillic, etc.) because the rest of the metadata
  // is English — a SERP description in a different script from the title
  // tanks CTR in both audiences (English readers can't parse it; native
  // speakers see English title and assume mismatch). Threshold: 30% or
  // more of the description's letters are outside Latin → fall back.
  const rawDesc = (sanitizeDescription(place.description) || '').trim()
  const letters = rawDesc.match(/\p{L}/gu) || []
  const nonLatinShare = letters.length
    ? letters.filter(c => !/[A-Za-zÀ-ÿ]/.test(c)).length / letters.length
    : 0
  const usableRaw = nonLatinShare < 0.3 ? rawDesc : ''
  let description: string
  if (usableRaw.length >= 100) {
    description = usableRaw.length > 160 ? usableRaw.slice(0, 157).replace(/\s+\S*$/, '') + '…' : usableRaw
  } else if (usableRaw.length > 0) {
    const combined = `${usableRaw} ${fallbackDesc}`.trim()
    description = combined.length > 160 ? combined.slice(0, 157).replace(/\s+\S*$/, '') + '…' : combined
  } else {
    description = fallbackDesc.length > 160 ? fallbackDesc.slice(0, 157).replace(/\s+\S*$/, '') + '…' : fallbackDesc
  }

  // Skip illustrations/sketches/decorative assets; fall back to site default
  // (set in root layout) when no real photo is available.
  const image = pickOgImage((place as any).main_image_url, ...(place.images ?? []))

  // Indexation hygiene — noindex thin places per the 2026-06-15 GSC cleanup.
  //
  // Before this change we only deindexed pages with zero signals (Tier A,
  // ~4.1k pages). GSC reported 47k pages as "Discovered – not indexed",
  // confirming Google sees most of our directory as below the bar.
  //
  // Expanded definition now covers Tier A + Tier B (~13.9k pages combined):
  //   Strong-keep signals (any one → KEEP):
  //     - vegan_level in {fully_vegan, mostly_vegan}    (rare, unique)
  //     - is_verified OR verification_level >= 2        (manual sign-off)
  //     - review_count >= 1                              (community signal)
  //     - website present                                (Tier C: thin but
  //       at least the user can verify externally — kept on the index)
  //     - >=2 of {description ≥80 chars, image, hours}  (composite signal)
  //
  //   Everything else → noindex,follow.
  //
  // Threshold for hasDesc stays at 80 chars (GSC May 2026 lesson about
  // duplicate canonical at 49-60 chars on chain branches).
  const vl = (place as any).vegan_level
  const hasDesc = (place.description ?? '').trim().length >= 80
  const hasImage = !!(place as any).main_image_url || (place.images?.length ?? 0) > 0
  const hasWeb = !!(place as any).website
  const hasHours = !!(place as any).opening_hours && Object.keys((place as any).opening_hours).length > 0
  const hasReviews = ((place as any).review_count ?? 0) >= 1
  const isVeganTier = vl === 'fully_vegan' || vl === 'mostly_vegan'
  const isVerified = (place as any).is_verified || ((place as any).verification_level ?? 0) >= 2
  const compositeCount = [hasDesc, hasImage, hasHours].filter(Boolean).length
  const keep = isVeganTier || isVerified || hasReviews || hasWeb || compositeCount >= 2
  const isThin = !keep

  return {
    title,
    description,
    alternates: { canonical: `https://www.plantspack.com/place/${place.slug || id}` },
    robots: isThin ? { index: false, follow: true } : undefined,
    openGraph: {
      title: `${namePart} — ${[veganTag, cat].filter(Boolean).join(' ')}${location ? ` in ${location}` : ''}`,
      description,
      type: 'website',
      siteName: 'Plants Pack',
      ...(image ? { images: [image] } : {}),
    },
    // Mirror the place's hero image into the Twitter card too. Without this,
    // a place with its own photo would still fall back to the global
    // og-image.png on Twitter / X / Slack / WhatsApp share previews.
    ...(image ? {
      twitter: {
        card: 'summary_large_image' as const,
        title: `${namePart} — ${[veganTag, cat].filter(Boolean).join(' ')}${location ? ` in ${location}` : ''}`,
        description,
        images: [image],
      },
    } : {}),
  }
}

export default async function PlacePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  let place = await getPlace(id)

  // If not found by slug/id, check the slug-aliases table (historical slugs
  // from the bug fixed in 20260420000000). 301-redirect to the canonical URL.
  //
  // IMPORTANT: redirect() works by throwing NEXT_REDIRECT. If we put the
  // redirect() call inside try/catch, the catch SWALLOWS it and the page
  // falls through to notFound() → 404. We saw this in GSC: 20+ alias
  // URLs all returning 4xx. Fix: compute the alias OUTSIDE the catch,
  // then call redirect() at top level where it can throw cleanly.
  let aliasSlug: string | null = null
  if (!place) {
    try {
      const { createAdminClient } = await import('@/lib/supabase-admin')
      const admin = createAdminClient()
      const { data: alias } = await admin
        .from('place_slug_aliases')
        .select('place_id, places!inner(slug, archived_at)')
        .eq('old_slug', id)
        .limit(1)
        .maybeSingle()
      const tgt = (alias as any)?.places
      // Guard against bad aliases that would redirect to themselves or to
      // an archived row. Either case used to surface as a redirect loop in
      // GSC (the place page would 307 back to the same URL forever).
      if (tgt && tgt.slug && tgt.slug !== id && !tgt.archived_at) {
        aliasSlug = tgt.slug
      }
    } catch {}
  }
  if (aliasSlug) redirect(`/place/${aliasSlug}`)

  if (!place) {
    notFound()
  }

  // Redirect any non-canonical URL (UUID, old slug, or anything that doesn't
  // match the place's current slug) to the canonical slug URL. This prevents
  // canonical drift — previously the URL could be /place/<old-slug> while the
  // <link rel=canonical> pointed at /place/<new-slug>, which Google reads as
  // a duplicate and refuses to index.
  if (place.slug && id !== place.slug) {
    redirect(`/place/${place.slug}`)
  }

  // Fetch the first page of reviews server-side so it appears on first paint
  // (good for SEO, layout stability, and #reviews anchor scrolling).
  const { reviews: initialReviews, hasMore: reviewsHasMore } = await getInitialReviews(place.id)

  // "More places in {city}" — SSR internal links from each place page to
  // 6 siblings in the same city. Densifies the internal-link graph so
  // Google distributes PageRank deeper into the place corpus, addressing
  // the "Discovered but not indexed" bucket.
  let morePlacesInCity: any[] = []
  if (place.city && place.country) {
    const { createAdminClient } = await import('@/lib/supabase-admin')
    const admin = createAdminClient()
    const { data: siblings } = await admin
      .from('places')
      .select('id, slug, name, category, vegan_level, main_image_url, images, average_rating, review_count')
      .eq('city', place.city)
      .eq('country', place.country)
      .is('archived_at', null)
      .not('slug', 'is', null)
      .neq('id', place.id)
      .order('average_rating', { ascending: false, nullsFirst: false })
      .order('review_count', { ascending: false })
      .limit(6)
    morePlacesInCity = siblings || []
  }

  // "Other vegan cities in {country}" — SSR internal links from each
  // place page to 3 sibling cities in the same country. Addresses the
  // GSC "Discovered – not indexed" bucket by densifying the link
  // graph: every place becomes a 3-way hub (its own city + 3 sibling
  // cities + the country page).
  let nearbyCities: Array<{ city: string; count: number }> = []
  if (place.city && place.country) {
    const { createAdminClient } = await import('@/lib/supabase-admin')
    const admin = createAdminClient()
    // Top 3 cities in the same country by place count, excluding
    // the current city. Threshold of 5 places matches the project's
    // city-page minimum (no thin link targets).
    const { data: countryCityRows } = await admin
      .from('places')
      .select('city')
      .eq('country', place.country)
      .is('archived_at', null)
      .not('city', 'is', null)
      .neq('city', place.city)
    const counts: Record<string, number> = {}
    for (const r of countryCityRows || []) {
      const c = (r as { city: string | null }).city
      if (c) counts[c] = (counts[c] || 0) + 1
    }
    nearbyCities = Object.entries(counts)
      .filter(([, n]) => n >= 5)
      .map(([city, count]) => ({ city, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3)
  }

  // JSON-LD for LocalBusiness
  const placeSchemaType = place.category === 'hotel' ? 'LodgingBusiness' : place.category === 'store' ? 'Store' : 'Restaurant'
  const placeJsonLd = {
    '@context': 'https://schema.org',
    '@type': placeSchemaType,
    name: place.name,
    description: place.description || undefined,
    address: place.address,
    geo: { '@type': 'GeoCoordinates', latitude: place.latitude, longitude: place.longitude },
    ...(place.website ? { url: place.website } : {}),
    ...(place.phone ? { telephone: place.phone } : {}),
    ...(place.images?.[0] ? { image: place.images[0] } : {}),
    ...(place.average_rating > 0 ? {
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: place.average_rating,
        reviewCount: place.review_count || 1,
      }
    } : {}),
    // Speakable: tells voice agents which selectors hold the
    // canonical short-form answer (H1 + the description paragraph).
    speakable: PLACE_SPEAKABLE,
  }

  // FAQ JSON-LD generated from the place's own data — gives LLM
  // search agents (ChatGPT, Perplexity, Claude, AI Overviews)
  // explicit Q&A about vegan status, address, hours, verification
  // freshness, contact. They quote these directly when answering
  // user questions, often citing the source.
  const placeFaqJsonLd = buildPlaceFaqJsonLd({
    name: place.name,
    vegan_level: (place as any).vegan_level,
    address: place.address,
    city: place.city,
    country: place.country,
    opening_hours: place.opening_hours,
    is_pet_friendly: place.is_pet_friendly,
    website: place.website,
    phone: place.phone,
    last_verified_at: (place as any).last_verified_at,
    verification_method: (place as any).verification_method,
    verification_level: (place as any).verification_level,
  })

  // Breadcrumbs — Home > Vegan Places > Country > City > Place. Matches the
  // visual breadcrumb nav below; gives Google rich-result hierarchy in SERPs.
  const countrySlug = slugifyCityOrCountry(place.country)
  const citySlug = slugifyCityOrCountry(place.city)
  const breadcrumbJsonLd = buildBreadcrumbs([
    HOME_CRUMB,
    { name: 'Vegan Places', url: 'https://www.plantspack.com/vegan-places' },
    ...(place.country && countrySlug
      ? [{ name: place.country, url: `https://www.plantspack.com/vegan-places/${countrySlug}` }]
      : []),
    ...(place.city && citySlug && countrySlug
      ? [{ name: place.city, url: `https://www.plantspack.com/vegan-places/${countrySlug}/${citySlug}` }]
      : []),
    { name: place.name, url: `https://www.plantspack.com/place/${place.slug || place.id}` },
  ])

  const categoryLabels: Record<string, string> = {
    restaurant: 'Restaurant',
    event: 'Event',
    museum: 'Museum',
    other: 'Other'
  }

  return (
    <div className="min-h-screen bg-surface-container-low">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(placeJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      {placeFaqJsonLd && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(placeFaqJsonLd) }} />
      )}
      <HashScroller />
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Breadcrumb — full on desktop, short on mobile */}
        <nav className="mb-6 text-sm text-on-surface-variant">
          <Link href="/" className="hover:text-primary transition-colors">Home</Link>
          <span className="mx-2">/</span>
          <Link href="/vegan-places" className="hover:text-primary transition-colors">Vegan Places</Link>
          {place.country && (
            <>
              <span className="mx-2 hidden sm:inline">/</span>
              <Link
                href={`/vegan-places/${place.country.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
                className="hover:text-primary transition-colors hidden sm:inline"
              >
                {place.country}
              </Link>
            </>
          )}
          {place.city && place.country && (
            <>
              <span className="mx-2 hidden sm:inline">/</span>
              <Link
                href={`/vegan-places/${place.country.toLowerCase().replace(/[^a-z0-9]+/g, '-')}/${place.city.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
                className="hover:text-primary transition-colors hidden sm:inline"
              >
                {place.city}
              </Link>
            </>
          )}
          <span className="mx-2">/</span>
          <span className="text-on-surface">{place.name}</span>
        </nav>

        {/* Main Content */}
        <div className="bg-surface-container-lowest rounded-lg editorial-shadow ghost-border overflow-hidden">
          {/* Header */}
          <div className="p-6 border-b border-outline-variant/15">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-surface-container-low text-primary">
                  {categoryLabels[place.category] || place.category}
                </span>
                {place.is_pet_friendly && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-surface-container text-on-surface-variant">
                    🐾 Pet Friendly
                  </span>
                )}
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-on-surface mb-2">
                {place.name}
                {(() => {
                  // Branch-aware H1 suffix mirroring the title logic in
                  // generateMetadata: when the address has a clear street-level
                  // first segment, render it as muted sub-text so Google sees
                  // a unique H1 per chain branch.
                  const a = (place.address ?? '').trim()
                  const seg = a.split(',')[0]?.trim() ?? ''
                  const c = (place.city ?? '').toLowerCase()
                  const n = (place.name ?? '').toLowerCase()
                  const useful = seg
                    && seg.length > 3
                    && seg.length < 60
                    && !seg.toLowerCase().includes(c)
                    && !n.includes(seg.toLowerCase())
                  if (!useful) return null
                  return (
                    <span className="block text-sm font-normal text-on-surface-variant mt-1">{seg}</span>
                  )
                })()}
              </h1>
              {(place as any).business_status === 'temporarily_closed' && (
                <div className="mb-3 flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 dark:bg-amber-900/20 dark:border-amber-800/40">
                  <PauseCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" aria-hidden />
                  <p className="text-sm">
                    <span className="font-semibold text-amber-800 dark:text-amber-300">Temporarily closed</span>
                    <span className="text-amber-700/90 dark:text-amber-300/80">
                      {(place as any).reopen_date
                        ? ` — expected to reopen ${new Date((place as any).reopen_date).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}`
                        : ' — see the description below for details'}
                    </span>
                  </p>
                </div>
              )}
              {(place as any).business_status === 'permanently_closed' && (
                <div className="mb-3 flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2 dark:bg-red-900/20 dark:border-red-800/40">
                  <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400 flex-shrink-0" aria-hidden />
                  <span className="text-sm font-semibold text-red-800 dark:text-red-300">Permanently closed</span>
                </div>
              )}
              <div className="mb-3 flex items-center gap-3 flex-wrap">
                <RatingBadge
                  rating={place.average_rating}
                  reviewCount={place.review_count}
                  size="md"
                  showEmpty
                  href="#reviews"
                />
                {(place as any).last_verified_at && ((place as any).verification_level ?? 0) >= 2 && (
                  <span
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                    title={`Manually verified by Plants Pack ${(place as any).verification_method === 'admin_review' ? 'admin' : 'community'}`}
                  >
                    <CheckCircle className="h-3 w-3" aria-hidden />
                    Verified {new Date((place as any).last_verified_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                )}
              </div>
              {place.tags && place.tags.length > 0 && (
                <div className="mb-3">
                  <PlaceTagBadges tags={place.tags} size="sm" />
                </div>
              )}
              <div className="flex flex-wrap items-center gap-2 mt-3">
                <FavoriteButton
                  entityType="place"
                  entityId={place.id}
                  initialFavorites={place.favorite_places}
                />
                <AddToPackButton placeId={place.id} placeName={place.name} />
                <ClaimBusinessButton
                  placeId={place.id}
                  placeName={place.name}
                  isOwner={!!place.owner}
                />
                <PlaceEditButton place={{
                  ...place,
                  main_image_url: (place as any).main_image_url || null,
                  opening_hours: place.opening_hours,
                  owner: place.owner ? { user_id: place.owner.user_id } : null,
                }} />
              </div>
              <MyPlaceNote placeId={place.id} />
            </div>
          </div>

          {/* Image Gallery */}
          {(() => {
            const mainUrl = (place as any).main_image_url as string | null
            const gallery = place.images?.length
              ? place.images
              : (mainUrl ? [mainUrl] : [])
            return gallery.length > 0 ? (
            <>
            {/* Preload the LCP hero so the browser fetches it before it parses
                down to the (client) slider. React hoists this to <head>. */}
            <link rel="preload" as="image" href={gallery[0]} fetchPriority="high" />
            <div className="p-6 border-b border-outline-variant/15 relative">
              <ImageSlider images={gallery} />
              {/* Vegan + Pet badges */}
              <div className="absolute top-8 left-8 flex gap-2 z-10">
                {(place as any).vegan_level === 'fully_vegan' && (
                  <span className="px-2 py-1 rounded-md text-xs font-bold bg-emerald-700 text-white shadow">100% Vegan</span>
                )}
                {(place as any).vegan_level === 'mostly_vegan' && (
                  <span className="px-2 py-1 rounded-md text-xs font-bold bg-teal-700 text-white shadow">Mostly Vegan</span>
                )}
                {(place as any).vegan_level === 'vegan_friendly' && (
                  <span className="px-2 py-1 rounded-md text-xs font-bold bg-amber-600 text-white shadow">Vegan-Friendly</span>
                )}
                {(place as any).vegan_level === 'vegan_options' && (
                  <span className="px-2 py-1 rounded-md text-xs font-bold bg-stone-400 text-white shadow">Has Vegan Options</span>
                )}
                {place.is_pet_friendly && (
                  <span className="px-2 py-1 rounded-md text-xs font-bold bg-orange-600 text-white shadow">🐾 Pet-Friendly</span>
                )}
              </div>
            </div>
            </>
            ) : null
          })()}

          {/* Details */}
          <div className="p-6 space-y-4 border-b border-outline-variant/15">
            {/* Vegan level + category badges */}
            <div className="space-y-1.5">
              <div className="flex flex-wrap gap-2">
                <VeganLevelInlineEditor placeId={place.id} initialLevel={(place as any).vegan_level} />
                {/* Organisations without a subcategory still get an identity
                    chip - they carry no food-level badge (2026-07-13). */}
                {place.category === 'organisation' && !(place as any).subcategory && (
                  <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-surface-container-low text-on-surface-variant">Organisation</span>
                )}
                <AdminDelistButton placeId={place.id} placeName={place.name} />
                {(place as any).subcategory && (
                  <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-surface-container-low text-on-surface-variant">
                    {(place as any).subcategory.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                  </span>
                )}
                {place.is_pet_friendly && (
                  <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-surface-container text-on-surface-variant">🐾 Pet-Friendly</span>
                )}
              </div>
              {(place as any).vegan_level === 'mostly_vegan' && (
                <p className="text-[11px] text-on-surface-variant ml-0.5">Primarily vegan menu with a small number of non-vegan items.</p>
              )}
              {(place as any).vegan_level === 'vegan_options' && (
                <p className="text-[11px] text-on-surface-variant ml-0.5">Some vegan items available - not a dedicated vegan place.</p>
              )}
            </div>

            {(() => {
              const cleanDesc = sanitizeDescription(place.description)
              return cleanDesc ? (
                <div>
                  <h2 className="text-lg font-semibold text-on-surface mb-2">About</h2>
                  <p
                    className="text-on-surface-variant whitespace-pre-wrap"
                    data-speakable="description"
                  >{cleanDesc}</p>
                </div>
              ) : null
            })()}

            <div className="grid md:grid-cols-2 gap-4">
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-outline flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="text-sm font-medium text-on-surface mb-1">Address</div>
                  <div className="text-sm text-on-surface-variant mb-2">
                    {[place.address, place.city, place.country].filter(Boolean).join(', ')}
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${place.latitude},${place.longitude}&destination_place_id=${(place as any).google_place_id || ''}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-medium text-on-primary-btn silk-gradient px-2.5 py-1 rounded-md"
                    >
                      <MapPin className="h-3 w-3" />
                      Get Directions
                    </a>
                    <a
                      href={(place as any).google_place_id
                        ? `https://www.google.com/maps/place/?q=place_id:${(place as any).google_place_id}`
                        : `https://www.google.com/maps/search/${encodeURIComponent(place.name + ' ' + place.address)}`
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-primary hover:text-primary"
                    >
                      <ExternalLink className="h-3 w-3" />
                      Google Maps
                    </a>
                    <span className="text-outline">•</span>
                    <a
                      href={`http://maps.apple.com/?q=${encodeURIComponent(place.name)}&address=${encodeURIComponent(place.address)}&ll=${place.latitude},${place.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-primary hover:text-primary"
                    >
                      <ExternalLink className="h-3 w-3" />
                      Apple Maps
                    </a>
                    <span className="text-outline">•</span>
                    <a
                      href={`https://www.openstreetmap.org/?mlat=${place.latitude}&mlon=${place.longitude}&zoom=17`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-primary hover:text-primary"
                    >
                      <ExternalLink className="h-3 w-3" />
                      OpenStreetMap
                    </a>
                  </div>
                </div>
              </div>

              {place.website && (
                <div className="flex items-start gap-3">
                  <Globe className="h-5 w-5 text-outline flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="text-sm font-medium text-on-surface">Website</div>
                    <a
                      href={place.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:text-primary flex items-center gap-1"
                    >
                      Visit Website <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </div>
              )}

              {place.phone && (
                <div className="flex items-start gap-3">
                  <Phone className="h-5 w-5 text-outline flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="text-sm font-medium text-on-surface">Phone</div>
                    <a
                      href={`tel:${place.phone}`}
                      className="text-sm text-primary hover:text-primary"
                    >
                      {place.phone}
                    </a>
                  </div>
                </div>
              )}

              {place.opening_hours && (
                <div className="flex items-start gap-3">
                  <Calendar className="h-5 w-5 text-outline flex-shrink-0 mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-on-surface mb-2">Opening Hours</div>
                    <div className="text-sm space-y-1">
                      {typeof place.opening_hours === 'string' ? (
                        // Split on ; or newline. Each segment renders on its
                        // own line as plain text — no fixed-width label column,
                        // because admin-typed strings like "closed on Tuesday"
                        // don't follow the OSM "Mo-Fr 08:00-20:00" pattern and
                        // any regex split would mangle them.
                        (place.opening_hours as string).split(/;|\n/).map(s => s.trim()).filter(Boolean).map((line, i) => (
                          <div key={i} className="text-on-surface break-words">{line}</div>
                        ))
                      ) : (
                        // Record<day, hours> — simple grid that wraps on narrow
                        // screens instead of overflowing.
                        Object.entries(place.opening_hours).map(([day, hours]) => (
                          <div key={day} className="grid grid-cols-[7rem_1fr] gap-2 break-words">
                            <span className="text-on-surface-variant capitalize">{day}</span>
                            <span className="text-on-surface font-medium">{hours as string}</span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}

              {place.event_time && place.category === 'event' && (
                <div className="flex items-start gap-3">
                  <Calendar className="h-5 w-5 text-outline flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="text-sm font-medium text-on-surface">Event Time</div>
                    <div className="text-sm text-on-surface-variant">
                      {new Date(place.event_time.start).toLocaleString('en-US', {
                        dateStyle: 'medium',
                        timeStyle: 'short'
                      })}
                      {place.event_time.end && (
                        <>
                          {' - '}
                          {new Date(place.event_time.end).toLocaleString('en-US', {
                            dateStyle: 'medium',
                            timeStyle: 'short'
                          })}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-3">
                <Calendar className="h-5 w-5 text-outline flex-shrink-0 mt-0.5" />
                <div>
                  <div className="text-sm font-medium text-on-surface">Added</div>
                  <div className="text-sm text-on-surface-variant">
                    {formatDistanceToNow(new Date(place.created_at), { addSuffix: true })}
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <User className="h-5 w-5 text-outline flex-shrink-0 mt-0.5" />
                <div>
                  <div className="text-sm font-medium text-on-surface">Added by</div>
                  {place.users.username === 'admin' ? (
                    <span className="text-sm text-on-surface-variant">Plants Pack Team</span>
                  ) : (
                    <Link
                      href={`/profile/${place.users.username}`}
                      className="text-sm text-primary hover:text-primary"
                    >
                      {place.users.first_name
                        ? `${place.users.first_name} ${place.users.last_name || ''}`.trim()
                        : place.users.username}
                    </Link>
                  )}
                </div>
              </div>

              {place.owner && (
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="text-sm font-medium text-on-surface">Verified Owner</div>
                    <Link
                      href={`/profile/${place.owner.username}`}
                      className="text-sm text-primary hover:text-primary flex items-center gap-1"
                    >
                      {place.owner.first_name && place.owner.last_name
                        ? `${place.owner.first_name} ${place.owner.last_name}`
                        : place.owner.username}
                    </Link>
                    <span className="text-xs text-outline">
                      Verified {formatDistanceToNow(new Date(place.owner.verified_at), { addSuffix: true })}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Map */}
          <div className="p-6 border-b border-outline-variant/15">
            <h2 className="text-lg font-semibold text-on-surface mb-4">Location</h2>
            <PlaceMap
              latitude={place.latitude}
              longitude={place.longitude}
              name={place.name}
              address={place.address}
              category={place.category}
              veganLevel={(place as any).vegan_level}
              placeId={place.id}
              placeSlug={place.slug}
            />
          </div>

          {/* Rating Distribution */}
          {place.review_count > 0 && (
            <div className="p-6 border-b border-outline-variant/15">
              <RatingDistribution distribution={place.rating_distribution} />
            </div>
          )}

          {/* Verify prompt */}
          <div className="px-6 pt-4">
            {(() => {
              const verificationStatus: string = (place as any).verification_status ?? ''
              const isAdminVerified =
                verificationStatus === 'admin_verified' ||
                verificationStatus === 'community_verified' ||
                (place as any).is_verified === true
              // scraping_verified = our scripts checked it; suppress the amber banner
              // but still show the regular gray prompt so humans can confirm or deny
              const isScrapingVerified = verificationStatus === 'scraping_verified'
              const src: string = (place as any).source || ''
              const isCommunityUnverified = !isAdminVerified && !isScrapingVerified && (
                src.startsWith('vegguide-') || src.startsWith('osm') ||
                src === 'openstreetmap' || src.startsWith('foursquare-discover')
              )
              const sourceLabel = src.startsWith('vegguide-')
                ? 'imported from VegGuide.org community data (circa 2015)'
                : src.startsWith('osm') || src === 'openstreetmap'
                ? 'imported from OpenStreetMap'
                : src.startsWith('foursquare-discover')
                ? 'imported from Foursquare'
                : 'community-sourced'
              return (
                <PlaceVerifyPrompt
                  placeId={place.id}
                  placeName={place.name}
                  needsCommunityVerification={isCommunityUnverified}
                  sourceLabel={sourceLabel}
                />
              )
            })()}
          </div>

          {/* Verification footer - shows the Axis-2 confidence badge inline
              plus the "Suggest correction" / "How we verify" actions. The
              previously-separate VerificationConfidenceBadge block was
              removed (2026-05-27) because it duplicated the badge that the
              footer already renders. */}
          <div className="px-6 pt-4">
            <VerificationFooter
              verificationLevel={(place as any).verification_level}
              verificationMethod={(place as any).verification_method}
              lastVerifiedAt={(place as any).last_verified_at}
              isVerified={(place as any).is_verified}
              tags={(place as any).tags}
              placeId={place.id}
              placeSlug={(place as any).slug}
              place={{
                id: place.id,
                name: place.name,
                address: place.address,
                description: place.description,
                category: place.category,
                website: place.website,
                phone: place.phone,
                opening_hours: place.opening_hours as any,
                vegan_level: (place as any).vegan_level,
              }}
            />
          </div>

          {/* Reviews */}
          <div id="reviews" className="p-6 scroll-mt-20">
            <PlaceReviews
              placeId={place.id}
              initialReviews={initialReviews as any}
              initialHasMore={reviewsHasMore}
            />
            <div className="mt-4 pt-4 border-t border-outline-variant/10 flex justify-end">
              <ReportButton targetType="place" targetId={place.id} />
            </div>
          </div>

          {/* More places in this city — SSR internal links to sibling places.
              Purpose is SEO (crawl graph density) as much as UX. */}
          {morePlacesInCity.length > 0 && (
            <div className="p-6 border-t border-outline-variant/10">
              <h2 className="text-lg font-semibold text-on-surface mb-4">
                More vegan places in {place.city}
              </h2>
              <ul className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {morePlacesInCity.map((sp: any) => {
                  const img = sp.main_image_url || sp.images?.[0] || null
                  return (
                    <li key={sp.id} className="bg-surface-container-lowest rounded-xl ghost-border overflow-hidden hover:border-primary/30 transition-all">
                      <Link href={`/place/${sp.slug}`} className="block">
                        <PlaceImage
                          src={img}
                          alt={sp.name}
                          category={sp.category}
                          className="w-full h-24 object-cover"
                        />
                        <div className="p-3">
                          <p className="font-medium text-sm text-on-surface truncate">{sp.name}</p>
                          <p className="text-[11px] text-on-surface-variant mt-0.5">
                            {sp.vegan_level === 'fully_vegan' ? '100% Vegan' : 'Vegan-Friendly'}
                            {sp.average_rating ? ` · ★ ${Number(sp.average_rating).toFixed(1)}` : ''}
                          </p>
                        </div>
                      </Link>
                    </li>
                  )
                })}
              </ul>
              <p className="text-xs text-on-surface-variant mt-3">
                <Link
                  href={`/vegan-places/${slugifyCityOrCountry(place.country || '')}/${slugifyCityOrCountry(place.city || '')}`}
                  className="text-primary hover:underline"
                >
                  All vegan places in {place.city} →
                </Link>
              </p>
            </div>
          )}

          {/* Other vegan cities in this country — SSR internal links to
              sibling city pages in the same country. Compounds with the
              "More places in {city}" block above to flatten the link
              graph: place → siblings + place → cities + place → country.
              Each place is a 3-way crawl hub. */}
          {nearbyCities.length > 0 && place.country && (
            <div className="p-6 border-t border-outline-variant/10">
              <h2 className="text-lg font-semibold text-on-surface mb-4">
                Other vegan cities in {place.country}
              </h2>
              <ul className="flex flex-wrap gap-2">
                {nearbyCities.map((nc) => (
                  <li key={nc.city}>
                    <Link
                      href={`/vegan-places/${slugifyCityOrCountry(place.country || '')}/${slugifyCityOrCountry(nc.city)}`}
                      className="inline-flex items-center gap-2 px-3 py-2 rounded-full bg-surface-container-lowest ghost-border hover:border-primary/30 text-sm transition-colors"
                    >
                      <span className="font-medium text-on-surface">{nc.city}</span>
                      <span className="text-[11px] text-on-surface-variant">{nc.count} places</span>
                    </Link>
                  </li>
                ))}
              </ul>
              <p className="text-xs text-on-surface-variant mt-3">
                <Link
                  href={`/vegan-places/${slugifyCityOrCountry(place.country || '')}`}
                  className="text-primary hover:underline"
                >
                  All vegan places in {place.country} →
                </Link>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
