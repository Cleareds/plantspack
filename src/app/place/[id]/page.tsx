import { notFound, redirect } from 'next/navigation'
import { Metadata } from 'next'
import Link from 'next/link'

// SEO: place pages must be cacheable so Google spends crawl budget on them.
// `revalidate = 0` (no-store) caused 51K pages to land in "Discovered – not
// indexed". Mutation paths (reviews POST/DELETE, favorites, verify, edit)
// call revalidatePath('/place/<slug>') so user actions still feel instant.
export const revalidate = 3600

import { MapPin, Globe, Heart, ExternalLink, Phone, Calendar, User, CheckCircle } from 'lucide-react'
import RatingBadge from '@/components/places/RatingBadge'
import RatingDistribution from '@/components/places/RatingDistribution'
import PlaceTagBadges from '@/components/places/PlaceTagBadges'
import PlaceReviews from '@/components/places/PlaceReviews'
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
import VeganLevelInlineEditor from '@/components/places/VeganLevelInlineEditor'
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

async function getPlace(id: string): Promise<PlaceData | null> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://plantspack.com'
    const [placeResponse, ownerResponse] = await Promise.all([
      fetch(`${baseUrl}/api/places/${id}`, {
        cache: 'no-store'
      }),
      fetch(`${baseUrl}/api/places/${id}/owner`, {
        cache: 'no-store'
      })
    ])

    if (!placeResponse.ok) {
      return null
    }

    const placeData = await placeResponse.json()
    const ownerData = ownerResponse.ok ? await ownerResponse.json() : { owner: null }

    return {
      ...placeData.place,
      owner: ownerData.owner
    }
  } catch (error) {
    console.error('Error fetching place:', error)
    return null
  }
}

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
    return { reviews: data || [], hasMore: (data?.length || 0) === REVIEWS_PER_PAGE }
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
      title: 'Place Not Found - PlantsPack'
    }
  }

  const categoryLabel: Record<string, string> = {
    eat: 'Vegan Restaurant', store: 'Vegan Store', hotel: 'Vegan-Friendly Stay',
    event: 'Vegan Event', organisation: 'Vegan Organisation', other: 'Vegan-Friendly Place',
  }
  const cat = categoryLabel[place.category] || 'Vegan-Friendly Place'
  const veganTag = (place as any).vegan_level === 'fully_vegan' ? 'Fully Vegan' : 'Vegan-Friendly'
  const location = [place.city, place.country].filter(Boolean).join(', ')
  const rating = place.average_rating > 0 ? ` · ⭐ ${place.average_rating.toFixed(1)}` : ''

  const title = location
    ? `${place.name} — ${veganTag} ${cat} in ${location}${rating} | PlantsPack`
    : `${place.name} — ${veganTag} ${cat}${rating} | PlantsPack`

  // Build a rich fallback description if the place has no description
  const cuisines = (place as any).cuisine_types?.filter((c: string) => c && c !== 'vegan').slice(0, 3) || []
  const cuisineStr = cuisines.length ? ` ${cuisines.join(', ')} cuisine.` : ''
  const ratingText = place.review_count > 0
    ? ` Rated ${place.average_rating.toFixed(1)}/5 from ${place.review_count} review${place.review_count === 1 ? '' : 's'}.`
    : ''
  const addressLine = place.address ? ` ${place.address}.` : ''
  const fallbackDesc = `${place.name} is a ${veganTag.toLowerCase()} ${cat.toLowerCase()}${location ? ` in ${location}` : ''}.${cuisineStr}${addressLine}${ratingText}`.trim()

  // Prefer real description if long enough; otherwise augment with fallback
  const rawDesc = (sanitizeDescription(place.description) || '').trim()
  let description: string
  if (rawDesc.length >= 100) {
    description = rawDesc.length > 160 ? rawDesc.slice(0, 157).replace(/\s+\S*$/, '') + '…' : rawDesc
  } else if (rawDesc.length > 0) {
    const combined = `${rawDesc} ${fallbackDesc}`.trim()
    description = combined.length > 160 ? combined.slice(0, 157).replace(/\s+\S*$/, '') + '…' : combined
  } else {
    description = fallbackDesc.length > 160 ? fallbackDesc.slice(0, 157).replace(/\s+\S*$/, '') + '…' : fallbackDesc
  }

  // Skip illustrations/sketches/decorative assets; fall back to site default
  // (set in root layout) when no real photo is available.
  const image = pickOgImage((place as any).main_image_url, ...(place.images ?? []))

  return {
    title,
    description,
    alternates: { canonical: `https://plantspack.com/place/${place.slug || id}` },
    openGraph: {
      title: `${place.name} — ${veganTag} ${cat}${location ? ` in ${location}` : ''}`,
      description,
      type: 'website',
      siteName: 'PlantsPack',
      ...(image ? { images: [image] } : {}),
    }
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
        .select('place_id, places!inner(slug)')
        .eq('old_slug', id)
        .limit(1)
        .maybeSingle()
      aliasSlug = (alias as any)?.places?.slug || null
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
  }

  // Breadcrumbs — Home > Vegan Places > Country > City > Place. Matches the
  // visual breadcrumb nav below; gives Google rich-result hierarchy in SERPs.
  const countrySlug = slugifyCityOrCountry(place.country)
  const citySlug = slugifyCityOrCountry(place.city)
  const breadcrumbJsonLd = buildBreadcrumbs([
    HOME_CRUMB,
    { name: 'Vegan Places', url: 'https://plantspack.com/vegan-places' },
    ...(place.country && countrySlug
      ? [{ name: place.country, url: `https://plantspack.com/vegan-places/${countrySlug}` }]
      : []),
    ...(place.city && citySlug && countrySlug
      ? [{ name: place.city, url: `https://plantspack.com/vegan-places/${countrySlug}/${citySlug}` }]
      : []),
    { name: place.name, url: `https://plantspack.com/place/${place.slug || place.id}` },
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
              <h1 className="text-2xl sm:text-3xl font-bold text-on-surface mb-2">{place.name}</h1>
              <div className="mb-3">
                <RatingBadge
                  rating={place.average_rating}
                  reviewCount={place.review_count}
                  size="md"
                  showEmpty
                  href="#reviews"
                />
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
            </div>
          </div>

          {/* Image Gallery */}
          {(() => {
            const mainUrl = (place as any).main_image_url as string | null
            const gallery = place.images?.length
              ? place.images
              : (mainUrl ? [mainUrl] : [])
            return gallery.length > 0 ? (
            <div className="p-6 border-b border-outline-variant/15 relative">
              <ImageSlider images={gallery} />
              {/* Vegan + Pet badges */}
              <div className="absolute top-8 left-8 flex gap-2 z-10">
                {(place as any).vegan_level === 'fully_vegan' && (
                  <span className="px-2 py-1 rounded-md text-xs font-bold bg-emerald-600 text-white shadow">100% Vegan</span>
                )}
                {(place as any).vegan_level === 'mostly_vegan' && (
                  <span className="px-2 py-1 rounded-md text-xs font-bold bg-teal-600 text-white shadow">Mostly Vegan</span>
                )}
                {(place as any).vegan_level === 'vegan_friendly' && (
                  <span className="px-2 py-1 rounded-md text-xs font-bold bg-amber-500 text-white shadow">Vegan-Friendly</span>
                )}
                {(place as any).vegan_level === 'vegan_options' && (
                  <span className="px-2 py-1 rounded-md text-xs font-bold bg-stone-400 text-white shadow">Has Vegan Options</span>
                )}
                {place.is_pet_friendly && (
                  <span className="px-2 py-1 rounded-md text-xs font-bold bg-orange-500 text-white shadow">🐾 Pet-Friendly</span>
                )}
              </div>
            </div>
            ) : null
          })()}

          {/* Details */}
          <div className="p-6 space-y-4 border-b border-outline-variant/15">
            {/* Vegan level + category badges */}
            <div className="space-y-1.5">
              <div className="flex flex-wrap gap-2">
                <VeganLevelInlineEditor placeId={place.id} initialLevel={(place as any).vegan_level} />
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
                  <p className="text-on-surface-variant whitespace-pre-wrap">{cleanDesc}</p>
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
                    <span className="text-sm text-on-surface-variant">PlantsPack Team</span>
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

          {/* Verification footer */}
          <div className="px-6 pt-2">
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
        </div>
      </div>
    </div>
  )
}
