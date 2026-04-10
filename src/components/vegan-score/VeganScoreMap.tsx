'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { Search, Info, X, TrendingUp, ChevronRight, Plus } from 'lucide-react'
import { supabase } from '@/lib/supabase'

const LeafletMapContainer = dynamic(() => import('react-leaflet').then(mod => mod.MapContainer), { ssr: false })
const TileLayer = dynamic(() => import('react-leaflet').then(mod => mod.TileLayer), { ssr: false })
const Marker = dynamic(() => import('react-leaflet').then(mod => mod.Marker), { ssr: false })
const Popup = dynamic(() => import('react-leaflet').then(mod => mod.Popup), { ssr: false })
const MarkerClusterGroup = dynamic(() => import('react-leaflet-cluster').then(mod => mod.default), { ssr: false })

const MapEventHandler = dynamic(() =>
  import('react-leaflet').then(mod => {
    const { useMap } = mod
    return function MapEventHandlerComponent({ onMove }: { onMove: () => void }) {
      const map = useMap()
      useEffect(() => {
        map.on('moveend', onMove)
        map.on('zoomend', onMove)
        return () => { map.off('moveend', onMove); map.off('zoomend', onMove) }
      }, [map, onMove])
      return null
    }
  }),
  { ssr: false }
)

const CATEGORY_CONFIG: Record<string, { color: string; emoji: string; label: string; hidden?: boolean }> = {
  eat: { color: '#22c55e', emoji: '🌿', label: 'Eat' },
  hotel: { color: '#3b82f6', emoji: '🛏️', label: 'Stay' },
  store: { color: '#a855f7', emoji: '🛍️', label: 'Store' },
  organisation: { color: '#f97316', emoji: '🐾', label: 'Animal Sanctuary' },
  event: { color: '#ec4899', emoji: '🎉', label: 'Event', hidden: true },
  other: { color: '#6b7280', emoji: '📍', label: 'Other', hidden: true },
}

interface Place {
  id: string; name: string; slug: string; category: string
  latitude: number; longitude: number; vegan_level: string
  address: string; city: string; country: string
  main_image_url: string | null; images: string[]
  average_rating: number | null; description: string | null; website: string | null
}

interface CityScore {
  city: string; country: string; score: number; grade: string
  placeCount: number; breakdown: { density: number; variety: number; quality: number }
  population?: number; perCapita?: number
}

