import { Metadata } from 'next'
import Link from 'next/link'
import { readFileSync } from 'fs'
import { join } from 'path'
import { cookies } from 'next/headers'
import { createAdminClient } from '@/lib/supabase-admin'
import { createClient as createServerClient } from '@/lib/supabase-server'
import HomeClient from '@/components/home/HomeClient'
import PlaceImage from '@/components/places/PlaceImage'
import { slugifyCityOrCountry } from '@/lib/places/slugify'
import { VEGAN_LEVEL_LABEL } from '@/lib/vegan-level'

export interface FollowedCity {
  city: string
  country: string
  currentScore: number
  currentGrade: string
  delta: number | null
  nextGrade: string | null
  pointsToNext: number | null
  placeCount: number
  fvCount: number
}

// Top cities + posts cache for 60s. The per-user location-aware content
// is fetched per-request using `dynamic = 'force-dynamic'` semantics via
// the cookies() call — the page becomes dynamic whenever location cookies
// exist, so each pinned user gets their own server-rendered home.
export const revalidate = 60

export const metadata: Metadata = {
  title: 'PlantsPack — Vegan Places, Recipes & City Rankings Worldwide',
  description: '37,000+ vegan restaurants, shops, and stays across 170+ countries. Compare 1,000+ cities by vegan-friendliness, browse 580+ recipes, and post reviews. Free, ad-free.',
  alternates: { canonical: 'https://plantspack.com' },
}

async function getTopCities() {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://plantspack.com'
    const res = await fetch(`${baseUrl}/api/scores`, { next: { revalidate: 3600 } })
    if (!res.ok) return []
    const data = await res.json()
    return data.scores?.slice(0, 8) || []
  } catch {
    return []
  }
}

/**
 * Featured Places — 12 top-rated places with full content. Rendered SSR as
 * plain <Link> elements right below HomeClient so Googlebot sees direct
 * internal links from the homepage to deep /place/[slug] pages without
 * executing JS. Shrinks crawl-depth from 4 clicks → 2 clicks for these
 * pages, which addresses the "Discovered but not indexed" bucket in GSC.
 */
async function getFeaturedPlaces() {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('places')
    .select('slug, name, city, country, average_rating, review_count, main_image_url, images, category, vegan_level')
    .is('archived_at', null)
    .not('slug', 'is', null)
    .not('description', 'is', null)
    .gte('review_count', 1)
    .gte('average_rating', 4.0)
    .order('review_count', { ascending: false })
    .order('average_rating', { ascending: false })
    .limit(12)
  return data || []
}

/**
 * Fetch the logged-in user's followed cities with live scores + deltas,
 * server-side. Replaces the old /api/cities/followed round-trip from the
 * client MyCities component — now the cards render in the initial HTML,
 * removing the skeleton flash and a whole JS-waterfall roundtrip for
 * signed-in users.
 *
 * Returns [] for non-logged-in users (the MyCities section only matters
 * when there's a session anyway).
 */
async function getFollowedCities(): Promise<FollowedCity[]> {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []

    const { data: followed } = await supabase
      .from('user_followed_cities')
      .select('city, country, last_seen_score')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (!followed || followed.length === 0) return []

    const admin = createAdminClient()
    const { data: scores } = await admin
      .from('city_scores')
      .select('city, country, score, grade, place_count, fv_count')
      .in('city', followed.map((f: any) => f.city))
      .in('country', followed.map((f: any) => f.country))

    const scoreMap: Record<string, any> = {}
    for (const s of (scores || [])) scoreMap[`${s.city}|||${s.country}`] = s

    // Keep in sync with GRADE_THRESHOLDS in src/lib/score-utils.ts + the
    // CASE in supabase/migrations/20260423210000_subgrades.sql.
    const gradeThresholds = [
      { grade: 'A+', min: 88 },
      { grade: 'A', min: 78 },
      { grade: 'B+', min: 70 },
      { grade: 'B', min: 62 },
      { grade: 'C+', min: 54 },
      { grade: 'C', min: 45 },
      { grade: 'D+', min: 37 },
      { grade: 'D', min: 30 },
    ]

    return followed.map((f: any): FollowedCity => {
      const s = scoreMap[`${f.city}|||${f.country}`]
      const currentScore = s?.score ?? 0
      const currentGrade = s?.grade ?? 'F'
      const delta = f.last_seen_score != null ? currentScore - f.last_seen_score : null
      let nextGrade: string | null = null
      let pointsToNext: number | null = null
      for (const t of gradeThresholds) {
        if (currentScore < t.min) { nextGrade = t.grade; pointsToNext = t.min - currentScore }
      }
      return {
        city: f.city,
        country: f.country,
        currentScore,
        currentGrade,
        delta,
        nextGrade,
        pointsToNext,
        placeCount: s?.place_count ?? 0,
        fvCount: s?.fv_count ?? 0,
      }
    })
  } catch (err) {
    console.error('[page] getFollowedCities error:', err)
    return []
  }
}

