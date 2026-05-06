'use client'

// Leaflet + marker-cluster CSS scoped to /vegan-score route.
import 'leaflet/dist/leaflet.css'
import 'leaflet.markercluster/dist/MarkerCluster.css'
import 'leaflet.markercluster/dist/MarkerCluster.Default.css'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { Search, Info, X, TrendingUp, ChevronRight, Plus } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { getGradeColor, getScoreBarColor } from '@/lib/score-utils'
import RatingBadge from '@/components/places/RatingBadge'

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
  average_rating: number | null; review_count: number | null
  description: string | null; website: string | null
}

interface CityScore {
  city: string; country: string; score: number; grade: string
  placeCount: number; breakdown: ScoreBreakdown
  population?: number; perCapita?: number
  center: [number, number]
}

interface ScoreBreakdown { accessibility: number; choice: number; variety: number; quality: number }

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

      // Load pre-computed scores + places for map in parallel
      const [scoresRes, placesData] = await Promise.all([
        fetch('/api/scores').then(r => r.json()).catch(() => ({ scores: [] })),
        // Load places for map display (paginated)
        (async () => {
          let all: any[] = []
          let offset = 0
          while (true) {
            const { data: batch } = await supabase.from('places')
              .select('id, name, slug, category, latitude, longitude, vegan_level, address, city, country, main_image_url, images, average_rating, review_count, description, website')
              .is('archived_at', null)
              .range(offset, offset + 999)
            if (!batch || batch.length === 0) break
            all.push(...batch)
            offset += 1000
            if (batch.length < 1000) break
          }
          return all
        })(),
      ])

      const data = placesData.length > 0 ? placesData : null

      if (data) {
        setPlaces(data as Place[])

        // Use pre-computed scores from server API
        const scores: CityScore[] = (scoresRes.scores || []).map((s: any) => ({
          ...s,
          breakdown: s.breakdown || { accessibility: 0, choice: 0, variety: 0, quality: 0 },
          population: undefined,
        }))
        setCityScores(scores)
      }
      setLoading(false)
    }
    fetchPlaces()
  }, [])

  const flyToCity = useCallback((city: CityScore) => {
    setSelectedCity(city)
    mapRef.current?.flyTo(city.center, 13, { duration: 1.5 })
  }, [])

  const handleSearch = useCallback(async () => {
    const raw = searchQuery.trim()
    if (!raw) return
    const q = raw.toLowerCase()

    // Parse a country hint out of queries like "Oxford, UK" / "Paris France".
    // Known synonym map — extend as we see more.
    const COUNTRY_SYNONYMS: Record<string, string[]> = {
      'united kingdom': ['united kingdom', 'uk', 'england', 'scotland', 'wales', 'northern ireland', 'britain', 'great britain'],
      'united states': ['united states', 'usa', 'us', 'america', 'u.s.', 'u.s.a.'],
      'new zealand': ['new zealand', 'nz'],
      'czechia': ['czechia', 'czech republic'],
      'germany': ['germany', 'deutschland'],
      'france': ['france'],
      'netherlands': ['netherlands', 'holland', 'nederland'],
      'spain': ['spain', 'españa'],
      'italy': ['italy', 'italia'],
      'japan': ['japan'],
      'south korea': ['south korea', 'korea'],
    }
    let countryHint: string | null = null
    for (const [canon, syns] of Object.entries(COUNTRY_SYNONYMS)) {
      if (syns.some(s => q.includes(s))) { countryHint = canon; break }
    }

    // Strip the country part from the city query so "Oxford, UK" matches city
    // "Oxford" not city "Oxford, UK".
    const cityOnly = countryHint
      ? q.replace(/,/g, ' ')
         .split(/\s+/)
         .filter(t => !COUNTRY_SYNONYMS[countryHint!].includes(t))
         .join(' ')
         .trim()
      : q.replace(/,/g, ' ').trim()

    // Score every candidate and pick the best one (not just the first `.find()`).
    const scored = cityScores.map(c => {
      const city = c.city.toLowerCase()
      const country = c.country.toLowerCase()
      let score = 0
      // Country match trumps everything if a hint was parsed
      if (countryHint) {
        if (country === countryHint) score += 100
        else score -= 50   // explicit mismatch heavily penalized
      }
      // Exact city match is strongest signal
      if (city === cityOnly) score += 50
      else if (city.startsWith(cityOnly + ' ') || cityOnly.startsWith(city + ' ')) score += 30
      else if (city.includes(cityOnly) || cityOnly.includes(city)) score += 10
      else score -= 100   // not a match at all
      return { c, score }
    }).filter(x => x.score > 0).sort((a, b) => b.score - a.score)

    if (scored.length) {
      const best = scored[0].c
      setSelectedCity(best)
      mapRef.current?.flyTo(best.center, 13, { duration: 1.5 })
      return
    }

    // Fall back to Nominatim — already returns countries sensibly if the user
    // included a country in the query.
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1&accept-language=en&dedupe=1`,
        { headers: { 'User-Agent': 'PlantsPack/1.0' } },
      )
      const data = await res.json()
      if (data[0]) {
        mapRef.current?.flyTo([parseFloat(data[0].lat), parseFloat(data[0].lon)], 12, { duration: 1.5 })
      }
    } catch {}
  }, [searchQuery, cityScores])

  const handleMapMove = useCallback(() => {}, [])
  const displayedCities = showAllRankings ? cityScores : cityScores.slice(0, 10)
  // Top 3 threshold: include all cities that tie with #3's score
  const top3Threshold = cityScores.length >= 3 ? cityScores[2]?.score : cityScores[0]?.score || 0

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="text-2xl md:text-3xl font-headline font-bold text-on-surface tracking-tight">
              City Ranks
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
        {/* Sidebar — City Ranks */}
        <div className="hidden lg:flex flex-col w-72 bg-surface-container-lowest rounded-xl ghost-border overflow-hidden">
          <div className="p-3 border-b border-outline-variant/10">
            <h2 className="font-bold text-on-surface text-sm flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              City Ranks
            </h2>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-outline-variant/5">
            {loading ? (
              <div className="p-3 space-y-2">
                {[...Array(8)].map((_, i) => <div key={i} className="h-10 bg-surface-container-low rounded-lg animate-pulse" />)}
              </div>
            ) : (
              <>
                {displayedCities.map((city, i) => {
                  const isTop = city.score >= top3Threshold && top3Threshold > 0
                  return (
                    <button
                      key={`${city.city}-${city.country}`}
                      onClick={() => flyToCity(city)}
                      className={`w-full text-left px-3 py-2.5 transition-colors ${
                        selectedCity?.city === city.city ? 'bg-primary/5' :
                        isTop ? 'bg-primary/[0.03]' : ''
                      } hover:bg-primary/5`}
                    >
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-bold w-4 ${isTop ? 'text-primary' : 'text-on-surface-variant/50'}`}>
                          {isTop ? '🏆' : `#${i + 1}`}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className={`font-medium text-sm truncate ${isTop ? 'text-primary' : 'text-on-surface'}`}>{city.city}</p>
                          <p className="text-[11px] text-on-surface-variant">{city.country} · {city.placeCount} places</p>
                        </div>
                        <div className="text-right">
                          <span className={`text-base font-bold ${getGradeColor(city.grade)}`}>{city.grade}</span>
                          <p className="text-[10px] text-on-surface-variant">{city.score}/100</p>
                        </div>
                      </div>
                    </button>
                  )
                })}
              </>
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
                <div className="flex justify-between"><span className="text-gray-500">Accessibility</span><span className="font-medium">{selectedCity.breakdown.accessibility}/25</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Choice</span><span className="font-medium">{selectedCity.breakdown.choice}/25</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Variety</span><span className="font-medium">{selectedCity.breakdown.variety}/25</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Quality</span><span className="font-medium">{selectedCity.breakdown.quality}/25</span></div>
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
                url="https://api.maptiler.com/maps/streets-v2/{z}/{x}/{y}@2x.png?key=CBtMRLqBbJmyBLkXAk5p"
                tileSize={256}
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
                              <RatingBadge
                                rating={place.average_rating}
                                reviewCount={place.review_count}
                                size="xs"
                                className="mt-0.5"
                              />
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
              <h2 className="text-xl font-bold text-gray-900">How City Ranks Work</h2>
              <button onClick={() => setShowInfo(false)} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
            </div>
            <p className="text-sm text-gray-600 mb-4">Every city gets a score from 0 to 100 across four dimensions (25 points each). Places contribute by tier: <strong>100% Vegan</strong> counts as 1.0, <strong>Mostly Vegan</strong> as 0.70, <strong>Vegan-Friendly</strong> as 0.35, <strong>Has Vegan Options</strong> as 0.10. So a city with one fully-vegan restaurant outweighs a city with three places that just happen to have a vegan dish.</p>
            <div className="space-y-3 mb-5">
              <div className="bg-emerald-50 rounded-xl p-3">
                <h3 className="font-bold text-emerald-800 text-sm mb-1">📊 Accessibility (0-25 pts)</h3>
                <p className="text-xs text-emerald-700">How easy is it to find a vegan option? Combines raw abundance with per-capita density. A small town with a handful of vegan spots can outscore a megacity where they&apos;re lost in the crowd.</p>
              </div>
              <div className="bg-teal-50 rounded-xl p-3">
                <h3 className="font-bold text-teal-800 text-sm mb-1">🏪 Choice (0-25 pts)</h3>
                <p className="text-xs text-teal-700">Volume and purity of vegan options. More places means more choice, with a logarithmic curve that still separates the top cities. Fully-vegan-heavy cities earn a purity bonus.</p>
              </div>
              <div className="bg-blue-50 rounded-xl p-3">
                <h3 className="font-bold text-blue-800 text-sm mb-1">🎨 Variety (0-25 pts)</h3>
                <p className="text-xs text-blue-700">Depth across categories: restaurants, stores, stays, events, and orgs. Not just &ldquo;do they have one?&rdquo; — a city with 50 vegan stores scores higher than one with 1.</p>
              </div>
              <div className="bg-purple-50 rounded-xl p-3">
                <h3 className="font-bold text-purple-800 text-sm mb-1">⭐ Quality (0-25 pts)</h3>
                <p className="text-xs text-purple-700">Community ratings, Bayesian-smoothed so a single 5-star review can&apos;t game the system. Every city starts near ~7 pts; real reviews push it up toward 25. <strong>Rate places to help your city climb!</strong></p>
              </div>
            </div>
            <div className="bg-gray-50 rounded-xl p-3 mb-4">
              <h3 className="font-bold text-gray-800 text-sm mb-2">Grade Scale</h3>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div><span className="font-bold text-emerald-500">A+</span> <span className="text-gray-400">88-100</span></div>
                <div><span className="font-bold text-emerald-500">A</span> <span className="text-gray-400">78-87</span></div>
                <div><span className="font-bold text-green-500">B+</span> <span className="text-gray-400">70-77</span></div>
                <div><span className="font-bold text-green-500">B</span> <span className="text-gray-400">62-69</span></div>
                <div><span className="font-bold text-yellow-500">C+</span> <span className="text-gray-400">54-61</span></div>
                <div><span className="font-bold text-yellow-500">C</span> <span className="text-gray-400">45-53</span></div>
                <div><span className="font-bold text-orange-500">D+</span> <span className="text-gray-400">37-44</span></div>
                <div><span className="font-bold text-orange-500">D</span> <span className="text-gray-400">30-36</span></div>
                <div><span className="font-bold text-red-500">F</span> <span className="text-gray-400">0-29</span></div>
              </div>
            </div>
            <div className="bg-amber-50 rounded-xl p-3 mb-4 border border-amber-200">
              <h3 className="font-bold text-amber-900 text-sm mb-1">What a low grade actually means</h3>
              <p className="text-xs text-amber-800">A D or F grade often means &ldquo;we don&apos;t have enough data here yet,&rdquo; not &ldquo;this city is bad for vegans.&rdquo; Coverage is strongest in Europe and large US/Asian cities, and sparser elsewhere. Adding missing places and rating ones you&apos;ve been to is the fastest way to make the ranking accurate for your city.</p>
            </div>
            <div className="bg-emerald-50 rounded-xl p-3">
              <h3 className="font-bold text-emerald-800 text-sm mb-1">🚀 Improve Your City&apos;s Score</h3>
              <p className="text-xs text-emerald-700 mb-2">
                Add missing vegan places to boost your city&apos;s ranking! Stores and stays especially help the variety score.
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
