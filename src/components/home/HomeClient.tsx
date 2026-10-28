'use client'

import { useState, useEffect, useLayoutEffect } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { MapPin, Plus, TrendingUp, TrendingDown, Star, Heart, MessageCircle, Share2, Pin, BookOpen, Sparkles } from 'lucide-react'
import SearchBar from '@/components/search/SearchBar'
// Heavy modals — only loaded when the user opens them. Previously these were
// statically imported and pulled ImageUploader, VideoUploader, LinkPreview,
// MentionAutocomplete, LocationPicker, AddressSearch, geocodingService into
// the home bundle whether the user ever clicked "Create Post" / "Add Place" or not.
const AddPlaceModal   = dynamic(() => import('@/components/places/AddPlaceModal'),  { ssr: false })
import { useVeganFilter } from '@/lib/vegan-filter-context'
import RatingBadge from '@/components/places/RatingBadge'
import { useAuth } from "@/lib/auth"
import { supabase } from '@/lib/supabase'
// getGradeColor + getScoreBarColor are defined locally below.
import PlaceImage from '@/components/places/PlaceImage'
import SmartImg from '@/components/ui/SmartImg'
import { syncLocationCookiesFromLocalStorage, clearPinnedLocationCookies } from '@/lib/location-cookies'
import type { NearbyEvents } from '@/lib/nearby-events'
import { slugifyCityOrCountry } from '@/lib/places/slugify'
import { getCityImage } from '@/lib/city-images'
// Raw localStorage access throws SecurityError (DOMException 18) on Mobile
// Safari with "Prevent Cross-Site Tracking"/Private mode — safeStorage wraps
// every access in try/catch so it degrades to "no persistence" instead.
import { safeStorage } from '@/lib/safe-storage'

interface NearbyPlace {
  id: string; name: string; slug: string; category: string
  vegan_level: string; main_image_url: string | null; images: string[]
  city: string; country: string
  average_rating: number | null
  review_count: number | null
  distance?: number
}
interface CityScoreData {
  city: string; country: string; score: number; grade: string; fvCount: number; placeCount: number
}
interface CompactPost {
  id: string; title: string | null; content: string; category: string
  images: string[]; image_url: string | null; created_at: string; slug: string | null
  is_pinned: boolean | null
  users: { username: string; first_name: string | null; avatar_url: string | null }
  post_reactions: { id: string }[]; comments: { id: string }[]
}
interface CompactReview {
  id: string; user_id: string; place_id: string; rating: number; content: string
  images: string[] | null; created_at: string
  users: { username: string; first_name: string | null; avatar_url: string | null }
  place: {
    name: string; slug: string | null; city: string | null; country: string | null
    main_image_url: string | null; images: string[] | null; category: string | null; vegan_level: string | null
  } | null
  place_review_reactions: { id: string }[]
}
type ActivityItem =
  | { type: 'post'; created_at: string; data: CompactPost }
  | { type: 'review'; created_at: string; data: CompactReview }

const CATEGORY_LABEL: Record<string, string> = { eat: 'Restaurant', hotel: 'Stay', store: 'Store', organisation: 'Animal Sanctuary', event: 'Event' }
const CATEGORY_EMOJI: Record<string, string> = { eat: '🌿', hotel: '🛏️', store: '🛍️', organisation: '🐾', event: '🎉' }

function getGradeColor(g: string) { return g.startsWith('A') ? 'text-emerald-500' : g === 'B' ? 'text-green-500' : g === 'C' ? 'text-yellow-500' : g === 'D' ? 'text-orange-500' : 'text-red-500' }
function getScoreBarColor(s: number) { return s >= 80 ? 'bg-emerald-500' : s >= 65 ? 'bg-green-500' : s >= 50 ? 'bg-yellow-500' : s >= 35 ? 'bg-orange-500' : 'bg-red-500' }
function timeAgo(d: string) { const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000); return m < 60 ? `${m}m` : m < 1440 ? `${Math.floor(m/60)}h` : m < 43200 ? `${Math.floor(m/1440)}d` : `${Math.floor(m/43200)}mo` }

interface InitialLocation {
  data: any
  city: string
  country: string
}

export interface FollowedCitySummary {
  city: string
  country: string
  currentScore: number
  currentGrade: string
  delta: number | null
  nextGrade: string | null
  pointsToNext: number | null
  placeCount: number
  fvCount: number
  newPlaces?: number
}

interface Props {
  topCities: CityScoreData[]
  recentPosts?: CompactPost[]
  recentActivity?: ActivityItem[]
  cityImages?: Record<string, string>
  initialLocation?: InitialLocation | null
  followedCities?: FollowedCitySummary[]
  /**
   * SSR-derived auth flag. Path A (2026-05-07) gates location-aware blocks
   * behind sign-in to eliminate the CLS=0.46 caused by the client geo
   * poll injecting a city-hero block 1-3s after first paint. Anonymous
   * visitors (and Googlebot) get a fully static home; signed-in users
   * still get the personalised payload.
   */
  isSignedIn?: boolean
  /** Upcoming events near the visitor, resolved on the server (null = hide the block). */
  nearbyEvents?: NearbyEvents | null
  /** Dish-page links, resolved on the server (city-specific when the visitor's city has 3+). */
  dishChips?: { label: string; city: string; href: string }[]
  dishChipsCity?: string | null
}

