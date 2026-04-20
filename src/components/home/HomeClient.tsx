'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { MapPin, Plus, TrendingUp, Star, Heart, MessageCircle, Share2 } from 'lucide-react'
import SearchBar from '@/components/search/SearchBar'
import CreatePostModal from "@/components/posts/CreatePostModal"
import { useVeganFilter } from '@/lib/vegan-filter-context'
import AddPlaceModal from "@/components/places/AddPlaceModal"
import RatingBadge from '@/components/places/RatingBadge'
import { useAuth } from "@/lib/auth"
import { supabase } from '@/lib/supabase'
import MyCities from './MyCities'

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
  users: { username: string; first_name: string | null; avatar_url: string | null }
  post_reactions: { id: string }[]; comments: { id: string }[]
}

const CATEGORY_LABEL: Record<string, string> = { eat: 'Restaurant', hotel: 'Stay', store: 'Store', organisation: 'Animal Sanctuary', event: 'Event' }
const CATEGORY_EMOJI: Record<string, string> = { eat: '🌿', hotel: '🛏️', store: '🛍️', organisation: '🐾', event: '🎉' }

function getGradeColor(g: string) { return g.startsWith('A') ? 'text-emerald-500' : g === 'B' ? 'text-green-500' : g === 'C' ? 'text-yellow-500' : g === 'D' ? 'text-orange-500' : 'text-red-500' }
function getScoreBarColor(s: number) { return s >= 80 ? 'bg-emerald-500' : s >= 65 ? 'bg-green-500' : s >= 50 ? 'bg-yellow-500' : s >= 35 ? 'bg-orange-500' : 'bg-red-500' }
function timeAgo(d: string) { const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000); return m < 60 ? `${m}m` : m < 1440 ? `${Math.floor(m/60)}h` : m < 43200 ? `${Math.floor(m/1440)}d` : `${Math.floor(m/43200)}mo` }

interface Props {
  topCities: CityScoreData[]
  recentPosts: CompactPost[]
  cityImages?: Record<string, string>
}