async function getRecentPosts() {
  const supabase = createAdminClient()
  const ADMIN_ID = 'd27f7c5e-2053-4c0c-8fd1-27ee3269ad1c'
  const { data } = await supabase
    .from('posts')
    .select(`
      id, title, content, category, images, image_url, created_at, slug, is_pinned,
      users!inner(username, first_name, avatar_url),
      post_reactions(id),
      comments(id)
    `)
    .eq('privacy', 'public')
    .is('deleted_at', null)
    .or(`user_id.neq.${ADMIN_ID},category.not.in.(recipe,event)`)
    // Pinned posts (admin announcements) float to the top
    .order('is_pinned', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })
    .limit(8)
  return data || []
}

/**
 * Recent place reviews for the homepage sidebar feed. Mixed with recent posts
 * and sorted by created_at so the sidebar reflects all community activity, not
 * just posts. Reviews are read-only items here — the link goes to the place.
 */
async function getRecentReviews() {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('place_reviews')
    .select(`
      id, user_id, place_id, rating, content, images, created_at,
      users!inner(username, first_name, avatar_url),
      place:place_id(name, slug, city, country, main_image_url, images, category, vegan_level),
      place_review_reactions(id)
    `)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(8)
  return data || []
}

function getCityImages(): Record<string, string> {
  try {
    return JSON.parse(readFileSync(join(process.cwd(), 'public/data/city-images.json'), 'utf-8'))
  } catch {
    return {}
  }
}

async function getInitialLocationData() {
  // Pull location hints from cookies set by the client (HomeClient syncs them
  // from localStorage on mount — pinned city takes priority over geolocation).
  // If anything's there, SSR the nearby-places payload so pinned users don't
  // see the search-bar flash on first paint.
  try {
    const c = await cookies()
    const pinnedCity = c.get('pp_pinned_city')?.value
    const pinnedCountry = c.get('pp_pinned_country')?.value
    const geoLat = c.get('pp_user_lat')?.value
    const geoLng = c.get('pp_user_lng')?.value
    const geoCity = c.get('pp_user_city')?.value
    const geoCountry = c.get('pp_user_country')?.value

    const params = new URLSearchParams()
    if (pinnedCity) {
      params.set('city', pinnedCity)
      if (pinnedCountry) params.set('country', pinnedCountry)
    } else if (geoLat || geoCity) {
      if (geoLat) params.set('lat', geoLat)
      if (geoLng) params.set('lng', geoLng)
      if (geoCity) params.set('city', geoCity)
      if (geoCountry) params.set('country', geoCountry)
    } else {
      return null
    }

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://plantspack.com'
    const res = await fetch(`${baseUrl}/api/home?${params.toString()}`, { cache: 'no-store' })
    if (!res.ok) return null
    const data = await res.json()
    return {
      data,
      city: pinnedCity || geoCity || '',
      country: pinnedCountry || geoCountry || '',
    }
  } catch {
    return null
  }
}