function HomeContent({ topCities, recentPosts, recentActivity, cityImages: serverCityImages = {}, initialLocation, followedCities = [], isSignedIn = false, nearbyEvents = null, dishChips = [], dishChipsCity = null }: Props) {
  const router = useRouter()
  const [isAddPlaceOpen, setIsAddPlaceOpen] = useState(false)
  const { user, profile } = useAuth()

  // Seed from server-rendered initialLocation (pinned or known city) so the
  // first paint is already the right city — no search-bar flash.
  const initData = initialLocation?.data
  const [nearbyPlaces, setNearbyPlaces] = useState<NearbyPlace[]>(initData?.nearbyPlaces || [])
  const [nearbySanctuaries, setNearbySanctuaries] = useState<NearbyPlace[]>(initData?.nearbySanctuaries || [])
  const [nearbyStays, setNearbyStays] = useState<NearbyPlace[]>(initData?.nearbyStays || [])
  const [cityScore, setCityScore] = useState<CityScoreData | null>(initData?.userCityScore || null)
  // Count of places in the user's city when it's below the scoring threshold
  // (≥5 places to appear in city_scores). Lets the UI say "Aubel has 1 place
  // so far — add 4 more to unlock its vegan score" instead of the misleading
  // "be the first to add a place" fallback.
  const [cityPlaceCount, setCityPlaceCount] = useState<number | null>(initData?.userCityPlaceCount ?? null)
  // Fall back to nearbyPlaces[0] when SSR gave us nearby results but the
  // user's closest city isn't in the city-scores view (e.g. tiny villages
  // below the ≥5-places threshold). Without this, userCity stays empty and
  // the search-bar branch shows permanently even though we know the city.
  const [userCity, setUserCity] = useState(
    initialLocation?.city
    || initData?.userCityScore?.city
    || initData?.nearbyPlaces?.[0]?.city
    || ''
  )
  const [userCountry, setUserCountry] = useState(
    initialLocation?.country
    || initData?.userCityScore?.country
    || initData?.nearbyPlaces?.[0]?.country
    || ''
  )
  const [cityImageUrl, setCityImageUrl] = useState<string | null>(
    (initialLocation && getCityImage(serverCityImages, initData?.userCityScore?.city || initialLocation.city, initData?.userCityScore?.country || initialLocation.country)) || null
  )
  const [cityImageFailed, setCityImageFailed] = useState(false)

  // `/?create=true` used to open the create-post modal. The homepage no
  // longer has a posts feed (2026-10-16); send the deep link to /feed instead.
  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    if (params.get('create') === 'true' && user) router.replace('/feed')
  }, [user, router])

  // Mirror "is this city pinned?" into state so JSX render doesn't touch
  // localStorage (which breaks SSR with "localStorage is not defined").
  const [isPinned, setIsPinned] = useState(false)

  // Hero hydration fix: if SSR didn't have cookies (private tab, cleared
  // cookies, or a user whose pin predates the cookie-sync fix), seed
  // userCity from localStorage BEFORE the first paint via useLayoutEffect.
  // This eliminates the "Hello, Anton! / Search cities..." flash for users
  // who have a pinned city — they see their city immediately.
  useLayoutEffect(() => {
    if (typeof window === 'undefined') return
    setIsPinned(!!safeStorage.local.get('pinned_city_name'))
    if (userCity) return
    try {
      const pinnedCity = safeStorage.local.get('pinned_city_name')
      const pinnedCountry = safeStorage.local.get('pinned_country_name')
      if (pinnedCity) {
        setUserCity(pinnedCity)
        if (pinnedCountry) setUserCountry(pinnedCountry)
        return
      }
      const geoCity = safeStorage.local.get('user_city')
      const geoCountry = safeStorage.local.get('user_country')
      if (geoCity) {
        setUserCity(geoCity)
        if (geoCountry) setUserCountry(geoCountry)
        return
      }
      // Last resort: if SSR fetched nearby places via lat/lng but the user
      // has no city in localStorage (e.g. never re-geocoded), fall back to
      // the nearest place's city. Caches it to localStorage so subsequent
      // visits don't need the SSR round-trip.
      const fallbackCity = initData?.nearbyPlaces?.[0]?.city
      const fallbackCountry = initData?.nearbyPlaces?.[0]?.country
      if (fallbackCity) {
        setUserCity(fallbackCity)
        setUserCountry(fallbackCountry || '')
        safeStorage.local.set('user_city', fallbackCity)
        if (fallbackCountry) safeStorage.local.set('user_country', fallbackCountry)
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const [stats, setStats] = useState<{ totalPlaces: number; fullyVegan: number; restaurants: number; stores: number; stays: number; sanctuaries: number; countries: number; cities: number; citiesRanked?: number } | null>(initData?.stats || null)

  // Load location-aware data with localStorage caching.
  // If server already rendered initialLocation, skip the initial loading
  // state so the user never sees a flash.
  const [locationLoading, setLocationLoading] = useState(!initialLocation)

  // Sync localStorage-driven location values to cookies so the next SSR hit
  // can render the home page with the right city upfront. This covers the
  // first-ever visit and cross-tab changes; same-tab pin/unpin actions MUST
  // update cookies directly via @/lib/location-cookies (see PinCityButton).
  useEffect(() => {
    syncLocationCookiesFromLocalStorage()
    const onStorage = () => syncLocationCookiesFromLocalStorage()
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  useEffect(() => {
    // Path A: only signed-in users opt into the personalised home. Anon
    // visitors get the static SSR payload — no geo poll, no /api/home
    // refetch, no late-arriving city-hero block to shift the layout.
    if (!isSignedIn) {
      setLocationLoading(false)
      return
    }
    const CACHE_KEY = 'plantspack_home_cache'
    const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

    // Server already gave us a location-aware payload — skip the client
    // refetch on mount. Storage events will still refresh if the user
    // pins a new city or geo changes.
    if (initialLocation) {
      setLocationLoading(false)
      try {
        safeStorage.local.set(CACHE_KEY, JSON.stringify({
          data: initialLocation.data,
          city: initialLocation.city,
          country: initialLocation.country,
          ts: Date.now(),
        }))
      } catch {}
      return
    }

    function applyData(data: any, city: string, country: string) {
      setCityScore(data.userCityScore)
      setCityPlaceCount(data.userCityPlaceCount ?? null)
      if (data.stats) setStats(data.stats)
      setNearbyPlaces(data.nearbyPlaces || [])
      setNearbySanctuaries(data.nearbySanctuaries || [])
      setNearbyStays(data.nearbyStays || [])
      if (data.userCityScore) { setUserCity(data.userCityScore.city); setUserCountry(data.userCityScore.country) }
      else if (data.nearbyPlaces?.[0]) { setUserCity(data.nearbyPlaces[0].city); setUserCountry(data.nearbyPlaces[0].country) }
      else if (city) { setUserCity(city); setUserCountry(country) }
      const imgUrl = getCityImage(serverCityImages, data.userCityScore?.city || city, data.userCityScore?.country || country) || null
      if (imgUrl) setCityImageUrl(imgUrl)
    }

    // Try cached data first — instant render
    try {
      const cached = JSON.parse(safeStorage.local.get(CACHE_KEY) || 'null')
      if (cached && Date.now() - cached.ts < CACHE_TTL) {
        applyData(cached.data, cached.city, cached.country)
        setLocationLoading(false)
        return // Cache hit — done
      }
    } catch {}

    async function load() {
      // Check if a city is pinned — overrides geolocation
      const pinnedCity = safeStorage.local.get('pinned_city_name') || ''
      const pinnedCountry = safeStorage.local.get('pinned_country_name') || ''

      let lat = '', lng = '', city = '', country = ''
      if (pinnedCity) {
        // Pinned city — skip geolocation entirely, use pinned data directly
        city = pinnedCity
        country = pinnedCountry
      } else {
        // Check localStorage for geo data (persists across tabs/reloads)
        lat = safeStorage.local.get('user_lat') || ''
        lng = safeStorage.local.get('user_lng') || ''
        city = safeStorage.local.get('user_city') || ''
        country = safeStorage.local.get('user_country') || ''

        // If no cached geo, poll briefly for AppShell to set it
        if (!lat && !city) {
          for (let i = 0; i < 10; i++) {
            lat = safeStorage.local.get('user_lat') || ''
            lng = safeStorage.local.get('user_lng') || ''
            city = safeStorage.local.get('user_city') || ''
            country = safeStorage.local.get('user_country') || ''
            if (lat || city) break
            await new Promise(r => setTimeout(r, 300))
          }
        }
      }

      const params = new URLSearchParams()
      if (lat) params.set('lat', lat)
      if (lng) params.set('lng', lng)
      if (city) params.set('city', city)
      if (country) params.set('country', country)

      try {
        const res = await fetch(`/api/home?${params}`)
        const data = await res.json()
        applyData(data, city, country)
        // Cache the response
        safeStorage.local.set(CACHE_KEY, JSON.stringify({ data, city, country, ts: Date.now() }))
      } catch {}

      setLocationLoading(false)
    }
    load()
  }, [initialLocation, isSignedIn])

  const { isFullyVeganOnly } = useVeganFilter()
  const [showCitySearch, setShowCitySearch] = useState(false)
  const [userContributions, setUserContributions] = useState<number | null>(null)

  // Load user contribution count
  useEffect(() => {
    if (!user) return
    supabase.from('places').select('id', { count: 'exact', head: true }).eq('created_by', user.id)
      .then(({ count }) => setUserContributions(count || 0))
  }, [user])

  // Filter nearby places based on global vegan toggle
  const filteredNearby = isFullyVeganOnly ? nearbyPlaces.filter(p => p.vegan_level === 'fully_vegan') : nearbyPlaces
  const filteredSanctuaries = nearbySanctuaries // sanctuaries are always fully vegan
  const filteredStays = isFullyVeganOnly ? nearbyStays.filter(p => p.vegan_level === 'fully_vegan') : nearbyStays

  return (
    <div className="min-h-screen bg-surface">
      <div className="max-w-6xl mx-auto px-4 md:px-8 pt-2 pb-6">
        <div className="xl:flex xl:gap-6">
          <div className="flex-1 min-w-0 space-y-6">
            {/* Value prop. Gated on isSignedIn (server-resolved) rather than
                `user` from useAuth (client-resolved) so the SSR'd HTML matches
                what each visitor will actually see. Eliminates the flicker
                where signed-in users got the guest banner painted first then
                swapped to "Hello, X" after hydration. */}
            {isSignedIn ? (
              <h1 className="text-2xl font-headline font-bold text-on-surface tracking-tight">
                Hello, {profile?.first_name || profile?.username || 'Friend'}!
              </h1>
            ) : (
              <div className="space-y-4">
                <GuestSignInBanner cityImages={serverCityImages} topCities={topCities} />

                <div>
                  <h1 className="text-3xl font-headline font-bold text-on-surface tracking-tight leading-tight mb-2">
                    The world&apos;s vegan places, ranked by the community
                  </h1>
                  <p className="text-sm text-on-surface-variant">Free, ad-free, no paid listings - ever.</p>
                </div>

                {stats && (
                  <div className="flex gap-6">
                    <div>
                      <p className="text-xl font-black text-primary">{stats.totalPlaces.toLocaleString()}+</p>
                      <p className="text-[11px] text-on-surface-variant">vegan places</p>
                    </div>
                    <div>
                      <p className="text-xl font-black text-primary">{stats.countries}+</p>
                      <p className="text-[11px] text-on-surface-variant">countries</p>
                    </div>
                    <div>
                      <p className="text-xl font-black text-primary">{(stats.citiesRanked ?? 0).toLocaleString()}+</p>
                      <p className="text-[11px] text-on-surface-variant">cities ranked</p>
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  {['No ads', 'No paid listings', 'City vegan rankings'].map(t => (
                    <span key={t} className="px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-full text-[11px] font-medium border border-emerald-100/80">
                      ✓ {t}
                    </span>
                  ))}
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {([
                    { icon: '🗺️', title: 'Browse the map', desc: 'See every vegan spot near you', href: '/map' },
                    { icon: '🌍', title: 'Pick a city', desc: 'Vegan guides for 9,000+ cities', href: '/vegan-places' },
                    { icon: '🏆', title: 'City ranks', desc: '1,300+ cities scored on density and quality', href: '/city-ranks' },
                  ]).map(s => (
                    <Link
                      key={s.title}
                      href={s.href}
                      prefetch={false}
                      className="bg-surface-container-lowest rounded-xl ghost-border p-3 text-center hover:bg-surface-container-low hover:border-primary/30 transition-colors group"
                    >
                      <div className="text-lg mb-1 group-hover:scale-110 transition-transform">{s.icon}</div>
                      <p className="text-xs font-semibold text-on-surface">{s.title}</p>
                      <p className="text-[10px] text-on-surface-variant mt-0.5 leading-relaxed">{s.desc}</p>
                    </Link>
                  ))}
                </div>

              </div>
            )}

            {/* Search bar — shown before geolocation resolves, or when user wants to change city.
                Anon users (Path A) don't get the geolocation flow so this bar is hidden for them. */}
            {isSignedIn && (locationLoading || showCitySearch || (!userCity && !locationLoading)) && (
              <div className="max-w-md">
                <SearchBar className="" />
                <p className="text-[10px] text-on-surface-variant mt-1.5">Search a city to see vegan places and rankings</p>
              </div>
            )}

            {/* Location controls — only when signed in (Path A: anon users get a static home) */}
            {isSignedIn && userCity && !showCitySearch && !locationLoading && (
              <div className="flex flex-wrap items-center gap-3 text-xs">
                <span className="text-on-surface-variant flex items-center gap-1">
                  <MapPin className="h-3 w-3" /> {userCity}, {userCountry}
                  {isPinned && (
                    <span className="text-primary font-medium ml-1">(pinned)</span>
                  )}
                </span>
                <button onClick={() => setShowCitySearch(true)} className="text-primary hover:underline font-medium">
                  Choose a different city
                </button>
                {isPinned && (
                  <button onClick={() => {
                    safeStorage.local.remove('pinned_city')
                    safeStorage.local.remove('pinned_city_name')
                    safeStorage.local.remove('pinned_country_name')
                    safeStorage.local.remove('plantspack_home_cache')
                    // Clear the pinned cookies too — otherwise SSR on reload
                    // would still render the pinned city before the client
                    // re-sync'd.
                    clearPinnedLocationCookies()
                    setIsPinned(false)
                    window.location.reload()
                  }} className="text-on-surface-variant hover:text-primary hover:underline font-medium">
                    Use my location
                  </button>
                )}
              </div>
            )}

            {/* Platform-wide mapped count. The per-user "You've contributed N"
                line was removed — `places.created_by` counts auto-imports
                against the admin user (37K+), which is misleading and the
                metric isn't meaningful for other users yet. Revisit when we
                track genuine user-contributed places separately. */}
            {isSignedIn && stats && (
              <p className="text-xs text-on-surface-variant">
                Together we&apos;ve mapped <strong className="text-on-surface">{stats.totalPlaces.toLocaleString()}</strong> places.
                {userContributions !== null && userContributions === 0 && (
                  <> <button onClick={() => setIsAddPlaceOpen(true)} className="text-primary hover:underline font-medium">Add your first place!</button></>
                )}
              </p>
            )}

            {/* City Score Hero — signed-in only; this block was the main CLS culprit
                when it slid into the layout 1-3s after the geolocation poll. */}
            {isSignedIn && (cityScore || userCity) && (() => {
              const heroCity = userCity || cityScore?.city || ''
              const heroCountry = userCountry || cityScore?.country || ''
              // Only build the link if we actually have both city + country —
              // without them the /vegan-places/[country]/[city] route 404s.
              const heroHref = heroCity && heroCountry
                ? `/vegan-places/${slugifyCityOrCountry(heroCountry)}/${slugifyCityOrCountry(heroCity)}`
                : null
              return (
              <div className="bg-surface-container-lowest rounded-2xl editorial-shadow overflow-hidden">
                {cityImageUrl && !cityImageFailed && (
                  heroHref ? (
                    <Link href={heroHref} className="block relative h-32 overflow-hidden group" aria-label={`Explore vegan places in ${heroCity}`}>
                      {/* LCP element on home — must be discoverable + high priority. */}
                      <SmartImg
                        src={cityImageUrl}
                        alt={heroCity}
                        fill
                        priority
                        sizes="(max-width: 768px) 100vw, 720px"
                        className="object-cover transition-transform group-hover:scale-[1.02]"
                        onError={() => setCityImageFailed(true)}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-surface-container-lowest/90 to-transparent" />
                    </Link>
                  ) : (
                    <div className="relative h-32 overflow-hidden">
                      <SmartImg
                        src={cityImageUrl}
                        alt={heroCity}
                        fill
                        priority
                        sizes="(max-width: 768px) 100vw, 720px"
                        className="object-cover"
                        onError={() => setCityImageFailed(true)}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-surface-container-lowest/90 to-transparent" />
                    </div>
                  )
                )}
                <div className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2 text-sm text-on-surface-variant">
                      <MapPin className="h-4 w-4" />
                      {heroHref ? (
                        <Link href={heroHref} className="hover:text-primary transition-colors">
                          {heroCity}{heroCountry ? `, ${heroCountry}` : ''}
                        </Link>
                      ) : (
                        <span>{heroCity}{heroCountry ? `, ${heroCountry}` : ''}</span>
                      )}
                    </div>
                    {cityScore && <span className={`text-3xl font-black ${getGradeColor(cityScore.grade)}`}>{cityScore.grade}</span>}
                  </div>
                  {cityScore ? (
                    <>
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-sm text-on-surface-variant">Vegan Score</span>
                        <span className="text-sm font-bold text-on-surface">{cityScore.score}/100</span>
                      </div>
                      <div className="h-2 bg-surface-container-low rounded-full overflow-hidden mb-3">
                        <div className={`h-full rounded-full ${getScoreBarColor(cityScore.score)} transition-all`} style={{ width: `${cityScore.score}%` }} />
                      </div>
                      <p className="text-xs text-on-surface-variant mb-3">
                        {cityScore.fvCount} fully-vegan · {cityScore.placeCount} total places
                        {cityScore.score < 78 && (() => {
                          // Next grade up — aligned with GRADE_THRESHOLDS in
                          // src/lib/score-utils.ts so the hint matches the grade.
                          const s = cityScore.score
                          if (s < 30) return ' · Add places to reach D!'
                          if (s < 37) return ' · Add places to reach D+!'
                          if (s < 45) return ' · Add places to reach C!'
                          if (s < 54) return ' · Add places to reach C+!'
                          if (s < 62) return ' · Add places to reach B!'
                          if (s < 70) return ' · Add places to reach B+!'
                          if (s < 78) return ' · Add places to reach A!'
                          return ''
                        })()}
                      </p>
                    </>
                  ) : (
                    <p className="text-sm text-on-surface-variant mb-3">
                      {cityPlaceCount && cityPlaceCount > 0
                        ? `${userCity} has ${cityPlaceCount} vegan or vegan-friendly ${cityPlaceCount === 1 ? 'place' : 'places'} so far — add ${5 - cityPlaceCount} more to unlock its vegan score.`
                        : `No vegan or vegan-friendly places in ${userCity} yet — be the first to add one!`}
                    </p>
                  )}
                  <div className="flex gap-2">
                    <button onClick={() => setIsAddPlaceOpen(true)}
                      className="flex-shrink-0 flex items-center gap-1.5 px-4 py-2 text-xs font-medium silk-gradient text-on-primary-btn rounded-lg hover:opacity-90 transition-colors text-left">
                      <Plus className="h-3 w-3" /> Add a place to boost the score
                    </button>
                    <Link href="/city-ranks" prefetch={false} className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-primary ghost-border rounded-lg hover:bg-primary/5 transition-colors">
                      <TrendingUp className="h-3 w-3" /> Full rankings
                    </Link>
                  </div>
                </div>
              </div>
              )
            })()}

            {/* My Cities — SSR'd from page.tsx so the cards render in the
                initial HTML, no loading flash. Empty for anon users. */}
            {followedCities.length > 0 && (
              <div className="mt-6">
                <div className="flex items-center gap-2 mb-3">
                  <MapPin className="h-4 w-4 text-primary" />
                  <h2 className="font-semibold text-on-surface">My Cities</h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {followedCities.map(c => {
                    const countrySlug = slugifyCityOrCountry(c.country)
                    const citySlug = slugifyCityOrCountry(c.city)
                    return (
                      <Link
                        key={`${c.city}-${c.country}`}
                        href={`/vegan-places/${countrySlug}/${citySlug}`}
                        className="bg-surface-container-lowest rounded-xl ghost-border p-3 hover:bg-primary/[0.03] transition-colors group"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="min-w-0">
                            <p className="font-medium text-sm text-on-surface truncate group-hover:text-primary transition-colors">
                              {c.city}
                            </p>
                            <p className="text-[11px] text-on-surface-variant">
                              {c.country} · {c.placeCount} places
                            </p>
                            {(c.newPlaces ?? 0) > 0 && (
                              <p className="text-[11px] font-medium text-primary mt-0.5">
                                <Sparkles className="inline h-3 w-3 mr-0.5 -mt-0.5" aria-hidden />
                                {c.newPlaces} new since your last visit
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            <span className={`text-lg font-black ${getGradeColor(c.currentGrade)}`}>
                              {c.currentGrade}
                            </span>
                            {c.delta !== null && c.delta !== 0 && (
                              <span className={`text-[10px] font-bold flex items-center gap-0.5 ${
                                c.delta > 0 ? 'text-emerald-600' : 'text-red-500'
                              }`}>
                                {c.delta > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                                {c.delta > 0 ? '+' : ''}{c.delta}
                              </span>
                            )}
                            {c.delta === null && (
                              <span className="text-[9px] font-medium text-primary bg-primary/10 px-1.5 py-0.5 rounded">NEW</span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 mb-1.5">
                          <div className="flex-1 h-1.5 bg-surface-container-low rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${getScoreBarColor(c.currentScore)} transition-all`}
                              style={{ width: `${c.currentScore}%` }}
                            />
                          </div>
                          <span className="text-[10px] font-medium text-on-surface-variant w-8 text-right">
                            {c.currentScore}
                          </span>
                        </div>
                        {c.pointsToNext && c.nextGrade && (
                          <p className="text-[10px] text-on-surface-variant">
                            {c.pointsToNext} pts to reach {c.nextGrade}
                          </p>
                        )}
                      </Link>
                    )
                  })}
                </div>
              </div>
            )}

            {isSignedIn && filteredNearby.length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-semibold text-on-surface">Vegan places near you</h2>
                  <Link href="/map" className="text-xs text-primary font-medium hover:underline">View on map</Link>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {filteredNearby.map(place => (
                    <div key={place.id} className="bg-surface-container-lowest rounded-xl ghost-border hover:border-primary/20 transition-all overflow-hidden">
                      <Link href={`/place/${place.slug || place.id}`} prefetch={false}>
                        <PlaceImage
                          src={place.main_image_url || place.images?.[0]}
                          alt={place.name}
                          category={place.category}
                          className="w-full h-28 object-cover"
                        />
                      </Link>
                      <div className="p-3">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <Link href={`/place/${place.slug || place.id}`} prefetch={false} className="font-medium text-sm text-on-surface hover:text-primary truncate">
                            {place.name}
                          </Link>
                          <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded-full flex-shrink-0 ${
                            place.vegan_level === 'fully_vegan' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                          }`}>
                            {place.vegan_level === 'fully_vegan' ? '100% Vegan' : 'Vegan-Friendly'}
                          </span>
                        </div>
                        <RatingBadge
                          rating={(place as any).average_rating}
                          reviewCount={(place as any).review_count}
                          size="xs"
                          className="mb-1"
                        />
                        <p className="text-xs text-on-surface-variant mb-2">
                          {CATEGORY_LABEL[place.category]} · {place.distance ? `${place.distance} km` : place.city}
                        </p>
                        <Link href={`/place/${place.slug || place.id}`} prefetch={false}
                          className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-primary ghost-border rounded-md hover:bg-primary/5 transition-colors">
                          <Star className="h-3 w-3" /> Write a review
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-[10px] text-on-surface-variant/60 text-center mt-2">New places and your reviews help increase your city&apos;s ranking</p>
              </section>
            )}

            {/* Sanctuaries — signed-in only */}
            {isSignedIn && filteredSanctuaries.length > 0 && (
              <section>
                <h2 className="font-semibold text-on-surface flex items-center gap-2 mb-3">🐾 Nearby sanctuaries to support</h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {filteredSanctuaries.map(s => (
                    <Link key={s.id} href={`/place/${s.slug || s.id}`} className="p-3 bg-surface-container-lowest rounded-xl ghost-border hover:border-primary/20 transition-all">
                      <PlaceImage
                        src={s.main_image_url || s.images?.[0]}
                        alt={s.name}
                        category={s.category}
                        className="w-full h-24 rounded-lg object-cover mb-2"
                      />
                      <p className="font-medium text-sm text-on-surface truncate">{s.name}</p>
                      <RatingBadge
                        rating={(s as any).average_rating}
                        reviewCount={(s as any).review_count}
                        size="xs"
                        className="mt-0.5"
                      />
                      <p className="text-xs text-on-surface-variant">{s.distance ? `${s.distance} km away` : s.city}</p>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* Stays — signed-in only */}
            {isSignedIn && filteredStays.length > 0 && (
              <section>
                <h2 className="font-semibold text-on-surface flex items-center gap-2 mb-3">🛏️ Vegan stays nearby</h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {filteredStays.map(s => (
                    <Link key={s.id} href={`/place/${s.slug || s.id}`} className="p-3 bg-surface-container-lowest rounded-xl ghost-border hover:border-primary/20 transition-all">
                      <PlaceImage
                        src={s.main_image_url || s.images?.[0]}
                        alt={s.name}
                        category={s.category}
                        className="w-full h-24 rounded-lg object-cover mb-2"
                      />
                      <p className="font-medium text-sm text-on-surface truncate">{s.name}</p>
                      <RatingBadge
                        rating={(s as any).average_rating}
                        reviewCount={(s as any).review_count}
                        size="xs"
                        className="mt-0.5"
                      />
                      <p className="text-xs text-on-surface-variant">{s.distance ? `${s.distance} km away` : s.city}</p>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* CTA: Add a place */}
            {(filteredNearby.length > 0 || filteredSanctuaries.length > 0) && (
              <div className="bg-primary/5 rounded-xl p-4 flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-on-surface">Know a vegan place not on the map?</p>
                  <p className="text-xs text-on-surface-variant">Add it in 30 seconds and boost your city&apos;s ranking</p>
                </div>
                <button onClick={() => setIsAddPlaceOpen(true)}
                  className="flex-shrink-0 flex items-center gap-1.5 px-4 py-2 text-xs font-medium silk-gradient text-on-primary-btn rounded-lg hover:opacity-90 transition-colors">
                  <Plus className="h-3.5 w-3.5" /> Add Place
                </button>
              </div>
            )}

            {/* Top Cities — SSR data */}
            {topCities.length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-semibold text-on-surface flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-primary" /> Top vegan cities
                  </h2>
                  <Link href="/city-ranks" prefetch={false} className="text-xs text-primary font-medium hover:underline">Full rankings</Link>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {topCities.map(city => {
                    const img = getCityImage(serverCityImages, city.city, city.country)
                    return (
                      <Link key={city.city} href={`/vegan-places/${slugifyCityOrCountry(city.country)}/${slugifyCityOrCountry(city.city)}`}
                        prefetch={false}
                        className="bg-surface-container-lowest rounded-xl ghost-border hover:border-primary/20 transition-all overflow-hidden">
                        {img && (
                          <div className="relative h-20 overflow-hidden">
                            <SmartImg
                              src={img}
                              alt={city.city}
                              fill
                              sizes="(max-width: 640px) 50vw, 200px"
                              className="object-cover"
                              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                            <span className={`absolute bottom-1 right-2 text-lg font-black drop-shadow-md ${city.grade.startsWith('A') ? 'text-emerald-400' : city.grade === 'B' ? 'text-green-400' : city.grade === 'C' ? 'text-yellow-300' : 'text-orange-300'}`}>{city.grade}</span>
                          </div>
                        )}
                        <div className="p-2.5 text-center">
                          {!img && <span className={`text-xl font-black ${getGradeColor(city.grade)}`}>{city.grade}</span>}
                          <p className="font-medium text-sm text-on-surface truncate">{city.city}</p>
                          <p className="text-[10px] text-on-surface-variant">{city.fvCount} vegan places</p>
                        </div>
                      </Link>
                    )
                  })}
                </div>
              </section>
            )}

            {/* CTA: Rate a place */}
            {topCities.length > 0 && (
              <div className="bg-surface-container-lowest rounded-xl ghost-border p-4 flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-on-surface">Been to a vegan place recently?</p>
                  <p className="text-xs text-on-surface-variant">Rate it to help your city rank higher</p>
                </div>
                <Link href="/map" className="flex-shrink-0 flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-primary ghost-border rounded-lg hover:bg-primary/5 transition-colors">
                  <Star className="h-3.5 w-3.5" /> Find & Rate
                </Link>
              </div>
            )}

            {/* Dish chips - the only homepage links to dish pages (55% of organic
                clicks). Server-rendered so crawlers and the first paint both see
                them. Sits in the main column so it fills the space beside the
                taller reviews sidebar on desktop. */}
            {dishChips.length > 0 && (
              <section aria-labelledby="home-dish-chips-heading">
                <div className="flex items-baseline justify-between mb-3 gap-3 flex-wrap">
                  <h2 id="home-dish-chips-heading" className="font-semibold text-on-surface">
                    {dishChipsCity ? `Best vegan dishes in ${dishChipsCity}` : 'Best vegan dishes by city'}
                  </h2>
                  <Link href="/vegan-places" prefetch={false} className="text-xs text-primary font-medium hover:underline">
                    All cities
                  </Link>
                </div>
                <ul className="flex flex-wrap gap-2">
                  {dishChips.map(c => (
                    <li key={c.href}>
                      <Link
                        href={c.href}
                        prefetch={false}
                        className="inline-block px-3 py-1.5 rounded-full ghost-border bg-surface-container-lowest text-sm text-on-surface hover:border-primary/40 hover:text-primary transition-colors"
                      >
                        {dishChipsCity ? c.label : `${c.label} in ${c.city}`}
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}

          </div>

          {/* Recent reviews - inline on mobile, sidebar on desktop. The posts
              feed, create-post button and /feed links were removed 2026-10-16:
              30 days with 0 comments, 0 likes and 1 human post. Reviews are the
              one social unit people use (see docs/plans/2026-10-16-product-direction.md). */}
          <div className="mt-6 xl:mt-0 xl:w-72 xl:flex-shrink-0 xl:sticky xl:top-24 xl:self-start">
            {nearbyEvents && nearbyEvents.items.length > 0 && <NearbyEventsList events={nearbyEvents} />}
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-on-surface text-sm">Recent reviews</h2>
            </div>
            <div className="xl:max-h-[calc(100vh-180px)] xl:overflow-y-auto">
              <ActivityList items={recentActivity ?? []} />
            </div>
            {!isSignedIn && (
              <Link
                href="/auth"
                data-event="cta_click_signup"
                data-cta="sign_in"
                data-from="home_sidebar_contribute"
                className="block w-full text-center bg-primary text-on-primary-btn py-3 rounded-xl font-medium text-sm mt-4"
              >
                Sign in to review a place
              </Link>
            )}
          </div>
        </div>
      </div>

      {isAddPlaceOpen && <AddPlaceModal onClose={() => setIsAddPlaceOpen(false)} defaultCity={userCity} defaultCountry={userCountry} />}
    </div>
  )
}

// Dates come as YYYY-MM-DD in the event's own timezone; format them in UTC
// so server and client render the same string (no hydration drift).
function formatEventDay(d: string) {
  return new Date(`${d}T12:00:00Z`).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' })
}
function formatEventRange(start: string, end: string | null) {
  if (!end || end === start) return formatEventDay(start)
  const fmt = (d: string) => new Date(`${d}T12:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' })
  return `${fmt(start)} - ${fmt(end)}`
}

function NearbyEventsList({ events }: { events: NearbyEvents }) {
  return (
    <section className="mb-6" aria-labelledby="nearby-events-heading">
      <div className="flex items-center justify-between mb-3">
        <h2 id="nearby-events-heading" className="font-semibold text-on-surface text-sm">Vegan events within {events.radiusKm} km</h2>
        <Link href="/events" prefetch={false} className="text-xs text-primary font-medium hover:underline">All events</Link>
      </div>
      <ul className="space-y-2">
        {events.items.map(e => (
          <li key={e.slug}>
            <Link
              href={`/event/${e.slug}`}
              prefetch={false}
              data-event="home_nearby_event_click"
              className="block bg-surface-container-lowest rounded-xl ghost-border hover:border-primary/20 transition-all p-3"
            >
              <div className="text-[11px] font-semibold text-primary">{formatEventRange(e.startDate, e.endDate)}</div>
              <div className="text-sm font-medium text-on-surface leading-snug mt-0.5">{e.title}</div>
              <div className="text-xs text-on-surface-variant mt-0.5">
                {e.city || e.country}{e.distanceKm > 0 ? `, ${e.distanceKm} km away` : ''}{e.isFree ? ', free' : ''}
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}

// Mixed activity list — renders SSR posts + reviews without client fetch.
function ActivityList({ items }: { items: ActivityItem[] }) {
  if (items.length === 0) return <p className="text-xs text-on-surface-variant text-center py-4">No reviews yet</p>

  return (
    <div className="space-y-2">
      {items.map(it => (
        it.type === 'post' ? <PostRow key={`post-${it.data.id}`} post={it.data} /> : <ReviewRow key={`review-${it.data.id}`} review={it.data} />
      ))}
    </div>
  )
}

function PostRow({ post }: { post: CompactPost }) {
  // Place posts: title is just the place name; the sentence ("Just added a
  // new vegan spot: …") lives in content. Articles/recipes keep title-first.
  const content = (post.category === 'place' ? post.content || post.title : post.title || post.content) || ''
  const truncated = content.length > 140 ? content.slice(0, 140) + '...' : content
  const isArticle = post.category === 'article'
  const postUrl = isArticle && post.slug
    ? `/blog/${post.slug}`
    : post.category === 'recipe' && post.slug
    ? `/recipe/${post.slug}`
    : `/post/${post.slug || post.id}`
  const u = post.users as any
  const likes = post.post_reactions?.length || 0
  const comments = post.comments?.length || 0
  const thumb = post.images?.[0] || post.image_url

  return (
    <Link href={postUrl} prefetch={false} className="block p-2.5 bg-surface-container-lowest rounded-lg ghost-border hover:border-primary/15 transition-all">
      <div className="flex gap-2.5">
        {thumb && <SmartImg src={thumb} alt="" width={56} height={56} className="w-14 h-14 rounded-lg object-cover flex-shrink-0" />}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1 flex-wrap">
            {post.is_pinned && (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-semibold bg-amber-100 text-amber-700">
                <Pin className="h-2.5 w-2.5" /> Pinned
              </span>
            )}
            {isArticle && (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-semibold bg-primary/10 text-primary">
                <BookOpen className="h-2.5 w-2.5" /> Blog
              </span>
            )}
            {u?.avatar_url ? (
              <SmartImg src={u.avatar_url} alt="" width={16} height={16} className="w-4 h-4 rounded-full object-cover" />
            ) : (
              <div className="w-4 h-4 rounded-full bg-surface-container-high flex items-center justify-center text-[8px] font-bold text-primary">
                {(u?.first_name?.[0] || u?.username?.[0] || '?').toUpperCase()}
              </div>
            )}
            <span className="text-[10px] font-medium text-on-surface-variant truncate">{u?.first_name || u?.username}</span>
            <span className="text-[10px] text-on-surface-variant">·</span>
            <span className="text-[10px] text-on-surface-variant" suppressHydrationWarning>{timeAgo(post.created_at)}</span>
          </div>
          <p className="text-xs text-on-surface leading-relaxed">
            {truncated}
            {content.length > 140 && <span className="text-primary font-medium ml-1">more</span>}
          </p>
        </div>
      </div>
      {(likes > 0 || comments > 0) && (
        <div className="flex items-center gap-3 mt-1.5 pl-1">
          {likes > 0 && <span className="flex items-center gap-0.5 text-[10px] text-on-surface-variant"><Heart className="h-2.5 w-2.5" /> {likes}</span>}
          {comments > 0 && <span className="flex items-center gap-0.5 text-[10px] text-on-surface-variant"><MessageCircle className="h-2.5 w-2.5" /> {comments}</span>}
        </div>
      )}
    </Link>
  )
}

function ReviewRow({ review }: { review: CompactReview }) {
  const u = review.users as any
  const place = review.place
  const placeUrl = place?.slug ? `/place/${place.slug}#review-${review.id}` : '#'
  const thumb = place?.main_image_url || place?.images?.[0] || review.images?.[0]
  const reactions = review.place_review_reactions?.length || 0
  const content = review.content || ''
  const truncated = content.length > 140 ? content.slice(0, 140) + '...' : content

  return (
    <Link href={placeUrl} prefetch={false} className="block p-2.5 bg-surface-container-lowest rounded-lg ghost-border border-l-2 border-l-amber-300/70 hover:border-primary/15 transition-all">
      <div className="flex gap-2.5">
        {thumb && <SmartImg src={thumb} alt="" width={56} height={56} className="w-14 h-14 rounded-lg object-cover flex-shrink-0" />}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1 flex-wrap">
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-semibold bg-amber-100 text-amber-700">
              <Star className="h-2.5 w-2.5 fill-amber-500 text-amber-500" /> Review
            </span>
            {u?.avatar_url ? (
              <SmartImg src={u.avatar_url} alt="" width={16} height={16} className="w-4 h-4 rounded-full object-cover" />
            ) : (
              <div className="w-4 h-4 rounded-full bg-surface-container-high flex items-center justify-center text-[8px] font-bold text-primary">
                {(u?.first_name?.[0] || u?.username?.[0] || '?').toUpperCase()}
              </div>
            )}
            <span className="text-[10px] font-medium text-on-surface-variant truncate">{u?.first_name || u?.username}</span>
            <span className="text-[10px] text-on-surface-variant">·</span>
            <span className="text-[10px] text-on-surface-variant" suppressHydrationWarning>{timeAgo(review.created_at)}</span>
          </div>
          <div className="flex items-center gap-1 mb-1" aria-label={`${review.rating} stars`}>
            {[1, 2, 3, 4, 5].map(i => (
              <Star key={i} className={`h-2.5 w-2.5 ${i <= review.rating ? 'fill-amber-400 text-amber-400' : 'text-outline-variant'}`} />
            ))}
            {place && (
              <span className="text-[10px] text-on-surface-variant ml-1 truncate">on <span className="font-medium text-on-surface">{place.name}</span></span>
            )}
          </div>
          <p className="text-xs text-on-surface leading-relaxed">
            {truncated}
            {content.length > 140 && <span className="text-primary font-medium ml-1">more</span>}
          </p>
        </div>
      </div>
      {reactions > 0 && (
        <div className="flex items-center gap-3 mt-1.5 pl-1">
          <span className="flex items-center gap-0.5 text-[10px] text-on-surface-variant"><Heart className="h-2.5 w-2.5" /> {reactions}</span>
        </div>
      )}
    </Link>
  )
}

export default function HomeClient(props: Props) {
  return <HomeContent {...props} />
}

/**
 * Guest hero banner for the homepage. Anonymous visitors lost the
 * city-hero block when location-aware content was gated behind sign-in
 * (CLS fix, 2026-05-07). Replaces a small "Join for free" button with a
 * fixed-height banner that sells the value of signing in: a curated city
 * image (deterministic by day so SSR cache stays stable), a clear
 * "See vegan places near you" headline, and primary/secondary CTAs.
 *
 * Fixed dimensions (h-48 mobile, h-56 desktop) so this banner does not
 * contribute to CLS regardless of when the image finishes decoding.
 */
function GuestSignInBanner({ cityImages, topCities }: { cityImages: Record<string, string>; topCities: CityScoreData[] }) {
  // Curated rotation: pick from top-graded cities we know have an image.
  // Day-of-year index keeps SSR stable across the cache TTL while still
  // varying the visual across visits over time.
  const candidates: Array<{ city: string; country: string }> = (topCities || [])
    .filter(c => c.grade?.startsWith('A') || c.grade?.startsWith('B'))
    .slice(0, 12)
    .map(c => ({ city: c.city, country: c.country }))
    .filter(c => cityImages[`${c.city}|||${c.country}`])

  const fallback = { city: 'Berlin', country: 'Germany' }
  const pool = candidates.length > 0 ? candidates : [fallback]
  const dayIndex = Math.floor(Date.now() / 86400000) % pool.length
  const pick = pool[dayIndex]
  const heroImg = cityImages[`${pick.city}|||${pick.country}`] || null

  return (
    <section
      aria-label="Sign in to see vegan places near you"
      className="relative overflow-hidden rounded-2xl ghost-border editorial-shadow"
    >
      <div className="relative h-48 md:h-56 w-full">
        {heroImg ? (
          // LCP image: eager + fetchpriority=high, and sizes lets the
          // browser take the 960 px WebP variant instead of the 1600 px
          // original (~700 KB) on narrow screens.
          <SmartImg
            src={heroImg}
            alt={`Vegan places in ${pick.city}, ${pick.country}`}
            fill
            priority
            sizes="(max-width: 768px) 100vw, 960px"
            className="object-cover"
          />
        ) : (
          <div className="absolute inset-0 silk-gradient" />
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-black/65 via-black/45 to-black/30" />
        <div className="relative h-full flex flex-col justify-center px-5 md:px-7 text-white">
          <h2 className="text-xl md:text-2xl font-headline font-bold leading-tight max-w-md">
            Find vegan and vegan-friendly places
          </h2>
          <p className="text-xs md:text-sm text-white/85 mt-1.5 max-w-md leading-snug">
            52,000+ listings worldwide, with verification you can see and city rankings. Free, ad-free, no paid placements.
          </p>
          <div className="flex flex-wrap gap-2 mt-3">
            <Link
              href="/search"
              data-event="home_guest_search"
              data-from="home_guest_banner"
              className="inline-flex items-center gap-2 px-4 py-2 bg-white text-on-surface rounded-xl text-sm font-semibold hover:bg-white/90 transition-colors"
            >
              Search your city
            </Link>
            <Link
              href="/map"
              data-event="home_guest_map"
              data-from="home_guest_banner"
              className="inline-flex items-center gap-2 px-4 py-2 bg-white/15 backdrop-blur-sm text-white rounded-xl text-sm font-medium border border-white/30 hover:bg-white/25 transition-colors"
            >
              Explore the map
            </Link>
          </div>
          {heroImg && (
            <p className="text-[10px] text-white/65 mt-2.5">
              Pictured: {pick.city}, {pick.country}
            </p>
          )}
        </div>
      </div>
    </section>
  )
}
