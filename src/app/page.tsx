'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { MapPin, Star, ChevronRight, Plus, TrendingUp, Heart } from 'lucide-react'
import Feed from "@/components/posts/Feed"
import CreatePostModal from "@/components/posts/CreatePostModal"
import { useAuth } from "@/lib/auth"
import { supabase } from '@/lib/supabase'

export default function Home() {
  return (
    <Suspense fallback={null}>
      <HomeContent />
    </Suspense>
  )
}

interface NearbyPlace {
  id: string; name: string; slug: string; category: string
  vegan_level: string; main_image_url: string | null; images: string[]
  latitude: number; longitude: number; city: string; country: string
  average_rating: number | null; distance?: number
}

interface CityScoreData {
  city: string; country: string; score: number; grade: string; fvCount: number
}

const CATEGORY_EMOJI: Record<string, string> = {
  eat: '🌿', hotel: '🛏️', store: '🛍️', organisation: '🐾', event: '🎉', other: '📍'
}
const CATEGORY_LABEL: Record<string, string> = {
  eat: 'Restaurant', hotel: 'Stay', store: 'Store', organisation: 'Animal Sanctuary', event: 'Event', other: 'Other'
}

function getGradeColor(grade: string) {
  if (grade.startsWith('A')) return 'text-emerald-500'
  if (grade === 'B') return 'text-green-500'
  if (grade === 'C') return 'text-yellow-500'
  if (grade === 'D') return 'text-orange-500'
  return 'text-red-500'
}

function getScoreBarColor(score: number) {
  if (score >= 80) return 'bg-emerald-500'
  if (score >= 65) return 'bg-green-500'
  if (score >= 50) return 'bg-yellow-500'
  if (score >= 35) return 'bg-orange-500'
  return 'bg-red-500'
}

function distanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function HomeContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [isCreatePostOpen, setIsCreatePostOpen] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const { user, profile } = useAuth()

  const [userCity, setUserCity] = useState<string>('')
  const [userCountry, setUserCountry] = useState<string>('')
  const [nearbyPlaces, setNearbyPlaces] = useState<NearbyPlace[]>([])
  const [nearbySanctuaries, setNearbySanctuaries] = useState<NearbyPlace[]>([])
  const [nearbyStays, setNearbyStays] = useState<NearbyPlace[]>([])
  const [cityScore, setCityScore] = useState<CityScoreData | null>(null)
  const [topCities, setTopCities] = useState<CityScoreData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (searchParams?.get('create') === 'true' && user) {
      setIsCreatePostOpen(true)
      router.replace('/', { scroll: false })
    }
  }, [searchParams, user, router])

  // Load location-aware data
  useEffect(() => {
    async function loadData() {
      setLoading(true)

      // Wait a bit for geolocation to populate sessionStorage
      await new Promise(r => setTimeout(r, 1500))

      const lat = parseFloat(sessionStorage.getItem('user_lat') || '0')
      const lng = parseFloat(sessionStorage.getItem('user_lng') || '0')
      const ipCity = sessionStorage.getItem('user_city') || ''
      const ipCountry = sessionStorage.getItem('user_country') || ''

      // Fetch nearby places
      if (lat && lng) {
        const { data } = await supabase
          .from('places')
          .select('id, name, slug, category, vegan_level, main_image_url, images, latitude, longitude, city, country, average_rating')
          .gte('latitude', lat - 0.5).lte('latitude', lat + 0.5)
          .gte('longitude', lng - 1).lte('longitude', lng + 1)
          .limit(100)

        if (data && data.length > 0) {
          const withDist = data.map(p => ({ ...p, distance: distanceKm(lat, lng, p.latitude, p.longitude) }))
            .sort((a, b) => a.distance - b.distance)

          setNearbyPlaces(withDist.filter(p => p.category === 'eat').slice(0, 5))
          setNearbySanctuaries(withDist.filter(p => p.category === 'organisation').slice(0, 3))
          setNearbyStays(withDist.filter(p => p.category === 'hotel').slice(0, 3))

          // Detect user city from nearest place
          if (withDist[0]) {
            setUserCity(withDist[0].city)
            setUserCountry(withDist[0].country)
          }
        } else if (ipCity) {
          setUserCity(ipCity)
          setUserCountry(ipCountry)
        }
      } else if (ipCity) {
        setUserCity(ipCity)
        setUserCountry(ipCountry)
      }

      // Fetch top cities for rankings (lightweight — use precomputed from vegan-score)
      const { data: allPlaces } = await supabase
        .from('places')
        .select('city, country, vegan_level')
        .limit(5000)

      if (allPlaces) {
        const byCity: Record<string, { total: number; fv: number; country: string }> = {}
        for (const p of allPlaces) {
          if (!p.city) continue
          if (!byCity[p.city]) byCity[p.city] = { total: 0, fv: 0, country: p.country }
          byCity[p.city].total++
          if (p.vegan_level === 'fully_vegan') byCity[p.city].fv++
        }

        // Simple scoring for top cities display
        const cities = Object.entries(byCity)
          .filter(([, v]) => v.fv >= 1)
          .map(([city, v]) => {
            const score = Math.min(100, Math.round(
              Math.min(20, v.fv * 4) + // presence
              Math.min(20, (v.fv / v.total) * 20) + // concentration
              (v.fv >= 3 ? 12 : 0) // variety placeholder
            ))
            const grade = score >= 90 ? 'A+' : score >= 80 ? 'A' : score >= 65 ? 'B' : score >= 50 ? 'C' : score >= 35 ? 'D' : 'F'
            return { city, country: v.country, score, grade, fvCount: v.fv }
          })
          .sort((a, b) => b.score - a.score)

        setTopCities(cities.slice(0, 8))

        // Find current city score
        if (userCity || ipCity) {
          const match = cities.find(c => c.city === (userCity || ipCity))
          if (match) setCityScore(match)
        }
      }

      setLoading(false)
    }
    loadData()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Update city score when userCity changes
  useEffect(() => {
    if (!userCity || topCities.length === 0) return
    const match = topCities.find(c => c.city === userCity)
    if (match) setCityScore(match)
  }, [userCity, topCities])

  const handlePostCreated = () => { setRefreshKey(prev => prev + 1); setIsCreatePostOpen(false) }
  const greeting = user ? `Hello, ${profile?.first_name || profile?.username || 'Friend'}!` : 'Welcome to PlantsPack'

  return (
    <div className="min-h-screen bg-surface">
      <div className="max-w-6xl mx-auto px-4 md:px-8 py-6">
        <div className="flex gap-6">
          {/* Main content */}
          <div className="flex-1 min-w-0 space-y-6">
            {/* Greeting */}
            <h1 className="text-2xl font-headline font-bold text-on-surface tracking-tight">
              {greeting}
            </h1>

            {/* City Score Hero */}
            {(cityScore || userCity) && (
              <div className="bg-surface-container-lowest rounded-2xl editorial-shadow p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2 text-sm text-on-surface-variant">
                    <MapPin className="h-4 w-4" />
                    <span>{userCity}{userCountry ? `, ${userCountry}` : ''}</span>
                  </div>
                  {cityScore && (
                    <span className={`text-3xl font-black ${getGradeColor(cityScore.grade)}`}>{cityScore.grade}</span>
                  )}
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
                      {cityScore.fvCount} fully-vegan {cityScore.fvCount === 1 ? 'place' : 'places'}
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-on-surface-variant mb-3">No vegan score yet for {userCity}</p>
                )}
                <div className="flex gap-2">
                  <Link href="/map" className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium silk-gradient text-on-primary-btn rounded-lg hover:opacity-90 transition-colors">
                    <Plus className="h-3 w-3" /> Add a place
                  </Link>
                  <Link href="/vegan-score" className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-primary ghost-border rounded-lg hover:bg-primary/5 transition-colors">
                    <TrendingUp className="h-3 w-3" /> Full rankings
                  </Link>
                </div>
              </div>
            )}

            {/* Nearby Vegan Places */}
            {nearbyPlaces.length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-semibold text-on-surface">Vegan places near you</h2>
                  <Link href="/map" className="text-xs text-primary font-medium hover:underline">View all</Link>
                </div>
                <div className="space-y-2">
                  {nearbyPlaces.map(place => (
                    <Link key={place.id} href={`/place/${place.slug || place.id}`}
                      className="flex items-center gap-3 p-3 bg-surface-container-lowest rounded-xl ghost-border hover:border-primary/20 transition-all">
                      {(place.main_image_url || place.images?.[0]) ? (
                        <img src={place.main_image_url || place.images[0]} alt="" className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-surface-container-low flex items-center justify-center text-xl flex-shrink-0">
                          {CATEGORY_EMOJI[place.category] || '📍'}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-on-surface truncate">{place.name}</p>
                        <p className="text-xs text-on-surface-variant">
                          {CATEGORY_LABEL[place.category]} · {place.distance ? `${place.distance.toFixed(1)} km` : place.city}
                        </p>
                      </div>
                      <div className="flex-shrink-0">
                        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                          place.vegan_level === 'fully_vegan' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                        }`}>
                          {place.vegan_level === 'fully_vegan' ? '100% Vegan' : 'Vegan-Friendly'}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* Nearby Sanctuaries */}
            {nearbySanctuaries.length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-semibold text-on-surface flex items-center gap-2">
                    <span>🐾</span> Nearby sanctuaries to support
                  </h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {nearbySanctuaries.map(s => (
                    <Link key={s.id} href={`/place/${s.slug || s.id}`}
                      className="p-3 bg-surface-container-lowest rounded-xl ghost-border hover:border-primary/20 transition-all">
                      {(s.main_image_url || s.images?.[0]) && (
                        <img src={s.main_image_url || s.images[0]} alt="" className="w-full h-24 rounded-lg object-cover mb-2" />
                      )}
                      <p className="font-medium text-sm text-on-surface truncate">{s.name}</p>
                      <p className="text-xs text-on-surface-variant">{s.distance ? `${s.distance.toFixed(0)} km away` : s.city}</p>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* Nearby Stays */}
            {nearbyStays.length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-semibold text-on-surface flex items-center gap-2">
                    <span>🛏️</span> Vegan stays nearby
                  </h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {nearbyStays.map(s => (
                    <Link key={s.id} href={`/place/${s.slug || s.id}`}
                      className="p-3 bg-surface-container-lowest rounded-xl ghost-border hover:border-primary/20 transition-all">
                      {(s.main_image_url || s.images?.[0]) && (
                        <img src={s.main_image_url || s.images[0]} alt="" className="w-full h-24 rounded-lg object-cover mb-2" />
                      )}
                      <p className="font-medium text-sm text-on-surface truncate">{s.name}</p>
                      <p className="text-xs text-on-surface-variant">{s.distance ? `${s.distance.toFixed(0)} km away` : s.city}</p>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* Top Vegan Cities */}
            {topCities.length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-semibold text-on-surface flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-primary" /> Top vegan cities
                  </h2>
                  <Link href="/vegan-score" className="text-xs text-primary font-medium hover:underline">Full rankings</Link>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {topCities.map((city, i) => (
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

            {/* Loading state */}
            {loading && (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => <div key={i} className="h-20 bg-surface-container-low rounded-xl animate-pulse" />)}
              </div>
            )}
          </div>

          {/* Right Sidebar — Community Feed */}
          <div className="hidden xl:block w-72 flex-shrink-0">
            <div className="sticky top-24 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-on-surface text-sm">Community</h3>
                {user && (
                  <button
                    onClick={() => setIsCreatePostOpen(true)}
                    className="text-xs text-primary font-medium hover:underline"
                  >
                    Create post
                  </button>
                )}
              </div>
              <div className="max-h-[calc(100vh-150px)] overflow-y-auto">
                <Feed key={refreshKey} onPostCreated={handlePostCreated} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Create Post FAB */}
      {user && (
        <button
          onClick={() => setIsCreatePostOpen(true)}
          className="xl:hidden fixed bottom-24 right-6 lg:bottom-6 silk-gradient text-on-primary-btn p-4 rounded-full shadow-editorial transition-all hover:opacity-90 active:scale-95 z-40"
        >
          <span className="material-symbols-outlined text-2xl">edit_square</span>
        </button>
      )}

      <CreatePostModal
        isOpen={isCreatePostOpen}
        onClose={() => setIsCreatePostOpen(false)}
        onPostCreated={handlePostCreated}
      />
    </div>
  )
}