export default async function Home() {
  const [topCities, recentPosts, recentReviews, initialLocation, featuredPlaces, followedCities] = await Promise.all([
    getTopCities(),
    getRecentPosts(),
    getRecentReviews(),
    getInitialLocationData(),
    getFeaturedPlaces(),
    getFollowedCities(),
  ])

  const cityImages = getCityImages()

  // Normalize users from array (Supabase join) to single object
  const normalizedPosts = recentPosts.map((p: any) => ({
    ...p,
    users: Array.isArray(p.users) ? p.users[0] : p.users,
  }))
  const normalizedReviews = recentReviews.map((r: any) => ({
    ...r,
    users: Array.isArray(r.users) ? r.users[0] : r.users,
    place: Array.isArray(r.place) ? r.place[0] : r.place,
  }))

  // Build a unified activity list: posts + reviews mixed by created_at desc.
  // Pinned posts always lead so admin announcements stay visible.
  type ActivityItem =
    | { type: 'post'; created_at: string; data: any }
    | { type: 'review'; created_at: string; data: any }
  const activityItems: ActivityItem[] = [
    ...normalizedPosts.map((p: any) => ({ type: 'post' as const, created_at: p.created_at, data: p })),
    ...normalizedReviews.map((r: any) => ({ type: 'review' as const, created_at: r.created_at, data: r })),
  ]
  activityItems.sort((a, b) => {
    // Pinned posts come first
    const aPinned = a.type === 'post' && a.data.is_pinned ? 1 : 0
    const bPinned = b.type === 'post' && b.data.is_pinned ? 1 : 0
    if (aPinned !== bPinned) return bPinned - aPinned
    return a.created_at < b.created_at ? 1 : -1
  })
  const sidebarActivity = activityItems.slice(0, 8)

  // Filter out the currently pinned city — it's already in the hero banner.
  const c = await cookies()
  const pinnedCity = c.get('pp_pinned_city')?.value
  const pinnedCountry = c.get('pp_pinned_country')?.value
  const displayedFollowedCities = followedCities.filter(
    fc => !(fc.city === pinnedCity && fc.country === pinnedCountry),
  )

  return (
    <>
      {/* SSR h1 for SEO crawlers that don't execute JS */}
      <h1 className="sr-only">PlantsPack — Find Vegan Places, Recipes & City Rankings Worldwide</h1>
      <HomeClient
        topCities={topCities}
        recentPosts={normalizedPosts}
        recentActivity={sidebarActivity}
        cityImages={cityImages}
        initialLocation={initialLocation}
        followedCities={displayedFollowedCities}
      />

      {/* Featured Places — SSR plain-HTML links, visible to Googlebot without JS.
          Purpose is purely to shorten the click-depth from home → place pages
          (previously 4 clicks via country → city → list → place). */}
      {featuredPlaces.length > 0 && (
        <section className="max-w-6xl mx-auto px-4 md:px-8 py-10 border-t border-outline-variant/10">
          <h2 className="text-xl font-semibold text-on-surface mb-4">Featured vegan places</h2>
          <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {featuredPlaces.map((p: any) => {
              const countrySlug = p.country ? slugifyCityOrCountry(p.country) : ''
              const citySlug = p.city ? slugifyCityOrCountry(p.city) : ''
              const image = p.main_image_url || p.images?.[0] || null
              return (
                <li key={p.slug} className="bg-surface-container-lowest rounded-xl ghost-border overflow-hidden hover:border-primary/30 transition-all">
                  <Link href={`/place/${p.slug}`} className="block">
                    <PlaceImage
                      src={image}
                      alt={p.name}
                      category={p.category}
                      className="w-full h-28 object-cover"
                    />
                    <div className="p-3">
                      <p className="font-medium text-sm text-on-surface truncate">{p.name}</p>
                      <p className="text-xs text-on-surface-variant truncate mt-0.5">
                        {p.city && citySlug && countrySlug ? (
                          <Link
                            href={`/vegan-places/${countrySlug}/${citySlug}`}
                            className="hover:text-primary"
                          >
                            {p.city}
                          </Link>
                        ) : (
                          p.city
                        )}
                        {p.country ? `, ${p.country}` : ''}
                      </p>
                      <p className="text-[11px] text-on-surface-variant mt-0.5">
                        {VEGAN_LEVEL_LABEL[p.vegan_level ?? ''] ?? 'Vegan-Friendly'}
                        {p.average_rating ? ` · ★ ${Number(p.average_rating).toFixed(1)}` : ''}
                      </p>
                    </div>
                  </Link>
                </li>
              )
            })}
          </ul>
          <p className="text-xs text-on-surface-variant mt-4">
            <Link href="/vegan-places" className="text-primary hover:underline">
              Browse all vegan places →
            </Link>
          </p>
        </section>
      )}
    </>
  )
}