function calculateScore(places: Place[], population?: number): { score: number; grade: string; breakdown: { density: number; variety: number; quality: number }; perCapita?: number } {
  if (places.length === 0) return { score: 0, grade: 'F', breakdown: { density: 0, variety: 0, quality: 0 } }

  const fullyVegan = places.filter(p => p.vegan_level === 'fully_vegan')
  const fvCount = fullyVegan.length

  // Density (0-40): fully-vegan places per capita + presence
  // Concentration (0-20): per 100k residents — real city size from GeoNames
  // Presence (0-20): logarithmic count — rewards having more fully-vegan spots
  let concentration = 0
  let perCapita: number | undefined
  if (population && population > 0) {
    perCapita = (fvCount / population) * 100000
    // Scale: 0.3 per 100k = ~5pts, 1 per 100k = ~10pts, 3+ per 100k = 20pts
    concentration = Math.min(20, perCapita * 7)
  } else {
    // Fallback for cities without population data: generous estimate
    concentration = Math.min(20, fvCount >= 3 ? 10 : fvCount * 4)
  }
  // Presence: 1 fv = 7pts, 2 = 11, 4 = 15, 8 = 18, 15+ = 20
  const presence = Math.min(20, fvCount > 0 ? 7 * Math.log2(fvCount + 1) : 0)
  const density = Math.min(40, concentration + presence)

  // Variety (0-30): category diversity among FULLY VEGAN places only
  const fvCategories = new Set(fullyVegan.map(p => p.category))
  const variety = Math.min(30,
    (fvCategories.has('eat') ? 10 : 0) +
    (fvCategories.has('hotel') ? 8 : 0) +
    (fvCategories.has('organisation') ? 7 : 0) +
    (fvCategories.has('store') ? 5 : 0) +
    fvCategories.size * 2
  )

  // Quality (0-30): purely based on user ratings of fully-vegan places
  // No ratings yet = 0 — honest, and incentivizes reviews
  const ratedFv = fullyVegan.filter(p => p.average_rating && p.average_rating > 0)
  const avgRating = ratedFv.length > 0 ? ratedFv.reduce((s, p) => s + (p.average_rating || 0), 0) / ratedFv.length : 0
  const reviewCoverage = ratedFv.length / Math.max(1, fvCount) // what % of fv places have ratings
  const quality = Math.min(30, (avgRating / 5) * 20 + reviewCoverage * 10)

  const score = Math.round(Math.min(100, density + variety + quality))
  const grade = score >= 90 ? 'A+' : score >= 80 ? 'A' : score >= 65 ? 'B' : score >= 50 ? 'C' : score >= 35 ? 'D' : 'F'
  return { score, grade, breakdown: { density: Math.round(density), variety: Math.round(variety), quality: Math.round(quality) }, perCapita }
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
  const [mapCenter] = useState<[number, number]>([48.8, 10.5])
  const [zoom] = useState(5)
  const [showInfo, setShowInfo] = useState(false)
  const [showAllRankings, setShowAllRankings] = useState(false)
  const [cityScores, setCityScores] = useState<CityScore[]>([])
  const [selectedCity, setSelectedCity] = useState<CityScore | null>(null)
  const [activeCategory, setActiveCategory] = useState<string>('all')
  const [icons, setIcons] = useState<Record<string, any>>({})
  const [clusterIcon, setClusterIcon] = useState<any>(null)
  const mapRef = useRef<any>(null)

  // Filtered places based on active category
  const filteredPlaces = useMemo(() => {
    if (activeCategory === 'all') return places
    return places.filter(p => p.category === activeCategory)
  }, [places, activeCategory])

  // Category counts for filter pills
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const p of places) { counts[p.category] = (counts[p.category] || 0) + 1 }
    return counts
  }, [places])

  useEffect(() => {
    if (typeof window === 'undefined') return
    import('leaflet').then(L => {
      const makeIcon = (color: string, emoji: string) =>
        new L.DivIcon({
          html: `<div style="width:32px;height:32px;border-radius:50%;background:${color};border:2.5px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;font-size:16px;line-height:1;">${emoji}</div>`,
          className: 'leaflet-score-marker',
          iconSize: [32, 32], iconAnchor: [16, 16], popupAnchor: [0, -18],
        })
      const newIcons: Record<string, any> = {}
      for (const [cat, cfg] of Object.entries(CATEGORY_CONFIG)) newIcons[cat] = makeIcon(cfg.color, cfg.emoji)
      setIcons(newIcons)
      setClusterIcon(() => (cluster: any) => {
        const count = cluster.getChildCount()
        const d = count >= 100 ? 48 : count >= 10 ? 42 : 36
        return new L.DivIcon({
          html: `<div style="width:${d}px;height:${d}px;border-radius:50%;background:linear-gradient(135deg,#22c55e,#16a34a);border:3px solid #fff;box-shadow:0 2px 10px rgba(0,0,0,0.25);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:${count >= 100 ? 14 : 13}px;font-family:system-ui,sans-serif;">${count}</div>`,
          className: 'leaflet-cluster-score', iconSize: [d, d],
        })
      })
    })
  }, [])

  useEffect(() => {
    async function fetchPlaces() {
      setLoading(true)

      // Load places and population data in parallel
      const [placesRes, popRes] = await Promise.all([
        supabase.from('places')
          .select('id, name, slug, category, latitude, longitude, vegan_level, address, city, country, main_image_url, images, average_rating, description, website')
          .order('name').limit(5000),
        fetch('/data/city-populations.json').then(r => r.json()).catch(() => ({})),
      ])
      const data = placesRes.data
      const populations: Record<string, number> = popRes

      if (data) {
        setPlaces(data as Place[])
        const byCity: Record<string, Place[]> = {}
        for (const p of data) {
          if (!p.city) continue
          const key = `${p.city}|||${p.country}`
          if (!byCity[key]) byCity[key] = []
          byCity[key].push(p as Place)
        }
        const scores: CityScore[] = Object.entries(byCity)
          .filter(([, ps]) => ps.some(p => p.vegan_level === 'fully_vegan'))
          .map(([key, ps]) => {
            const [city, country] = key.split('|||')
            const pop = populations[key] || undefined
            const { score, grade, breakdown, perCapita } = calculateScore(ps, pop)
            return { city, country, score, grade, placeCount: ps.length, breakdown, population: pop, perCapita }
          })
          .sort((a, b) => b.score - a.score)
        setCityScores(scores)
      }
      setLoading(false)
    }
    fetchPlaces()
  }, [])

  const flyToCity = useCallback((city: CityScore) => {
    setSelectedCity(city)
    // Geocode the city to fly to it
    fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(city.city + ', ' + city.country)}&limit=1`)
      .then(r => r.json())
      .then(data => {
        if (data[0]) {
          mapRef.current?.flyTo([parseFloat(data[0].lat), parseFloat(data[0].lon)], 12, { duration: 1.5 })
        }
      })
      .catch(() => {})
  }, [])

  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) return
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1`)
      const data = await res.json()
      if (data[0]) {
        mapRef.current?.flyTo([parseFloat(data[0].lat), parseFloat(data[0].lon)], 12, { duration: 1.5 })
        const match = cityScores.find(c =>
          searchQuery.toLowerCase().includes(c.city.toLowerCase()) ||
          c.city.toLowerCase().includes(searchQuery.toLowerCase())
        )
        if (match) setSelectedCity(match)
      }
    } catch {}
  }, [searchQuery, cityScores])

  const handleMapMove = useCallback(() => {}, [])
  const displayedCities = showAllRankings ? cityScores : cityScores.slice(0, 10)

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="text-2xl md:text-3xl font-headline font-bold text-on-surface tracking-tight">
              Vegan Score
            </h1>
            <p className="text-sm text-on-surface-variant mt-1">
              How vegan-friendly is your city? {cityScores.length} cities ranked.
            </p>
          </div>
          <button
            onClick={() => setShowInfo(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-on-surface-variant hover:text-primary hover:bg-primary/5 rounded-lg transition-colors"
          >
            <Info className="h-4 w-4" />
            <span className="hidden sm:inline">How it works</span>
          </button>
        </div>

        {/* Search + Category filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-outline" />
            <input
              type="text"
              placeholder="Search a city..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              className="w-full pl-9 pr-4 py-2 text-sm border border-outline-variant/15 rounded-lg bg-surface-container-lowest focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
            />
          </div>
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            <button
              onClick={() => setActiveCategory('all')}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                activeCategory === 'all' ? 'bg-primary text-on-primary-btn' : 'bg-surface-container-lowest ghost-border text-on-surface-variant hover:bg-surface-container-low'
              }`}
            >
              All ({places.length})
            </button>
            {Object.entries(CATEGORY_CONFIG).map(([key, cfg]) => {
              const count = categoryCounts[key] || 0
              if (count === 0 || cfg.hidden) return null
              return (
                <button
                  key={key}
                  onClick={() => setActiveCategory(activeCategory === key ? 'all' : key)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors flex items-center gap-1 ${
                    activeCategory === key ? 'bg-primary text-on-primary-btn' : 'bg-surface-container-lowest ghost-border text-on-surface-variant hover:bg-surface-container-low'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full" style={{ background: cfg.color }} />
                  {cfg.label} ({count})
                </button>
              )
            })}
          </div>
        </div>
      </div>

      <div className="flex gap-4" style={{ height: 'calc(100vh - 280px)', minHeight: '500px' }}>
        {/* Sidebar — City Rankings */}
        <div className="hidden lg:flex flex-col w-72 bg-surface-container-lowest rounded-xl ghost-border overflow-hidden">
          <div className="p-3 border-b border-outline-variant/10">
            <h2 className="font-bold text-on-surface text-sm flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              City Rankings
            </h2>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-outline-variant/5">
            {loading ? (
              <div className="p-3 space-y-2">
                {[...Array(8)].map((_, i) => <div key={i} className="h-10 bg-surface-container-low rounded-lg animate-pulse" />)}
              </div>
            ) : (
              displayedCities.map((city, i) => (
                <button
                  key={`${city.city}-${city.country}`}
                  onClick={() => flyToCity(city)}
                  className={`w-full text-left px-3 py-2.5 hover:bg-primary/5 transition-colors ${
                    selectedCity?.city === city.city ? 'bg-primary/5' : ''
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-on-surface-variant/50 w-4">#{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-on-surface text-sm truncate">{city.city}</p>
                      <p className="text-[11px] text-on-surface-variant">{city.country} · {city.placeCount} places</p>
                    </div>
                    <div className="text-right">
                      <span className={`text-base font-bold ${getGradeColor(city.grade)}`}>{city.grade}</span>
                      <p className="text-[10px] text-on-surface-variant">{city.score}/100</p>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>

          {!showAllRankings && cityScores.length > 10 && (
            <button
              onClick={() => setShowAllRankings(true)}
              className="p-3 border-t border-outline-variant/10 text-xs font-medium text-primary hover:bg-primary/5 transition-colors text-center"
            >
              See all {cityScores.length} cities
            </button>
          )}
          {showAllRankings && (
            <button
              onClick={() => setShowAllRankings(false)}
              className="p-3 border-t border-outline-variant/10 text-xs font-medium text-on-surface-variant hover:bg-surface-container-low transition-colors text-center"
            >
              Show top 10
            </button>
          )}

          <div className="p-3 border-t border-outline-variant/10">
            <Link
              href="/map"
              className="flex items-center justify-center gap-2 w-full px-3 py-2 text-xs font-medium text-on-primary-btn silk-gradient rounded-lg transition-colors hover:opacity-90"
            >
              <Plus className="h-3 w-3" />
              Add a place & boost your city
            </Link>
          </div>
        </div>

        {/* Map */}
        <div className="flex-1 relative rounded-xl overflow-hidden ghost-border">
          {/* Selected city score overlay */}
          {selectedCity && (
            <div className="absolute top-3 left-3 z-[1000] bg-white rounded-xl shadow-lg border border-gray-100 p-3 w-64">
              <button onClick={() => setSelectedCity(null)} className="absolute top-2 right-2 text-gray-400 hover:text-gray-600">
                <X className="h-4 w-4" />
              </button>
              <div className="flex items-start gap-3 mb-2">
                <div className={`text-2xl font-black ${getGradeColor(selectedCity.grade)}`}>{selectedCity.grade}</div>
                <div>
                  <h3 className="font-bold text-gray-900 text-sm">{selectedCity.city}</h3>
                  <p className="text-[11px] text-gray-500">{selectedCity.country} · {selectedCity.placeCount} places</p>
                </div>
              </div>
              <div className="mb-2">
                <div className="flex justify-between text-[11px] text-gray-500 mb-1">
                  <span>Vegan Score</span>
                  <span className="font-bold text-gray-900">{selectedCity.score}/100</span>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${getScoreBarColor(selectedCity.score)} transition-all`} style={{ width: `${selectedCity.score}%` }} />
                </div>
              </div>
              <div className="space-y-1 text-[11px]">
                <div className="flex justify-between"><span className="text-gray-500">Density</span><span className="font-medium">{selectedCity.breakdown.density}/40</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Variety</span><span className="font-medium">{selectedCity.breakdown.variety}/30</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Quality</span><span className="font-medium">{selectedCity.breakdown.quality}/30</span></div>
              </div>
              {(selectedCity.population || selectedCity.perCapita) && (
                <div className="mt-2 pt-2 border-t border-gray-100 text-[10px] text-gray-400 space-y-0.5">
                  {selectedCity.population && <p>Population: {selectedCity.population.toLocaleString()}</p>}
                  {selectedCity.perCapita !== undefined && <p>{selectedCity.perCapita.toFixed(1)} fully-vegan places per 100k residents</p>}
                </div>
              )}
              <Link
                href={`/vegan-places/${selectedCity.country.toLowerCase().replace(/\s+/g, '-')}/${selectedCity.city.toLowerCase().replace(/\s+/g, '-')}`}
                className="flex items-center justify-center gap-1 w-full mt-2 px-2 py-1 text-[11px] font-medium text-primary bg-primary/5 hover:bg-primary/10 rounded-lg transition-colors"
              >
                View all places <ChevronRight className="h-3 w-3" />
              </Link>
            </div>
          )}

          {/* Mobile rankings toggle */}
          <div className="lg:hidden absolute top-3 right-3 z-[1000]">
            <button
              onClick={() => document.getElementById('mobile-rankings')?.classList.toggle('hidden')}
              className="px-3 py-1.5 bg-white rounded-lg shadow-md border border-gray-100 text-xs font-medium text-gray-700"
            >
              <TrendingUp className="h-3.5 w-3.5 inline mr-1" /> Top 10
            </button>
          </div>
          <div id="mobile-rankings" className="hidden lg:hidden absolute top-12 right-3 z-[1000] bg-white rounded-xl shadow-lg border border-gray-100 max-h-60 overflow-y-auto w-56">
            {cityScores.slice(0, 10).map((city, i) => (
              <button
                key={`m-${city.city}`}
                onClick={() => { flyToCity(city); document.getElementById('mobile-rankings')?.classList.add('hidden') }}
                className="w-full text-left px-3 py-2 hover:bg-emerald-50 border-b border-gray-50 last:border-0"
              >
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-gray-400">#{i + 1}</span>
                  <span className="text-xs font-medium text-gray-900 flex-1 truncate">{city.city}</span>
                  <span className={`text-xs font-bold ${getGradeColor(city.grade)}`}>{city.grade}</span>
                </div>
              </button>
            ))}
          </div>

          {/* Legend */}
          <div className="absolute bottom-3 left-3 z-[1000] bg-white/90 backdrop-blur-sm rounded-lg shadow-md border border-gray-100 px-2.5 py-1.5">
            <div className="flex flex-wrap gap-x-2.5 gap-y-0.5 text-[10px]">
              {Object.entries(CATEGORY_CONFIG).filter(([, cfg]) => !cfg.hidden).map(([key, cfg]) => (
                <span key={key} className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: cfg.color }} />
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
              style={{ height: '100%', width: '100%' }}
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
                  chunkedLoading maxClusterRadius={50} spiderfyOnMaxZoom
                  showCoverageOnHover={false} zoomToBoundsOnClick
                  iconCreateFunction={clusterIcon}
                >
                  {filteredPlaces.map(place => (
                    <Marker key={place.id} position={[place.latitude, place.longitude]} icon={icons[place.category] || icons.other}>
                      <Popup maxWidth={260}>
                        <div className="font-sans">
                          {(place.main_image_url || place.images?.[0]) && (
                            <img src={place.main_image_url || place.images[0]} alt={place.name}
                              className="w-full h-24 object-cover rounded-t-lg -mt-[13px] -mx-[13px] mb-2"
                              style={{ width: 'calc(100% + 26px)' }} />
                          )}
                          <div className="flex items-start gap-2">
                            <div className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] flex-shrink-0"
                              style={{ background: CATEGORY_CONFIG[place.category]?.color || '#6b7280' }}>
                              {CATEGORY_CONFIG[place.category]?.emoji || '📍'}
                            </div>
                            <div className="min-w-0">
                              <Link href={`/place/${place.slug || place.id}`} className="font-semibold text-xs text-gray-900 hover:text-emerald-600 block truncate">
                                {place.name}
                              </Link>
                              <p className="text-[10px] text-gray-500">{place.city}{place.country ? `, ${place.country}` : ''}</p>
                            </div>
                          </div>
                          <div className="flex gap-1 mt-1.5 flex-wrap">
                            <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded-full ${
                              place.vegan_level === 'fully_vegan' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                            }`}>
                              {place.vegan_level === 'fully_vegan' ? '100% Vegan' : 'Vegan-Friendly'}
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
            <p className="text-sm text-gray-600 mb-4">Every city gets a Vegan Score from 0 to 100 based on three dimensions:</p>
            <div className="space-y-3 mb-5">
              <div className="bg-emerald-50 rounded-xl p-3">
                <h3 className="font-bold text-emerald-800 text-sm mb-1">🏪 Density (0-40 pts)</h3>
                <p className="text-xs text-emerald-700">100% vegan places per 100,000 residents. Uses real population data from GeoNames for 1,200+ cities. A small town with 5 fully-vegan spots per 100k people scores higher than a metropolis with the same ratio. Both concentration and absolute count matter.</p>
              </div>
              <div className="bg-blue-50 rounded-xl p-3">
                <h3 className="font-bold text-blue-800 text-sm mb-1">🎨 Variety (0-30 pts)</h3>
                <p className="text-xs text-blue-700">Does the city have a mix of 100% vegan restaurants, stores, stays, and sanctuaries? Only fully vegan places count — vegan-friendly options don&apos;t boost this score.</p>
              </div>
              <div className="bg-purple-50 rounded-xl p-3">
                <h3 className="font-bold text-purple-800 text-sm mb-1">⭐ Quality (0-30 pts)</h3>
                <p className="text-xs text-purple-700">Based on community ratings of fully vegan places. No reviews yet? This score starts at 0 — visit and rate places to help your city climb the rankings!</p>
              </div>
            </div>
            <div className="bg-gray-50 rounded-xl p-3 mb-4">
              <h3 className="font-bold text-gray-800 text-sm mb-2">Grade Scale</h3>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div><span className="font-bold text-emerald-500">A+</span> <span className="text-gray-400">90-100</span></div>
                <div><span className="font-bold text-emerald-500">A</span> <span className="text-gray-400">80-89</span></div>
                <div><span className="font-bold text-green-500">B</span> <span className="text-gray-400">65-79</span></div>
                <div><span className="font-bold text-yellow-500">C</span> <span className="text-gray-400">50-64</span></div>
                <div><span className="font-bold text-orange-500">D</span> <span className="text-gray-400">35-49</span></div>
                <div><span className="font-bold text-red-500">F</span> <span className="text-gray-400">0-34</span></div>
              </div>
            </div>
            <div className="bg-emerald-50 rounded-xl p-3">
              <h3 className="font-bold text-emerald-800 text-sm mb-1">🚀 Improve Your City&apos;s Score</h3>
              <p className="text-xs text-emerald-700 mb-2">
                Add missing vegan places to boost your city&apos;s ranking! Stores, stays, and sanctuaries especially help the variety score.
              </p>
              <Link href="/map" className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 hover:text-emerald-900">
                <Plus className="h-3 w-3" /> Add a place now
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
