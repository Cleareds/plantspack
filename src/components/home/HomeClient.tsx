'use client'

import { useState, useEffect, useLayoutEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { MapPin, Plus, TrendingUp, TrendingDown, Star, Heart, MessageCircle, Share2, Pin, BookOpen } from 'lucide-react'
import SearchBar from '@/components/search/SearchBar'
// Heavy modals — only loaded when the user opens them. Previously these were
// statically imported and pulled ImageUploader, VideoUploader, LinkPreview,
// MentionAutocomplete, LocationPicker, AddressSearch, geocodingService into
// the home bundle whether the user ever clicked "Create Post" / "Add Place" or not.
const CreatePostModal = dynamic(() => import('@/components/posts/CreatePostModal'), { ssr: false })
const AddPlaceModal   = dynamic(() => import('@/components/places/AddPlaceModal'),  { ssr: false })
import { useVeganFilter } from '@/lib/vegan-filter-context'
import RatingBadge from '@/components/places/RatingBadge'
import { useAuth } from "@/lib/auth"
import { supabase } from '@/lib/supabase'
// getGradeColor + getScoreBarColor are defined locally below.
import PlaceImage from '@/components/places/PlaceImage'
import { syncLocationCookiesFromLocalStorage, clearPinnedLocationCookies } from '@/lib/location-cookies'

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
}

interface Props {
  topCities: CityScoreData[]
  recentPosts: CompactPost[]
  recentActivity?: ActivityItem[]
  cityImages?: Record<string, string>
  initialLocation?: InitialLocation | null
  followedCities?: FollowedCitySummary[]
}

