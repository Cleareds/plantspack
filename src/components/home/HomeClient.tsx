'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { MapPin, Plus, TrendingUp, Star, Heart, MessageCircle, Share2 } from 'lucide-react'
import CreatePostModal from "@/components/posts/CreatePostModal"
import AddPlaceModal from "@/components/places/AddPlaceModal"
import { useAuth } from "@/lib/auth"

interface NearbyPlace {
  id: string; name: string; slug: string; category: string
  vegan_level: string; main_image_url: string | null; images: string[]
  city: string; country: string; average_rating: number | null; distance?: number
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
}

function HomeContent({ topCities, recentPosts }: Props) {
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

  // Load location-aware data
  useEffect(() => {
    async function load() {
      await new Promise(r => setTimeout(r, 1200))
      const lat = sessionStorage.getItem('user_lat') || ''
      const lng = sessionStorage.getItem('user_lng') || ''
      const city = sessionStorage.getItem('user_city') || ''
      const country = sessionStorage.getItem('user_country') || ''

      const params = new URLSearchParams()
      if (lat) params.set('lat', lat)
      if (lng) params.set('lng', lng)
      if (city) params.set('city', city)

      try {
        const res = await fetch(`/api/home?${params}`)
        const data = await res.json()
        setCityScore(data.userCityScore)
        setNearbyPlaces(data.nearbyPlaces || [])
        setNearbySanctuaries(data.nearbySanctuaries || [])
        setNearbyStays(data.nearbyStays || [])
        if (data.nearbyPlaces?.[0]) {
          setUserCity(data.nearbyPlaces[0].city)
          setUserCountry(data.nearbyPlaces[0].country)
        } else if (city) { setUserCity(city); setUserCountry(country) }
      } catch {}

      // Load city image
      if (city || lat) {
        try {
          const imgs = await fetch('/data/city-images.json').then(r => r.json())
          const detectedCity = sessionStorage.getItem('user_city') || ''
          const detectedCountry = sessionStorage.getItem('user_country') || ''
          const url = imgs[`${detectedCity}|||${detectedCountry}`] || null
          if (url) setCityImageUrl(url)
        } catch {}
      }
    }
    load()
  }, [])

  const greeting = user ? `Hello, ${profile?.first_name || profile?.username || 'Friend'}!` : 'Welcome to PlantsPack'

  return (
    <div className="min-h-screen bg-surface">
      <div className="max-w-6xl mx-auto px-4 md:px-8 py-6">
        <div className="xl:flex xl:gap-6">
          {/* Main content */}
          <div className="flex-1 min-w-0 space-y-6">
            <h1 className="text-2xl font-headline font-bold text-on-surface tracking-tight">{greeting}</h1>

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
                      className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium silk-gradient text-on-primary-btn rounded-lg hover:opacity-90 transition-colors">
                      <Plus className="h-3 w-3" /> Add a place to boost the score
                    </button>
                    <Link href="/vegan-score" className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-primary ghost-border rounded-lg hover:bg-primary/5 transition-colors">
                      <TrendingUp className="h-3 w-3" /> Full rankings
                    </Link>
                  </div>
                </div>
              </div>
            )}

            {/* Nearby Places */}
            {nearbyPlaces.length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-semibold text-on-surface">Vegan places near you</h2>
                  <Link href="/map" className="text-xs text-primary font-medium hover:underline">View on map</Link>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {nearbyPlaces.map(place => (
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
                <p className="text-[10px] text-on-surface-variant/60 text-center mt-2">Reviews help increase your city&apos;s Vegan Score</p>
              </section>
            )}

            {/* Sanctuaries */}
            {nearbySanctuaries.length > 0 && (
              <section>
                <h2 className="font-semibold text-on-surface flex items-center gap-2 mb-3">🐾 Nearby sanctuaries to support</h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {nearbySanctuaries.map(s => (
                    <Link key={s.id} href={`/place/${s.slug || s.id}`} className="p-3 bg-surface-container-lowest rounded-xl ghost-border hover:border-primary/20 transition-all">
                      {(s.main_image_url || s.images?.[0]) && <img src={s.main_image_url || s.images[0]} alt="" className="w-full h-24 rounded-lg object-cover mb-2" />}
                      <p className="font-medium text-sm text-on-surface truncate">{s.name}</p>
                      <p className="text-xs text-on-surface-variant">{s.distance ? `${s.distance} km away` : s.city}</p>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* Stays */}
            {nearbyStays.length > 0 && (
              <section>
                <h2 className="font-semibold text-on-surface flex items-center gap-2 mb-3">🛏️ Vegan stays nearby</h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {nearbyStays.map(s => (
                    <Link key={s.id} href={`/place/${s.slug || s.id}`} className="p-3 bg-surface-container-lowest rounded-xl ghost-border hover:border-primary/20 transition-all">
                      {(s.main_image_url || s.images?.[0]) && <img src={s.main_image_url || s.images[0]} alt="" className="w-full h-24 rounded-lg object-cover mb-2" />}
                      <p className="font-medium text-sm text-on-surface truncate">{s.name}</p>
                      <p className="text-xs text-on-surface-variant">{s.distance ? `${s.distance} km away` : s.city}</p>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* Top Cities — SSR data */}
            {topCities.length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-semibold text-on-surface flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-primary" /> Top vegan cities
                  </h2>
                  <Link href="/vegan-score" className="text-xs text-primary font-medium hover:underline">Full rankings</Link>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {topCities.map(city => (
                    <Link key={city.city} href={`/vegan-places/${city.country.toLowerCase().replace(/\s+/g, '-')}/${city.city.toLowerCase().replace(/\s+/g, '-')}`}
                      className="p-3 bg-surface-container-lowest rounded-xl ghost-border hover:border-primary/20 transition-all text-center">
                      <span className={`text-xl font-black ${getGradeColor(city.grade)}`}>{city.grade}</span>
                      <p className="font-medium text-sm text-on-surface truncate mt-1">{city.city}</p>
                      <p className="text-[10px] text-on-surface-variant">{city.fvCount} vegan places</p>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* Community Feed — mobile only */}
            <section className="xl:hidden">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold text-on-surface">Community</h2>
                <Link href="/feed" className="text-xs text-primary font-medium hover:underline">View all</Link>
              </div>
              <PostList posts={recentPosts} />
            </section>
          </div>

          {/* Desktop Right Sidebar */}
          <div className="hidden xl:block w-72 flex-shrink-0">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-on-surface text-sm">Community</h3>
              <Link href="/feed" className="text-xs text-primary font-medium hover:underline">View all</Link>
            </div>
            <PostList posts={recentPosts} />
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

      {user && (
        <button onClick={() => setIsCreatePostOpen(true)}
          className="xl:hidden fixed bottom-24 right-6 lg:bottom-6 silk-gradient text-on-primary-btn p-4 rounded-full shadow-editorial transition-all hover:opacity-90 active:scale-95 z-40">
          <span className="material-symbols-outlined text-2xl">edit_square</span>
        </button>
      )}

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
