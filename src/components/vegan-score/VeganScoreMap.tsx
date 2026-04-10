'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { Search, Info, X, TrendingUp, MapPin, ChevronRight, Plus } from 'lucide-react'
import { createClient } from '@/lib/supabase'

// Dynamic imports for react-leaflet (SSR-safe)
const LeafletMapContainer = dynamic(() => import('react-leaflet').then(mod => mod.MapContainer), { ssr: false })
const TileLayer = dynamic(() => import('react-leaflet').then(mod => mod.TileLayer), { ssr: false })
const Marker = dynamic(() => import('react-leaflet').then(mod => mod.Marker), { ssr: false })
const Popup = dynamic(() => import('react-leaflet').then(mod => mod.Popup), { ssr: false })

const MarkerClusterGroup = dynamic(
  () => import('react-leaflet-cluster').then(mod => mod.default),
  { ssr: false }
)

// Map event handler for viewport changes
const MapEventHandler = dynamic(() =>
  import('react-leaflet').then(mod => {
    const { useMap } = mod
    return function MapEventHandlerComponent({ onMove }: { onMove: (bounds: any) => void }) {
      const map = useMap()
      useEffect(() => {
        const handler = () => {
          const b = map.getBounds()
          onMove({ south: b.getSouth(), north: b.getNorth(), west: b.getWest(), east: b.getEast(), zoom: map.getZoom() })
        }
        // Fire once on mount
        handler()
        map.on('moveend', handler)
        map.on('zoomend', handler)
        return () => { map.off('moveend', handler); map.off('zoomend', handler) }
      }, [map, onMove])
      return null
    }
  }),
  { ssr: false }
)

// Category config with colors and icons
const CATEGORY_CONFIG: Record<string, { color: string; emoji: string; label: string }> = {
  eat: { color: '#22c55e', emoji: '🌿', label: 'Restaurant' },
  hotel: { color: '#3b82f6', emoji: '🛏️', label: 'Stay' },
  store: { color: '#a855f7', emoji: '🛍️', label: 'Store' },
  organisation: { color: '#f97316', emoji: '🐾', label: 'Sanctuary' },
  event: { color: '#ec4899', emoji: '🎉', label: 'Event' },
  other: { color: '#6b7280', emoji: '📍', label: 'Other' },
}

interface Place {
  id: string
  name: string
  slug: string
  category: string
  latitude: number
  longitude: number
  vegan_level: string
  address: string
  city: string
  country: string
  main_image_url: string | null
  images: string[]
  average_rating: number | null
  description: string | null
  website: string | null
}

interface CityScore {
  city: string
  country: string
  score: number
  grade: string
  placeCount: number
  breakdown: { density: number; variety: number; quality: number }
}