function HomeContent({ topCities, recentPosts, recentActivity, cityImages: serverCityImages = {}, initialLocation, followedCities = [] }: Props) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [isCreatePostOpen, setIsCreatePostOpen] = useState(false)
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
    (initialLocation && serverCityImages[`${initData?.userCityScore?.city || initialLocation.city}|||${initData?.userCityScore?.country || initialLocation.country}`]) || null
  )
  const [cityImageFailed, setCityImageFailed] = useState(false)

  useEffect(() => {
    if (searchParams?.get('create') === 'true' && user) {
      setIsCreatePostOpen(true)
      router.replace('/', { scroll: false })
    }
  }, [searchParams, user, router])

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
    setIsPinned(!!localStorage.getItem('pinned_city_name'))
    if (userCity) return
    try {
      const pinnedCity = localStorage.getItem('pinned_city_name')
      const pinnedCountry = localStorage.getItem('pinned_country_name')
      if (pinnedCity) {
        setUserCity(pinnedCity)
        if (pinnedCountry) setUserCountry(pinnedCountry)
        return
      }
      const geoCity = localStorage.getItem('user_city')
      const geoCountry = localStorage.getItem('user_country')
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
        localStorage.setItem('user_city', fallbackCity)
        if (fallbackCountry) localStorage.setItem('user_country', fallbackCountry)
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const [stats, setStats] = useState<{ totalPlaces: number; fullyVegan: number; restaurants: number; stores: number; stays: number; sanctuaries: number; countries: number; cities: number } | null>(initData?.stats || null)

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
    const CACHE_KEY = 'plantspack_home_cache'
    const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

    // Server already gave us a location-aware payload — skip the client
    // refetch on mount. Storage events will still refresh if the user
    // pins a new city or geo changes.
    if (initialLocation) {
      setLocationLoading(false)
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify({
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
      const imgUrl = serverCityImages[`${data.userCityScore?.city || city}|||${data.userCityScore?.country || country}`] || null
      if (imgUrl) setCityImageUrl(imgUrl)
    }

    // Try cached data first — instant render
    try {
      const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null')
      if (cached && Date.now() - cached.ts < CACHE_TTL) {
        applyData(cached.data, cached.city, cached.country)
        setLocationLoading(false)
        return // Cache hit — done
      }
    } catch {}

    async function load() {
      // Check if a city is pinned — overrides geolocation
      const pinnedCity = localStorage.getItem('pinned_city_name') || ''
      const pinnedCountry = localStorage.getItem('pinned_country_name') || ''

      let lat = '', lng = '', city = '', country = ''
      if (pinnedCity) {
        // Pinned city — skip geolocation entirely, use pinned data directly
        city = pinnedCity
        country = pinnedCountry
      } else {
        // Check localStorage for geo data (persists across tabs/reloads)
        lat = localStorage.getItem('user_lat') || ''
        lng = localStorage.getItem('user_lng') || ''
        city = localStorage.getItem('user_city') || ''
        country = localStorage.getItem('user_country') || ''

        // If no cached geo, poll briefly for AppShell to set it
        if (!lat && !city) {
          for (let i = 0; i < 10; i++) {
            lat = localStorage.getItem('user_lat') || ''
            lng = localStorage.getItem('user_lng') || ''
            city = localStorage.getItem('user_city') || ''
            country = localStorage.getItem('user_country') || ''
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
        localStorage.setItem(CACHE_KEY, JSON.stringify({ data, city, country, ts: Date.now() }))
      } catch {}

      setLocationLoading(false)
    }
    load()
  }, [initialLocation])

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
      <div className="max-w-6xl mx-auto px-4 md:px-8 py-6">
        <div className="xl:flex xl:gap-6">
          <div className="flex-1 min-w-0 space-y-6">
            {/* Value prop */}
            {user ? (
              <h1 className="text-2xl font-headline font-bold text-on-surface tracking-tight">
                Hello, {profile?.first_name || profile?.username || 'Friend'}!
              </h1>
            ) : (
              <div className="space-y-4">
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
                      <p className="text-xl font-black text-primary">{stats.cities.toLocaleString()}+</p>
                      <p className="text-[11px] text-on-surface-variant">cities covered</p>
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  {['No ads', 'No chains', 'Community-verified', 'City vegan rankings'].map(t => (
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
                      className="bg-surface-container-lowest rounded-xl ghost-border p-3 text-center hover:bg-surface-container-low hover:border-primary/30 transition-colors group"
                    >
                      <div className="text-lg mb-1 group-hover:scale-110 transition-transform">{s.icon}</div>
                      <p className="text-xs font-semibold text-on-surface">{s.title}</p>
                      <p className="text-[10px] text-on-surface-variant mt-0.5 leading-relaxed">{s.desc}</p>
                    </Link>
                  ))}
                </div>

                <Link href="/auth" className="inline-flex items-center gap-2 px-5 py-2.5 silk-gradient text-on-primary-btn rounded-xl text-sm font-medium hover:opacity-90 transition-opacity">
                  Join for free →
                </Link>
              </div>
            )}

            {/* Search bar — shown before geolocation resolves, or when user wants to change city */}
            {(locationLoading || showCitySearch || (!userCity && !locationLoading)) && (
              <div className="max-w-md">
                <SearchBar className="" />
                <p className="text-[10px] text-on-surface-variant mt-1.5">Search a city to see vegan places and rankings</p>
              </div>
            )}

            {/* Location controls — shown when city is detected */}
            {userCity && !showCitySearch && !locationLoading && (
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
                    localStorage.removeItem('pinned_city')
                    localStorage.removeItem('pinned_city_name')
                    localStorage.removeItem('pinned_country_name')
                    localStorage.removeItem('plantspack_home_cache')
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
            {user && stats && (
              <p className="text-xs text-on-surface-variant">
                Together we&apos;ve mapped <strong className="text-on-surface">{stats.totalPlaces.toLocaleString()}</strong> places.
                {userContributions !== null && userContributions === 0 && (
                  <> <button onClick={() => setIsAddPlaceOpen(true)} className="text-primary hover:underline font-medium">Add your first place!</button></>
                )}
              </p>
            )}

            {/* City Score Hero */}
            {(cityScore || userCity) && (() => {
              const heroCity = userCity || cityScore?.city || ''
              const heroCountry = userCountry || cityScore?.country || ''
              // Only build the link if we actually have both city + country —
              // without them the /vegan-places/[country]/[city] route 404s.
              const heroHref = heroCity && heroCountry
                ? `/vegan-places/${heroCountry.toLowerCase().replace(/\s+/g, '-')}/${heroCity.toLowerCase().replace(/\s+/g, '-')}`
                : null
              return (
              <div className="bg-surface-container-lowest rounded-2xl editorial-shadow overflow-hidden">
                {cityImageUrl && !cityImageFailed && (
                  heroHref ? (
                    <Link href={heroHref} className="block relative h-32 overflow-hidden group" aria-label={`Explore vegan places in ${heroCity}`}>
                      <img src={cityImageUrl} alt={heroCity} className="w-full h-full object-cover transition-transform group-hover:scale-[1.02]" onError={() => setCityImageFailed(true)} />
                      <div className="absolute inset-0 bg-gradient-to-t from-surface-container-lowest/90 to-transparent" />
                    </Link>
                  ) : (
                    <div className="relative h-32 overflow-hidden">
                      <img src={cityImageUrl} alt={heroCity} className="w-full h-full object-cover" onError={() => setCityImageFailed(true)} />
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
                        ? `${userCity} has ${cityPlaceCount} vegan ${cityPlaceCount === 1 ? 'place' : 'places'} so far — add ${5 - cityPlaceCount} more to unlock its vegan score.`
                        : `No vegan places in ${userCity} yet — be the first to add one!`}
                    </p>
                  )}
                  <div className="flex gap-2">
                    <button onClick={() => setIsAddPlaceOpen(true)}
                      className="flex-shrink-0 flex items-center gap-1.5 px-4 py-2 text-xs font-medium silk-gradient text-on-primary-btn rounded-lg hover:opacity-90 transition-colors text-left">
                      <Plus className="h-3 w-3" /> Add a place to boost the score
                    </button>
                    <Link href="/city-ranks" className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-primary ghost-border rounded-lg hover:bg-primary/5 transition-colors">
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
                    const countrySlug = c.country.toLowerCase().replace(/\s+/g, '-')
                    const citySlug = c.city.toLowerCase().replace(/\s+/g, '-')
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

            {filteredNearby.length > 0 && (
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

            {/* Sanctuaries */}
            {filteredSanctuaries.length > 0 && (
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

            {/* Stays */}
            {filteredStays.length > 0 && (
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
                  <Link href="/city-ranks" className="text-xs text-primary font-medium hover:underline">Full rankings</Link>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {topCities.map(city => {
                    const img = serverCityImages[`${city.city}|||${city.country}`]
                    return (
                      <Link key={city.city} href={`/vegan-places/${city.country.toLowerCase().replace(/\s+/g, '-')}/${city.city.toLowerCase().replace(/\s+/g, '-')}`}
                        prefetch={false}
                        className="bg-surface-container-lowest rounded-xl ghost-border hover:border-primary/20 transition-all overflow-hidden">
                        {img && (
                          <div className="relative h-20 overflow-hidden">
                            <img src={img} alt={city.city} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
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

          </div>

          {/* Community Feed — inline on mobile, sidebar on desktop */}
          <div className="mt-6 xl:mt-0 xl:w-72 xl:flex-shrink-0 xl:sticky xl:top-24 xl:self-start">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-on-surface text-sm">Community</h2>
              <Link href="/feed" className="text-xs text-primary font-medium hover:underline">View all</Link>
            </div>
            <div className="xl:max-h-[calc(100vh-180px)] xl:overflow-y-auto">
              <ActivityList items={recentActivity && recentActivity.length > 0 ? recentActivity : recentPosts.map(p => ({ type: 'post' as const, created_at: p.created_at, data: p }))} />
            </div>
            {user && (
              <button onClick={() => setIsCreatePostOpen(true)}
                className="w-full flex items-center justify-center gap-2 silk-gradient text-on-primary-btn px-4 py-2.5 rounded-xl font-medium text-sm hover:opacity-90 transition-all mt-4">
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>edit_square</span>
                Create Post
              </button>
            )}
            {!user && (
              <Link href="/auth" className="block w-full text-center bg-primary text-on-primary-btn py-3 rounded-xl font-medium text-sm mt-4">
                Sign In to Contribute
              </Link>
            )}
          </div>
        </div>
      </div>

      <CreatePostModal isOpen={isCreatePostOpen} onClose={() => setIsCreatePostOpen(false)} onPostCreated={() => setIsCreatePostOpen(false)} />
      {isAddPlaceOpen && <AddPlaceModal onClose={() => setIsAddPlaceOpen(false)} defaultCity={userCity} defaultCountry={userCountry} />}
    </div>
  )
}

// Mixed activity list — renders SSR posts + reviews without client fetch.
function ActivityList({ items }: { items: ActivityItem[] }) {
  if (items.length === 0) return <p className="text-xs text-on-surface-variant text-center py-4">No activity yet</p>

  return (
    <div className="space-y-2">
      {items.map(it => (
        it.type === 'post' ? <PostRow key={`post-${it.data.id}`} post={it.data} /> : <ReviewRow key={`review-${it.data.id}`} review={it.data} />
      ))}
      <Link href="/feed" className="block text-center text-xs text-primary font-medium hover:underline py-2">View full feed</Link>
    </div>
  )
}

function PostRow({ post }: { post: CompactPost }) {
  const content = post.title || post.content || ''
  const truncated = content.length > 140 ? content.slice(0, 140) + '...' : content
  const isArticle = post.category === 'article'
  const postUrl = isArticle && post.slug
    ? `/blog/${post.slug}`
    : post.category === 'recipe' && post.slug
    ? `/recipe/${post.slug}`
    : `/post/${post.id}`
  const u = post.users as any
  const likes = post.post_reactions?.length || 0
  const comments = post.comments?.length || 0
  const thumb = post.images?.[0] || post.image_url

  return (
    <Link href={postUrl} prefetch={false} className="block p-2.5 bg-surface-container-lowest rounded-lg ghost-border hover:border-primary/15 transition-all">
      <div className="flex gap-2.5">
        {thumb && <img src={thumb} alt="" className="w-14 h-14 rounded-lg object-cover flex-shrink-0" />}
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
              <img src={u.avatar_url} alt="" className="w-4 h-4 rounded-full object-cover" />
            ) : (
              <div className="w-4 h-4 rounded-full bg-surface-container-high flex items-center justify-center text-[8px] font-bold text-primary">
                {(u?.first_name?.[0] || u?.username?.[0] || '?').toUpperCase()}
              </div>
            )}
            <span className="text-[10px] font-medium text-on-surface-variant truncate">{u?.first_name || u?.username}</span>
            <span className="text-[10px] text-on-surface-variant/50">·</span>
            <span className="text-[10px] text-on-surface-variant/50">{timeAgo(post.created_at)}</span>
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
        {thumb && <img src={thumb} alt="" className="w-14 h-14 rounded-lg object-cover flex-shrink-0" />}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1 flex-wrap">
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-semibold bg-amber-100 text-amber-700">
              <Star className="h-2.5 w-2.5 fill-amber-500 text-amber-500" /> Review
            </span>
            {u?.avatar_url ? (
              <img src={u.avatar_url} alt="" className="w-4 h-4 rounded-full object-cover" />
            ) : (
              <div className="w-4 h-4 rounded-full bg-surface-container-high flex items-center justify-center text-[8px] font-bold text-primary">
                {(u?.first_name?.[0] || u?.username?.[0] || '?').toUpperCase()}
              </div>
            )}
            <span className="text-[10px] font-medium text-on-surface-variant truncate">{u?.first_name || u?.username}</span>
            <span className="text-[10px] text-on-surface-variant/50">·</span>
            <span className="text-[10px] text-on-surface-variant/50">{timeAgo(review.created_at)}</span>
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
  return (
    <Suspense fallback={null}>
      <HomeContent {...props} />
    </Suspense>
  )
}
