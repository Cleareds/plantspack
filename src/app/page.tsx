import { Metadata } from 'next'
import Link from 'next/link'
import { readFileSync } from 'fs'
import { join } from 'path'
import { cookies } from 'next/headers'
import { createAdminClient } from '@/lib/supabase-admin'
import { createClient as createServerClient } from '@/lib/supabase-server'
import HomeClient from '@/components/home/HomeClient'
import PlaceImage from '@/components/places/PlaceImage'
import SmartImg from '@/components/ui/SmartImg'
import { VEGAN_LEVEL_LABEL } from '@/lib/vegan-level'
import { Barcode, UtensilsCrossed, ChefHat } from 'lucide-react'

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
// May 2026: bumped 300 -> 1800 to cut Vercel Function Invocations on the
// hottest path. On-demand revalidatePath('/') is already wired into the
// add/edit/delete mutation APIs so fresh content still appears immediately.
export const revalidate = 1800

export const metadata: Metadata = {
  title: 'PlantsPack: Free Vegan Tools, Places & Travel Guides',
  description: 'Free vegan barcode scanner, baking calculator, menu translator and drinks lookup, plus 50,000+ verified plant-based places in 160+ countries. Ad-free, no tracking, community-built.',
  alternates: { canonical: 'https://www.plantspack.com' },
  openGraph: {
    title: 'PlantsPack: Free Vegan Tools, Places & Travel Guides',
    description: 'Free vegan barcode scanner, baking calculator, menu translator, and 50,000+ verified plant-based places worldwide. Ad-free, no tracking.',
    type: 'website',
    siteName: 'PlantsPack',
    url: 'https://www.plantspack.com',
    images: [
      {
        url: 'https://www.plantspack.com/og-default.png',
        width: 1200,
        height: 630,
        alt: 'PlantsPack: free vegan tools and verified plant-based places worldwide',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'PlantsPack: Free Vegan Tools & Verified Plant-Based Places',
    description: 'Free vegan barcode scanner, baking calculator, menu translator, drinks lookup, and 50,000+ verified places in 160+ countries. Ad-free.',
    images: ['https://www.plantspack.com/og-default.png'],
  },
}

// Top cities are also returned by /api/home (which we always call now), so
// we no longer need a separate /api/scores round-trip from the homepage.
// Kept the function as a thin shim returning what /api/home gave us, so the
// rest of the page is unchanged.
function getTopCitiesFromHome(initData: any): any[] {
  return initData?.data?.topCities ?? []
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
    .limit(24)
  // Restrict featured cards to places whose main image is already rehosted
  // to Supabase. External images (restaurant websites etc.) bypass
  // Next/Image optimization and get flagged in PageSpeed for
  // "Serve images in modern formats / Increase compression" — they're
  // typically 100-150 KB unoptimized JPGs. Limiting to Supabase URLs
  // also lets the existing place-image rehost pipeline graduate places
  // into the carousel as it processes them.
  const onSupabase = (data || []).filter((p: any) => {
    const src = p.main_image_url || p.images?.[0] || ''
    return typeof src === 'string' && src.includes('supabase.co')
  })
  return onSupabase.slice(0, 12)
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
      id, title, content, category, secondary_tags, recipe_data, event_data, product_data,
      images, image_url, created_at, slug, is_pinned,
      users!inner(username, first_name, avatar_url),
      post_reactions(count),
      comments(count)
    `)
    .eq('privacy', 'public')
    .is('deleted_at', null)
    .or(`user_id.neq.${ADMIN_ID},category.not.in.(recipe,event)`)
    // Pinned posts (admin announcements) float to the top
    .order('is_pinned', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })
    .limit(8)
  // PostgREST returns aggregates as [{ count: N }]. Re-shape to the
  // length-N array the client component expects so we can swap the
  // payload without touching HomeClient.
  return (data || []).map((p: any) => ({
    ...p,
    post_reactions: Array(p.post_reactions?.[0]?.count ?? 0).fill({ id: '' }),
    comments: Array(p.comments?.[0]?.count ?? 0).fill({ id: '' }),
  }))
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
      place_review_reactions(count)
    `)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(8)
  return (data || []).map((r: any) => ({
    ...r,
    place_review_reactions: Array(r.place_review_reactions?.[0]?.count ?? 0).fill({ id: '' }),
  }))
}

function getCityImages(): Record<string, string> {
  try {
    return JSON.parse(readFileSync(join(process.cwd(), 'public/data/city-images.json'), 'utf-8'))
  } catch {
    return {}
  }
}

async function getInitialLocationData(isSignedIn: boolean) {
  // Path A (2026-05-07): location-based blocks are gated behind sign-in.
  // For anonymous visitors we skip all location params and fetch only the
  // cookieless `/api/home` payload (hero stats + top cities). This:
  //   - Eliminates the CLS=0.46 caused by the client geolocation poll
  //     injecting a city-hero block 1-3s after first paint.
  //   - Removes a /api/home round-trip from the anon hot path.
  //   - Makes the SSR page identical for every anon visitor (and Googlebot),
  //     improving cache hit rate on Vercel.
  //
  // For signed-in users we still honour pinned/geo cookies and SSR the
  // personalised payload — they explicitly opted into the personalised
  // home and can have their saved city render server-side without shift.
  try {
    const c = await cookies()
    const params = new URLSearchParams()
    let pinnedCity: string | undefined
    let pinnedCountry: string | undefined
    let geoCity: string | undefined
    let geoCountry: string | undefined

    if (isSignedIn) {
      pinnedCity = c.get('pp_pinned_city')?.value
      pinnedCountry = c.get('pp_pinned_country')?.value
      const geoLat = c.get('pp_user_lat')?.value
      const geoLng = c.get('pp_user_lng')?.value
      geoCity = c.get('pp_user_city')?.value
      geoCountry = c.get('pp_user_country')?.value
      if (pinnedCity) {
        params.set('city', pinnedCity)
        if (pinnedCountry) params.set('country', pinnedCountry)
      } else if (geoLat || geoCity) {
        if (geoLat) params.set('lat', geoLat)
        if (geoLng) params.set('lng', geoLng)
        if (geoCity) params.set('city', geoCity)
        if (geoCountry) params.set('country', geoCountry)
      }
    }

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.plantspack.com'
    const hasParams = params.toString().length > 0
    const url = hasParams ? `${baseUrl}/api/home?${params.toString()}` : `${baseUrl}/api/home`
    const res = await fetch(url, hasParams ? { cache: 'no-store' } : { next: { revalidate: 300 } })
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
  // Resolve auth state once so we can branch the location-aware fetch and
  // pass an explicit isSignedIn flag to the client (avoids hydration drift
  // when the client useAuth resolves on a different schedule than SSR).
  const supabase = await createServerClient()
  const { data: { user: sessionUser } } = await supabase.auth.getUser()
  const isSignedIn = !!sessionUser

  const [recentPosts, recentReviews, initialLocation, featuredPlaces, followedCities] = await Promise.all([
    getRecentPosts(),
    getRecentReviews(),
    getInitialLocationData(isSignedIn),
    getFeaturedPlaces(),
    getFollowedCities(),
  ])
  const topCities = getTopCitiesFromHome(initialLocation)

  // Only ship images for cities actually rendered on the homepage.
  // The full city-images.json is ~1800 entries; serializing it into the
  // HomeClient prop bloats the SSR HTML by ~250KB and triggers Lighthouse
  // "total network data" warnings. Filter to the union of: top cities,
  // initial location, and followed cities — typically ~8-15 entries.
  const allCityImages = getCityImages()
  const neededKeys = new Set<string>()
  for (const tc of topCities) neededKeys.add(`${tc.city}|||${tc.country}`)
  if (initialLocation?.city && initialLocation?.country) {
    neededKeys.add(`${initialLocation.city}|||${initialLocation.country}`)
  }
  for (const fc of followedCities) neededKeys.add(`${fc.city}|||${fc.country}`)
  const cityImages: Record<string, string> = {}
  for (const key of neededKeys) {
    if (allCityImages[key]) cityImages[key] = allCityImages[key]
  }

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
      <h1 className="sr-only">PlantsPack — Vegan Places &amp; City Rankings Worldwide</h1>
      <HomeClient
        topCities={topCities}
        recentPosts={normalizedPosts}
        recentActivity={sidebarActivity}
        cityImages={cityImages}
        initialLocation={initialLocation}
        followedCities={displayedFollowedCities}
        isSignedIn={isSignedIn}
      />

      {/* Seasonal: Summer Destinations hub link. Renders May-September
          only, comes off automatically when the season ends so the
          homepage doesn't carry a stale travel banner in winter. */}
      {(() => {
        const m = new Date().getUTCMonth() // 0=Jan
        const inSeason = m >= 4 && m <= 8 // May..September
        if (!inSeason) return null
        return (
          <section className="max-w-6xl mx-auto px-4 md:px-8 pt-6">
            <Link
              href="/vegan-summer-destinations"
              prefetch={false}
              className="block rounded-2xl border-2 border-primary/30 bg-primary/5 px-5 py-4 hover:bg-primary/10 transition-colors"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-widest text-primary font-bold mb-1">Summer 2026 · Mediterranean</p>
                  <p className="font-semibold text-on-surface">Plan your vegan summer — 29 destinations</p>
                  <p className="text-xs text-on-surface-variant mt-0.5">Italy, Spain, Greece, Portugal, Croatia, Turkey. Every destination has 5+ verified places.</p>
                </div>
                <span className="text-primary text-lg shrink-0">→</span>
              </div>
            </Link>
          </section>
        )
      })()}

      {/* Tools strip — three highest-utility tools as a pinned row. Homepage
          is the most-trafficked entry point; surfacing tools here is the
          highest-leverage place to convert "I came to find a place" visitors
          into tool users (and supporters, eventually). Pure server-rendered
          links so Googlebot sees them in initial HTML. */}
      <section className="max-w-6xl mx-auto px-4 md:px-8 py-10 border-t border-outline-variant/10">
        <div className="flex items-baseline justify-between mb-4 gap-3 flex-wrap">
          <h2 className="text-xl font-semibold text-on-surface">Free vegan tools</h2>
          <Link href="/tools" prefetch={false} className="text-sm text-primary hover:underline">
            All tools →
          </Link>
        </div>
        <ul className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <li>
            <Link
              href="/tools/barcode"
              prefetch={false}
              className="block h-full p-5 rounded-2xl ghost-border bg-surface-container-lowest hover:border-primary/30 transition"
            >
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <Barcode className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-on-surface mb-1">Barcode scanner</p>
                  <p className="text-sm text-on-surface-variant leading-relaxed">
                    Point your camera at any product. We check Open Food Facts and flag what&apos;s not vegan. Free, unlimited.
                  </p>
                </div>
              </div>
            </Link>
          </li>
          <li>
            <Link
              href="/tools/menu-scanner"
              prefetch={false}
              className="block h-full p-5 rounded-2xl ghost-border bg-surface-container-lowest hover:border-primary/30 transition"
            >
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <UtensilsCrossed className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-on-surface mb-1">Menu scanner</p>
                  <p className="text-sm text-on-surface-variant leading-relaxed">
                    Photo of a restaurant menu in any language. We highlight what&apos;s vegan and suggest swaps for the rest.
                  </p>
                </div>
              </div>
            </Link>
          </li>
          <li>
            <Link
              href="/tools/baking"
              prefetch={false}
              className="block h-full p-5 rounded-2xl ghost-border bg-surface-container-lowest hover:border-primary/30 transition"
            >
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <ChefHat className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-on-surface mb-1">Baking calculator</p>
                  <p className="text-sm text-on-surface-variant leading-relaxed">
                    Type how much egg, butter, or milk your recipe needs - get exact plant replacement amounts.
                  </p>
                </div>
              </div>
            </Link>
          </li>
        </ul>
      </section>

      {/* Featured Places — SSR plain-HTML links, visible to Googlebot without JS.
          Purpose is purely to shorten the click-depth from home → place pages
          (previously 4 clicks via country → city → list → place). */}
      {featuredPlaces.length > 0 && (
        <section className="max-w-6xl mx-auto px-4 md:px-8 py-10 border-t border-outline-variant/10">
          <h2 className="text-xl font-semibold text-on-surface mb-4">Featured vegan places</h2>
          <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {featuredPlaces.map((p: any) => {
              const image = p.main_image_url || p.images?.[0] || null
              return (
                <li key={p.slug} className="bg-surface-container-lowest rounded-xl ghost-border overflow-hidden hover:border-primary/30 transition-all">
                  <Link href={`/place/${p.slug}`} prefetch={false} className="block">
                    {image ? (
                      <SmartImg
                        src={image}
                        alt={`${p.name}${p.city ? ` — vegan ${(p.category === 'eat' ? 'restaurant' : p.category)} in ${p.city}` : ''}`}
                        width={300}
                        height={112}
                        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 300px"
                        quality={55}
                        className="w-full h-28 object-cover"
                      />
                    ) : (
                      <PlaceImage
                        src={null}
                        alt={`${p.name}${p.city ? ` — vegan ${(p.category === 'eat' ? 'restaurant' : p.category)} in ${p.city}` : ''}`}
                        category={p.category}
                        className="w-full h-28 object-cover"
                      />
                    )}
                    <div className="p-3">
                      <p className="font-medium text-sm text-on-surface truncate">{p.name}</p>
                      <p className="text-xs text-on-surface-variant truncate mt-0.5">
                        {p.city}{p.country ? `, ${p.country}` : ''}
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