function calculateScore(places: Place[]): { score: number; grade: string; breakdown: { density: number; variety: number; quality: number } } {
  if (places.length === 0) return { score: 0, grade: 'F', breakdown: { density: 0, variety: 0, quality: 0 } }

  // Density: up to 40 points based on place count
  const density = Math.min(40, places.length * 2.5)

  // Variety: up to 30 points based on category diversity
  const categories = new Set(places.map(p => p.category))
  const hasEat = categories.has('eat')
  const hasStay = categories.has('hotel')
  const hasSanctuary = categories.has('organisation')
  const hasStore = categories.has('store')
  const variety = Math.min(30,
    (hasEat ? 10 : 0) +
    (hasStay ? 8 : 0) +
    (hasSanctuary ? 7 : 0) +
    (hasStore ? 5 : 0) +
    categories.size * 2
  )

  // Quality: up to 30 points based on vegan level + ratings
  const fullyVegan = places.filter(p => p.vegan_level === 'fully_vegan').length
  const fullyVeganRatio = fullyVegan / places.length
  const rated = places.filter(p => p.average_rating && p.average_rating > 0)
  const avgRating = rated.length > 0 ? rated.reduce((s, p) => s + (p.average_rating || 0), 0) / rated.length : 0
  const quality = Math.min(30,
    fullyVeganRatio * 20 +
    (avgRating / 5) * 10
  )

  const score = Math.round(Math.min(100, density + variety + quality))
  const grade = score >= 90 ? 'A+' : score >= 80 ? 'A' : score >= 65 ? 'B' : score >= 50 ? 'C' : score >= 35 ? 'D' : 'F'

  return { score, grade, breakdown: { density: Math.round(density), variety: Math.round(variety), quality: Math.round(quality) } }
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

export default function VeganScoreMap() {
  const [places, setPlaces] = useState<Place[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [mapCenter, setMapCenter] = useState<[number, number]>([48.8, 10.5]) // Central Europe
  const [zoom, setZoom] = useState(5)
  const [showInfo, setShowInfo] = useState(false)
  const [cityScores, setCityScores] = useState<CityScore[]>([])
  const [selectedCity, setSelectedCity] = useState<CityScore | null>(null)
  const [icons, setIcons] = useState<Record<string, any>>({})
  const [clusterIcon, setClusterIcon] = useState<any>(null)
  const mapRef = useRef<any>(null)

  // Initialize Leaflet icons
  useEffect(() => {
    if (typeof window === 'undefined') return
    import('leaflet').then(L => {
      const makeIcon = (color: string, emoji: string) =>
        new L.DivIcon({
          html: `<div style="
            width: 32px; height: 32px; border-radius: 50%;
            background: ${color}; border: 2.5px solid #fff;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            display: flex; align-items: center; justify-content: center;
            font-size: 16px; line-height: 1;
          ">${emoji}</div>`,
          className: 'leaflet-score-marker',
          iconSize: [32, 32],
          iconAnchor: [16, 16],
          popupAnchor: [0, -18],
        })

      const newIcons: Record<string, any> = {}
      for (const [cat, cfg] of Object.entries(CATEGORY_CONFIG)) {
        newIcons[cat] = makeIcon(cfg.color, cfg.emoji)
      }
      setIcons(newIcons)

      // Cluster icon creator
      setClusterIcon(() => (cluster: any) => {
        const count = cluster.getChildCount()
        const diameter = count >= 100 ? 48 : count >= 10 ? 42 : 36
        return new L.DivIcon({
          html: `<div style="
            width: ${diameter}px; height: ${diameter}px; border-radius: 50%;
            background: linear-gradient(135deg, #22c55e, #16a34a); border: 3px solid #fff;
            box-shadow: 0 2px 10px rgba(0,0,0,0.25);
            display: flex; align-items: center; justify-content: center;
            color: #fff; font-weight: 700; font-size: ${count >= 100 ? 14 : 13}px;
            font-family: system-ui, sans-serif;
          ">${count}</div>`,
          className: 'leaflet-cluster-score',
          iconSize: [diameter, diameter],
        })
      })
    })
  }, [])

  // Fetch all places for scoring
  useEffect(() => {
    const supabase = createClient()
    async function fetchPlaces() {
      setLoading(true)
      const { data } = await supabase
        .from('places')
        .select('id, name, slug, category, latitude, longitude, vegan_level, address, city, country, main_image_url, images, average_rating, description, website')
        .order('name')
        .limit(5000)

      if (data) {
        setPlaces(data as Place[])

        // Calculate city scores
        const byCity: Record<string, Place[]> = {}
        for (const p of data) {
          const key = `${p.city}|||${p.country}`
          if (!byCity[key]) byCity[key] = []
          byCity[key].push(p as Place)
        }

        const scores: CityScore[] = Object.entries(byCity)
          .filter(([, ps]) => ps.length >= 2) // need at least 2 places
          .map(([key, ps]) => {
            const [city, country] = key.split('|||')
            const { score, grade, breakdown } = calculateScore(ps)
            return { city, country, score, grade, placeCount: ps.length, breakdown }
          })
          .sort((a, b) => b.score - a.score)

        setCityScores(scores)
      }
      setLoading(false)
    }
    fetchPlaces()
  }, [])

  // Search handler
  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) return
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1`)
      const data = await res.json()
      if (data[0]) {
        const lat = parseFloat(data[0].lat)
        const lon = parseFloat(data[0].lon)
        setMapCenter([lat, lon])
        setZoom(12)
        mapRef.current?.flyTo([lat, lon], 12, { duration: 1.5 })

        // Find the city score
        const match = cityScores.find(c =>
          searchQuery.toLowerCase().includes(c.city.toLowerCase()) ||
          c.city.toLowerCase().includes(searchQuery.toLowerCase())
        )
        if (match) setSelectedCity(match)
      }
    } catch {}
  }, [searchQuery, cityScores])

  const handleMapMove = useCallback(() => {}, [])

  const topCities = cityScores.slice(0, 20)

  return (
    <div className="min-h-screen bg-[#f8faf5] flex flex-col">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-xl border-b border-gray-100 px-4 py-3 z-50 relative">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2">
              <img src="/plantspack-logo-real.svg" alt="PlantsPack" className="h-8 w-auto" />
            </Link>
            <div className="hidden sm:block">
              <h1 className="text-lg font-bold text-gray-900 leading-tight">Vegan Score</h1>
              <p className="text-xs text-gray-500">How vegan-friendly is your city?</p>
            </div>
          </div>

          {/* Search */}
          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search a city..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-full bg-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
              />
            </div>
          </div>

          {/* Info button */}
          <button
            onClick={() => setShowInfo(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-600 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
          >
            <Info className="h-4 w-4" />
            <span className="hidden sm:inline">How it works</span>
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar — City Rankings */}
        <div className="hidden lg:flex flex-col w-80 bg-white border-r border-gray-100 overflow-y-auto">
          <div className="p-4 border-b border-gray-100">
            <h2 className="font-bold text-gray-900 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-emerald-500" />
              City Rankings
            </h2>
            <p className="text-xs text-gray-500 mt-1">{cityScores.length} cities scored</p>
          </div>

          {loading ? (
            <div className="p-4 space-y-3">
              {[...Array(8)].map((_, i) => <div key={i} className="h-12 bg-gray-100 rounded-lg animate-pulse" />)}
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {topCities.map((city, i) => (
                <button
                  key={`${city.city}-${city.country}`}
                  onClick={() => {
                    setSelectedCity(city)
                    setSearchQuery(city.city)
                    handleSearch()
                  }}
                  className={`w-full text-left px-4 py-3 hover:bg-emerald-50/50 transition-colors ${
                    selectedCity?.city === city.city ? 'bg-emerald-50' : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-gray-400 w-5">#{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 text-sm truncate">{city.city}</p>
                      <p className="text-xs text-gray-500">{city.country} · {city.placeCount} places</p>
                    </div>
                    <div className="text-right">
                      <span className={`text-lg font-bold ${getGradeColor(city.grade)}`}>{city.grade}</span>
                      <p className="text-xs text-gray-400">{city.score}/100</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Add place CTA */}
          <div className="p-4 mt-auto border-t border-gray-100">
            <Link
              href="/map"
              className="flex items-center justify-center gap-2 w-full px-4 py-2.5 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors"
            >
              <Plus className="h-4 w-4" />
              Add a place & boost your city
            </Link>
          </div>
        </div>

        {/* Map */}
        <div className="flex-1 relative">
          {/* Selected city score overlay */}
          {selectedCity && (
            <div className="absolute top-4 left-4 z-[1000] bg-white rounded-2xl shadow-lg border border-gray-100 p-4 max-w-xs">
              <button onClick={() => setSelectedCity(null)} className="absolute top-2 right-2 text-gray-400 hover:text-gray-600">
                <X className="h-4 w-4" />
              </button>
              <div className="flex items-start gap-3 mb-3">
                <div className={`text-3xl font-black ${getGradeColor(selectedCity.grade)}`}>
                  {selectedCity.grade}
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">{selectedCity.city}</h3>
                  <p className="text-xs text-gray-500">{selectedCity.country} · {selectedCity.placeCount} places</p>
                </div>
              </div>
              {/* Score bar */}
              <div className="mb-3">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>Vegan Score</span>
                  <span className="font-bold text-gray-900">{selectedCity.score}/100</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${getScoreBarColor(selectedCity.score)} transition-all`} style={{ width: `${selectedCity.score}%` }} />
                </div>
              </div>
              {/* Breakdown */}
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-500">Density</span>
                  <span className="font-medium text-gray-700">{selectedCity.breakdown.density}/40</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Variety</span>
                  <span className="font-medium text-gray-700">{selectedCity.breakdown.variety}/30</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Quality</span>
                  <span className="font-medium text-gray-700">{selectedCity.breakdown.quality}/30</span>
                </div>
              </div>
              <Link
                href={`/vegan-places/${selectedCity.country.toLowerCase().replace(/\s+/g, '-')}/${selectedCity.city.toLowerCase().replace(/\s+/g, '-')}`}
                className="flex items-center justify-center gap-1 w-full mt-3 px-3 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors"
              >
                View all places <ChevronRight className="h-3 w-3" />
              </Link>
            </div>
          )}

          {/* Mobile rankings toggle */}
          <div className="lg:hidden absolute top-4 right-4 z-[1000]">
            <button
              onClick={() => {
                const el = document.getElementById('mobile-rankings')
                if (el) el.classList.toggle('hidden')
              }}
              className="px-3 py-2 bg-white rounded-lg shadow-lg border border-gray-100 text-sm font-medium text-gray-700"
            >
              <TrendingUp className="h-4 w-4 inline mr-1" />
              Rankings
            </button>
          </div>

          {/* Mobile rankings panel */}
          <div id="mobile-rankings" className="hidden lg:hidden absolute top-16 right-4 z-[1000] bg-white rounded-xl shadow-lg border border-gray-100 max-h-64 overflow-y-auto w-64">
            {topCities.slice(0, 10).map((city, i) => (
              <button
                key={`m-${city.city}`}
                onClick={() => {
                  setSelectedCity(city)
                  setSearchQuery(city.city)
                  handleSearch()
                  document.getElementById('mobile-rankings')?.classList.add('hidden')
                }}
                className="w-full text-left px-3 py-2 hover:bg-emerald-50 border-b border-gray-50 last:border-0"
              >
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-gray-400">#{i + 1}</span>
                  <span className="text-sm font-medium text-gray-900 flex-1 truncate">{city.city}</span>
                  <span className={`text-sm font-bold ${getGradeColor(city.grade)}`}>{city.grade}</span>
                </div>
              </button>
            ))}
          </div>

          {/* Legend */}
          <div className="absolute bottom-6 left-4 z-[1000] bg-white/90 backdrop-blur-sm rounded-xl shadow-md border border-gray-100 px-3 py-2">
            <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs">
              {Object.entries(CATEGORY_CONFIG).map(([key, cfg]) => (
                <span key={key} className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded-full" style={{ background: cfg.color }} />
                  {cfg.label}
                </span>
              ))}
            </div>
          </div>

          {typeof window !== 'undefined' && (
            <LeafletMapContainer
              ref={mapRef}
              center={mapCenter}
              zoom={zoom}
              style={{ height: '100%', width: '100%', minHeight: '500px' }}
              className="z-10"
            >
              <TileLayer
                attribution='&copy; <a href="https://www.maptiler.com/copyright/">MapTiler</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://api.maptiler.com/maps/pastel/{z}/{x}/{y}.png?key=99cVeZ5JM3met86KZyyD"
                tileSize={512}
                zoomOffset={-1}
              />
              <MapEventHandler onMove={handleMapMove} />
              {Object.keys(icons).length > 0 && clusterIcon && (
                <MarkerClusterGroup
                  chunkedLoading
                  maxClusterRadius={50}
                  spiderfyOnMaxZoom
                  showCoverageOnHover={false}
                  zoomToBoundsOnClick
                  iconCreateFunction={clusterIcon}
                >
                  {places.map(place => (
                    <Marker
                      key={place.id}
                      position={[place.latitude, place.longitude]}
                      icon={icons[place.category] || icons.other}
                    >
                      <Popup maxWidth={280} className="vegan-score-popup">
                        <div className="font-sans">
                          {(place.main_image_url || place.images?.[0]) && (
                            <img
                              src={place.main_image_url || place.images[0]}
                              alt={place.name}
                              className="w-full h-28 object-cover rounded-t-lg -mt-[13px] -mx-[13px] mb-2"
                              style={{ width: 'calc(100% + 26px)' }}
                            />
                          )}
                          <div className="flex items-start gap-2">
                            <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs flex-shrink-0" style={{ background: CATEGORY_CONFIG[place.category]?.color || '#6b7280' }}>
                              {CATEGORY_CONFIG[place.category]?.emoji || '📍'}
                            </div>
                            <div className="min-w-0">
                              <Link href={`/place/${place.slug || place.id}`} className="font-semibold text-sm text-gray-900 hover:text-emerald-600 block truncate">
                                {place.name}
                              </Link>
                              <p className="text-xs text-gray-500 mt-0.5">
                                {place.city}{place.country ? `, ${place.country}` : ''}
                              </p>
                            </div>
                          </div>
                          <div className="flex gap-1.5 mt-2 flex-wrap">
                            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                              place.vegan_level === 'fully_vegan' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                            }`}>
                              {place.vegan_level === 'fully_vegan' ? '100% Vegan' : 'Vegan-Friendly'}
                            </span>
                            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-600">
                              {CATEGORY_CONFIG[place.category]?.label || place.category}
                            </span>
                          </div>
                        </div>
                      </Popup>
                    </Marker>
                  ))}
                </MarkerClusterGroup>
              )}
            </LeafletMapContainer>
          )}
        </div>
      </div>

      {/* Info Modal */}
      {showInfo && (
        <div className="fixed inset-0 z-[2000] bg-black/50 flex items-center justify-center p-4" onClick={() => setShowInfo(false)}>
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[80vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">How Vegan Score Works</h2>
              <button onClick={() => setShowInfo(false)} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
            </div>

            <p className="text-sm text-gray-600 mb-4">
              Every city gets a Vegan Score from 0 to 100 based on three dimensions:
            </p>

            <div className="space-y-4 mb-6">
              <div className="bg-emerald-50 rounded-xl p-4">
                <h3 className="font-bold text-emerald-800 text-sm mb-1">🏪 Density (0-40 pts)</h3>
                <p className="text-xs text-emerald-700">How many vegan places are in the city? More places = higher density score. Each place contributes 2.5 points.</p>
              </div>
              <div className="bg-blue-50 rounded-xl p-4">
                <h3 className="font-bold text-blue-800 text-sm mb-1">🎨 Variety (0-30 pts)</h3>
                <p className="text-xs text-blue-700">Does the city have a mix of restaurants, stores, stays, and sanctuaries? A city with all types scores higher than one with only restaurants.</p>
              </div>
              <div className="bg-purple-50 rounded-xl p-4">
                <h3 className="font-bold text-purple-800 text-sm mb-1">⭐ Quality (0-30 pts)</h3>
                <p className="text-xs text-purple-700">What percentage of places are 100% vegan (vs. vegan-friendly)? How well-rated are they? Higher quality = higher score.</p>
              </div>
            </div>

            <div className="bg-gray-50 rounded-xl p-4 mb-4">
              <h3 className="font-bold text-gray-800 text-sm mb-2">Grade Scale</h3>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="flex items-center gap-1.5"><span className="font-bold text-emerald-500">A+</span> <span className="text-gray-500">90-100</span></div>
                <div className="flex items-center gap-1.5"><span className="font-bold text-emerald-500">A</span> <span className="text-gray-500">80-89</span></div>
                <div className="flex items-center gap-1.5"><span className="font-bold text-green-500">B</span> <span className="text-gray-500">65-79</span></div>
                <div className="flex items-center gap-1.5"><span className="font-bold text-yellow-500">C</span> <span className="text-gray-500">50-64</span></div>
                <div className="flex items-center gap-1.5"><span className="font-bold text-orange-500">D</span> <span className="text-gray-500">35-49</span></div>
                <div className="flex items-center gap-1.5"><span className="font-bold text-red-500">F</span> <span className="text-gray-500">0-34</span></div>
              </div>
            </div>

            <div className="bg-emerald-50 rounded-xl p-4">
              <h3 className="font-bold text-emerald-800 text-sm mb-1">🚀 Improve Your City&apos;s Score</h3>
              <p className="text-xs text-emerald-700 mb-2">
                Know a vegan place that&apos;s not on the map? Add it and your city&apos;s score will increase!
                Every place matters — especially stores, stays, and sanctuaries that boost the variety score.
              </p>
              <Link
                href="/map"
                className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 hover:text-emerald-900"
              >
                <Plus className="h-3 w-3" /> Add a place now
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