function HomeContent({ topCities, recentPosts, cityImages: serverCityImages = {} }: Props) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [isCreatePostOpen, setIsCreatePostOpen] = useState(false)
  const [isAddPlaceOpen, setIsAddPlaceOpen] = useState(false)
  const { user, profile } = useAuth()

  const [nearbyPlaces, setNearbyPlaces] = useState<NearbyPlace[]>([])
  const [nearbySanctuaries, setNearbySanctuaries] = useState<NearbyPlace[]>([])
  const [nearbyStays, setNearbyStays] = useState<NearbyPlace[]>([])
  const [cityScore, setCityScore] = useState<CityScoreData | null>(null)
  const [userCity, setUserCity] = useState('')
  const [userCountry, setUserCountry] = useState('')
  const [cityImageUrl, setCityImageUrl] = useState<string | null>(null)
  const [cityImageFailed, setCityImageFailed] = useState(false)

  useEffect(() => {
    if (searchParams?.get('create') === 'true' && user) {
      setIsCreatePostOpen(true)
      router.replace('/', { scroll: false })
    }
  }, [searchParams, user, router])

  const [stats, setStats] = useState<{ totalPlaces: number; fullyVegan: number; restaurants: number; stores: number; stays: number; sanctuaries: number; countries: number; cities: number } | null>(null)

  // Load location-aware data with localStorage caching
  const [locationLoading, setLocationLoading] = useState(true)

  useEffect(() => {
    const CACHE_KEY = 'plantspack_home_cache'
    const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

    function applyData(data: any, city: string, country: string) {
      setCityScore(data.userCityScore)
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
  }, [])

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
            {/* Value prop + search */}
            {user ? (
              <h1 className="text-2xl font-headline font-bold text-on-surface tracking-tight">
                Hello, {profile?.first_name || profile?.username || 'Friend'}!
              </h1>
            ) : (
              <div>
                <h1 className="text-2xl font-headline font-bold text-on-surface tracking-tight mb-1">
                  {stats ? `${stats.totalPlaces.toLocaleString()} vegan places across ${stats.countries} countries` : 'Discover vegan places worldwide'}
                </h1>
                <p className="text-sm text-on-surface-variant">Free, no ads, community-driven.</p>
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
                  {localStorage.getItem('pinned_city_name') && (
                    <span className="text-primary font-medium ml-1">(pinned)</span>
                  )}
                </span>
                <button onClick={() => setShowCitySearch(true)} className="text-primary hover:underline font-medium">
                  Choose a different city
                </button>
                {localStorage.getItem('pinned_city_name') && (
                  <button onClick={() => {
                    localStorage.removeItem('pinned_city')
                    localStorage.removeItem('pinned_city_name')
                    localStorage.removeItem('pinned_country_name')
                    localStorage.removeItem('plantspack_home_cache')
                    window.location.reload()
                  }} className="text-on-surface-variant hover:text-primary hover:underline font-medium">
                    Use my location
                  </button>
                )}
              </div>
            )}

            {/* User contribution counter */}
            {user && stats && userContributions !== null && (
              <p className="text-xs text-on-surface-variant">
                Together we&apos;ve mapped <strong className="text-on-surface">{stats.totalPlaces.toLocaleString()}</strong> places.
                {userContributions > 0
                  ? <> You&apos;ve contributed <strong className="text-on-surface">{userContributions}</strong>!</>
                  : <> <button onClick={() => setIsAddPlaceOpen(true)} className="text-primary hover:underline font-medium">Add your first place!</button></>
                }
              </p>
            )}

            {/* City Score Hero */}
            {(cityScore || userCity) && (
              <div className="bg-surface-container-lowest rounded-2xl editorial-shadow overflow-hidden">
                {cityImageUrl && !cityImageFailed && (
                  <div className="relative h-32 overflow-hidden">
                    <img src={cityImageUrl} alt={userCity} className="w-full h-full object-cover" onError={() => setCityImageFailed(true)} />
                    <div className="absolute inset-0 bg-gradient-to-t from-surface-container-lowest/90 to-transparent" />
                  </div>
                )}
                <div className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2 text-sm text-on-surface-variant">
                      <MapPin className="h-4 w-4" />
                      <span>{userCity || cityScore?.city}{(userCountry || cityScore?.country) ? `, ${userCountry || cityScore?.country}` : ''}</span>
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
                        {cityScore.score < 65 && ` · Add places to reach ${cityScore.score < 35 ? 'D' : cityScore.score < 50 ? 'C' : 'B'}!`}
                      </p>
                    </>
                  ) : (
                    <p className="text-sm text-on-surface-variant mb-3">No vegan score yet for {userCity} — be the first to add a place!</p>
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
            )}

            {/* Nearby Places */}
            {/* My followed cities */}
            <MyCities />

            {filteredNearby.length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-semibold text-on-surface">Vegan places near you</h2>
                  <Link href="/map" className="text-xs text-primary font-medium hover:underline">View on map</Link>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {filteredNearby.map(place => (
                    <div key={place.id} className="bg-surface-container-lowest rounded-xl ghost-border hover:border-primary/20 transition-all overflow-hidden">
                      {(place.main_image_url || place.images?.[0]) ? (
                        <Link href={`/place/${place.slug || place.id}`}>
                          <img src={place.main_image_url || place.images[0]} alt={place.name} className="w-full h-28 object-cover" />
                        </Link>
                      ) : (
                        <Link href={`/place/${place.slug || place.id}`} className="flex items-center justify-center h-28 bg-surface-container-low text-3xl">
                          {CATEGORY_EMOJI[place.category] || '📍'}
                        </Link>
                      )}
                      <div className="p-3">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <Link href={`/place/${place.slug || place.id}`} className="font-medium text-sm text-on-surface hover:text-primary truncate">
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
                        <Link href={`/place/${place.slug || place.id}`}
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
                      {(s.main_image_url || s.images?.[0]) && <img src={s.main_image_url || s.images[0]} alt="" className="w-full h-24 rounded-lg object-cover mb-2" />}
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
                      {(s.main_image_url || s.images?.[0]) && <img src={s.main_image_url || s.images[0]} alt="" className="w-full h-24 rounded-lg object-cover mb-2" />}
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
              <PostList posts={recentPosts} />
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

// Static post list — renders SSR posts without client-side fetch
function PostList({ posts }: { posts: CompactPost[] }) {
  if (posts.length === 0) return <p className="text-xs text-on-surface-variant text-center py-4">No posts yet</p>

  return (
    <div className="space-y-2">
      {posts.map(post => {
        const content = post.title || post.content || ''
        const truncated = content.length > 140 ? content.slice(0, 140) + '...' : content
        const postUrl = post.category === 'recipe' && post.slug ? `/recipe/${post.slug}` : `/post/${post.id}`
        const u = post.users as any
        const likes = post.post_reactions?.length || 0
        const comments = post.comments?.length || 0
        const thumb = post.images?.[0] || post.image_url

        return (
          <Link key={post.id} href={postUrl} className="block p-2.5 bg-surface-container-lowest rounded-lg ghost-border hover:border-primary/15 transition-all">
            <div className="flex gap-2.5">
              {thumb && <img src={thumb} alt="" className="w-14 h-14 rounded-lg object-cover flex-shrink-0" />}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-1">
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
      })}
      <Link href="/feed" className="block text-center text-xs text-primary font-medium hover:underline py-2">View full feed</Link>
    </div>
  )
}

export default function HomeClient(props: Props) {
  return (
    <Suspense fallback={null}>
      <HomeContent {...props} />
    </Suspense>
  )
}
