'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Search, Info, X, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Map, Star } from 'lucide-react'
import { getGradeColor, getScoreBarColor, type CityScore } from '@/lib/score-utils'
import GlobalAddPlaceButton from '@/components/places/GlobalAddPlaceButton'

type SortKey = 'score' | 'accessibility' | 'choice' | 'variety' | 'quality' | 'placeCount' | 'city'
type SortDir = 'asc' | 'desc'
const PAGE_SIZE = 50

function getCitySlug(city: string) {
  return city.toLowerCase().replace(/\s+/g, '-')
}
function getCountrySlug(country: string) {
  return country.toLowerCase().replace(/\s+/g, '-')
}

interface CityRanksTableProps {
  scores: CityScore[]
  cityImages?: Record<string, string>
}

export default function CityRanksTable({ scores, cityImages = {} }: CityRanksTableProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('score')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [showInfo, setShowInfo] = useState(false)
  const [page, setPage] = useState(1)

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(d => d === 'desc' ? 'asc' : 'desc')
    } else {
      setSortKey(key)
      setSortDir(key === 'city' ? 'asc' : 'desc')
    }
    setPage(1)
  }

  const filtered = useMemo(() => {
    let list = scores
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      list = list.filter(s =>
        s.city.toLowerCase().includes(q) || s.country.toLowerCase().includes(q)
      )
    }
    return [...list].sort((a, b) => {
      let av: number | string, bv: number | string
      if (sortKey === 'city') { av = a.city; bv = b.city }
      else if (sortKey === 'accessibility') { av = a.breakdown?.accessibility ?? 0; bv = b.breakdown?.accessibility ?? 0 }
      else if (sortKey === 'choice') { av = a.breakdown?.choice ?? 0; bv = b.breakdown?.choice ?? 0 }
      else if (sortKey === 'variety') { av = a.breakdown?.variety ?? 0; bv = b.breakdown?.variety ?? 0 }
      else if (sortKey === 'quality') { av = a.breakdown?.quality ?? 0; bv = b.breakdown?.quality ?? 0 }
      else if (sortKey === 'placeCount') { av = a.placeCount; bv = b.placeCount }
      else { av = a.score; bv = b.score }
      if (av < bv) return sortDir === 'asc' ? -1 : 1
      if (av > bv) return sortDir === 'asc' ? 1 : -1
      return 0
    })
  }, [scores, searchQuery, sortKey, sortDir])

  // Pagination
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paginated = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE
    return filtered.slice(start, start + PAGE_SIZE)
  }, [filtered, page])

  // Reset to page 1 when search changes
  const handleSearch = (q: string) => {
    setSearchQuery(q)
    setPage(1)
  }

  // Top 3 threshold — scores are already sorted by score desc from server
  const top3Score = useMemo(() => scores.length >= 3 ? scores[2]?.score : scores[0]?.score || 0, [scores])

  // Pre-compute original rank index for each city
  const rankMap = useMemo(() => {
    const map: Record<string, number> = {}
    scores.forEach((s, i) => { map[`${s.city}|${s.country}`] = i + 1 })
    return map
  }, [scores])

  // Global rank offset for current page
  const rankOffset = (page - 1) * PAGE_SIZE

  function SortIcon({ col }: { col: SortKey }) {
    if (sortKey !== col) return <ChevronDown className="h-3 w-3 opacity-30" />
    return sortDir === 'desc' ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />
  }

  function SortableHeader({ col, label, className = '' }: { col: SortKey; label: string; className?: string }) {
    return (
      <th
        className={`px-3 py-2.5 text-left text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider cursor-pointer hover:text-primary transition-colors select-none ${className}`}
        onClick={() => handleSort(col)}
      >
        <span className="inline-flex items-center gap-1">
          {label}
          <SortIcon col={col} />
        </span>
      </th>
    )
  }

  function Pagination() {
    if (totalPages <= 1) return null
    return (
      <div className="flex items-center justify-between px-3 py-3 border-t border-outline-variant/10">
        <p className="text-xs text-on-surface-variant">
          {rankOffset + 1}–{Math.min(rankOffset + PAGE_SIZE, filtered.length)} of {filtered.length} cities
        </p>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="p-1.5 rounded-lg hover:bg-surface-container-low disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="h-4 w-4 text-on-surface-variant" />
          </button>
          {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
            let pageNum: number
            if (totalPages <= 7) {
              pageNum = i + 1
            } else if (page <= 4) {
              pageNum = i + 1
            } else if (page >= totalPages - 3) {
              pageNum = totalPages - 6 + i
            } else {
              pageNum = page - 3 + i
            }
            return (
              <button
                key={pageNum}
                onClick={() => setPage(pageNum)}
                className={`w-8 h-8 rounded-lg text-xs font-medium transition-colors ${
                  page === pageNum
                    ? 'bg-primary text-on-primary-btn'
                    : 'text-on-surface-variant hover:bg-surface-container-low'
                }`}
              >
                {pageNum}
              </button>
            )
          })}
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="p-1.5 rounded-lg hover:bg-surface-container-low disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight className="h-4 w-4 text-on-surface-variant" />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-headline font-bold text-on-surface tracking-tight">
              City Ranks
            </h1>
            <p className="text-sm text-on-surface-variant mt-1">
              {scores.length} cities ranked by vegan density, variety, and community ratings.
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

        {/* Search */}
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-outline" />
          <input
            type="text"
            placeholder="Search a city or country..."
            value={searchQuery}
            onChange={e => handleSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-outline-variant/15 rounded-xl bg-surface-container-lowest focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
          />
        </div>
      </div>

      {/* Popular Cities — top 10 by total places with images */}
      {!searchQuery && (
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-on-surface-variant mb-3">Most vegan places</h2>
          <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-1">
            {[...scores].sort((a, b) => b.placeCount - a.placeCount).slice(0, 10).map(city => {
              const imgKey = `${city.city}|||${city.country}`
              const img = cityImages[imgKey]
              return (
                <Link
                  key={`pop-${city.city}-${city.country}`}
                  href={`/vegan-places/${getCountrySlug(city.country)}/${getCitySlug(city.city)}`}
                  className="flex-shrink-0 w-36 bg-surface-container-lowest ghost-border rounded-xl overflow-hidden hover:border-primary/20 transition-all group"
                >
                  {img ? (
                    <img src={img} alt={city.city} className="w-full h-20 object-cover" />
                  ) : (
                    <div className="w-full h-20 bg-surface-container-low flex items-center justify-center text-2xl">🏙️</div>
                  )}
                  <div className="px-3 py-2">
                    <p className="text-sm font-medium text-on-surface truncate group-hover:text-primary transition-colors">{city.city}</p>
                    <p className="text-[10px] text-on-surface-variant">{city.placeCount} places · <span className={getGradeColor(city.grade)}>{city.grade}</span></p>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      )}

      {/* Desktop Table */}
      <div className="hidden md:block bg-surface-container-lowest rounded-2xl ghost-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-outline-variant/10">
                <th className="px-3 py-2.5 text-left text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider w-12">#</th>
                <SortableHeader col="city" label="City" />
                <th className="px-3 py-2.5 text-left text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider">Country</th>
                <SortableHeader col="score" label="Grade" />
                <SortableHeader col="score" label="Score" />
                <SortableHeader col="accessibility" label="Access" className="hidden lg:table-cell" />
                <SortableHeader col="choice" label="Choice" className="hidden lg:table-cell" />
                <SortableHeader col="variety" label="Variety" className="hidden lg:table-cell" />
                <SortableHeader col="quality" label="Quality" className="hidden lg:table-cell" />
                <SortableHeader col="placeCount" label="Places" />
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/5">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-3 py-12 text-center text-sm text-on-surface-variant">
                    {searchQuery ? 'No cities match your search.' : 'No city scores available.'}
                  </td>
                </tr>
              ) : (
                paginated.map((city, i) => {
                  const displayRank = rankOffset + i + 1
                  const origRank = rankMap[`${city.city}|${city.country}`] || displayRank
                  const isTop = city.score >= top3Score && top3Score > 0
                  return (
                    <tr
                      key={`${city.city}-${city.country}`}
                      className={`hover:bg-primary/[0.03] transition-colors ${isTop ? 'bg-primary/[0.02]' : ''}`}
                    >
                      <td className="px-3 py-2.5 text-sm">
                        {isTop ? (
                          <span className="text-xs">🏆</span>
                        ) : (
                          <span className="text-on-surface-variant/50 text-xs font-medium">{sortKey === 'score' && sortDir === 'desc' ? displayRank : origRank}</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        <Link
                          href={`/vegan-places/${getCountrySlug(city.country)}/${getCitySlug(city.city)}`}
                          className={`text-sm font-medium hover:text-primary transition-colors ${isTop ? 'text-primary' : 'text-on-surface'}`}
                        >
                          {city.city}
                        </Link>
                      </td>
                      <td className="px-3 py-2.5 text-sm text-on-surface-variant">{city.country}</td>
                      <td className="px-3 py-2.5">
                        <span className={`text-base font-black ${getGradeColor(city.grade)}`}>{city.grade}</span>
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 bg-surface-container-low rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${getScoreBarColor(city.score)}`} style={{ width: `${city.score}%` }} />
                          </div>
                          <span className="text-xs font-medium text-on-surface-variant">{city.score}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-xs text-on-surface-variant hidden lg:table-cell">
                        {city.breakdown?.accessibility ?? 0}<span className="text-on-surface-variant/40">/25</span>
                      </td>
                      <td className="px-3 py-2.5 text-xs text-on-surface-variant hidden lg:table-cell">
                        {city.breakdown?.choice ?? 0}<span className="text-on-surface-variant/40">/25</span>
                      </td>
                      <td className="px-3 py-2.5 text-xs text-on-surface-variant hidden lg:table-cell">
                        {city.breakdown?.variety ?? 0}<span className="text-on-surface-variant/40">/25</span>
                      </td>
                      <td className="px-3 py-2.5 text-xs text-on-surface-variant hidden lg:table-cell">
                        {city.breakdown?.quality ?? 0}<span className="text-on-surface-variant/40">/25</span>
                      </td>
                      <td className="px-3 py-2.5 text-xs font-medium text-on-surface-variant">{city.placeCount}</td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
        <Pagination />
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden">
        {filtered.length === 0 ? (
          <div className="py-12 text-center text-sm text-on-surface-variant">
            {searchQuery ? 'No cities match your search.' : 'No city scores available.'}
          </div>
        ) : (
          <>
            <div className="space-y-2">
              {paginated.map((city, i) => {
                const displayRank = rankOffset + i + 1
                const isTop = city.score >= top3Score && top3Score > 0
                return (
                  <Link
                    key={`${city.city}-${city.country}`}
                    href={`/vegan-places/${getCountrySlug(city.country)}/${getCitySlug(city.city)}`}
                    className={`block bg-surface-container-lowest rounded-xl ghost-border p-3 hover:bg-primary/[0.03] transition-colors ${isTop ? 'ring-1 ring-primary/20' : ''}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 text-center flex-shrink-0">
                        {isTop ? (
                          <span className="text-sm">🏆</span>
                        ) : (
                          <span className="text-xs font-bold text-on-surface-variant/50">#{displayRank}</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`font-medium text-sm truncate ${isTop ? 'text-primary' : 'text-on-surface'}`}>{city.city}</p>
                        <p className="text-[11px] text-on-surface-variant">{city.country} · {city.placeCount} places</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <span className={`text-lg font-black ${getGradeColor(city.grade)}`}>{city.grade}</span>
                        <div className="flex items-center gap-1 mt-0.5">
                          <div className="w-12 h-1 bg-surface-container-low rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${getScoreBarColor(city.score)}`} style={{ width: `${city.score}%` }} />
                          </div>
                          <span className="text-[10px] text-on-surface-variant">{city.score}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-3 mt-2 ml-11 text-[10px] text-on-surface-variant">
                      <span>Access {city.breakdown?.accessibility ?? 0}/25</span>
                      <span>Choice {city.breakdown?.choice ?? 0}/25</span>
                      <span>Variety {city.breakdown?.variety ?? 0}/25</span>
                      <span>Quality {city.breakdown?.quality ?? 0}/25</span>
                    </div>
                  </Link>
                )
              })}
            </div>
            {/* Mobile pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 px-1">
                <p className="text-xs text-on-surface-variant">
                  {rankOffset + 1}–{Math.min(rankOffset + PAGE_SIZE, filtered.length)} of {filtered.length}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => { setPage(p => Math.max(1, p - 1)); window.scrollTo(0, 0) }}
                    disabled={page === 1}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium ghost-border hover:bg-surface-container-low disabled:opacity-30 transition-colors"
                  >
                    Previous
                  </button>
                  <span className="text-xs text-on-surface-variant">{page}/{totalPages}</span>
                  <button
                    onClick={() => { setPage(p => Math.min(totalPages, p + 1)); window.scrollTo(0, 0) }}
                    disabled={page === totalPages}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium ghost-border hover:bg-surface-container-low disabled:opacity-30 transition-colors"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* How to Contribute */}
      <div className="mt-8 bg-surface-container-lowest rounded-2xl ghost-border p-6">
        <h2 className="font-headline font-bold text-on-surface text-lg mb-2">Help Your City Climb the Ranks</h2>
        <p className="text-sm text-on-surface-variant mb-4">
          Every place, review, and verified business improves your city&apos;s score. Here&apos;s how you can contribute:
        </p>
        <div className="flex flex-wrap gap-3">
          <GlobalAddPlaceButton
            className="inline-flex items-center gap-2 px-4 py-2.5 silk-gradient text-on-primary-btn rounded-xl text-sm font-medium hover:opacity-90 transition-colors"
          />
          <Link
            href="/map"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-surface-container-low ghost-border text-on-surface-variant rounded-xl text-sm font-medium hover:bg-surface-container transition-colors"
          >
            <Map className="h-4 w-4" />
            Explore the Map
          </Link>
          <Link
            href="/vegan-places"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-surface-container-low ghost-border text-on-surface-variant rounded-xl text-sm font-medium hover:bg-surface-container transition-colors"
          >
            <Star className="h-4 w-4" />
            Write a Review
          </Link>
        </div>
      </div>

      {/* Info Modal */}
      {showInfo && (
        <div className="fixed inset-0 z-[2000] bg-black/50 flex items-center justify-center p-4" onClick={() => setShowInfo(false)}>
          <div className="bg-surface-container-lowest rounded-2xl max-w-lg w-full max-h-[80vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-on-surface">How City Ranks Work</h2>
              <button onClick={() => setShowInfo(false)} className="text-on-surface-variant hover:text-on-surface"><X className="h-5 w-5" /></button>
            </div>
            <p className="text-sm text-on-surface-variant mb-4">Every city gets a score from 0 to 100 across four dimensions (25 points each). Every place counts — a 100% vegan spot counts fully, a vegan-friendly spot counts as 0.35 of one.</p>
            <div className="space-y-3 mb-5">
              <div className="bg-emerald-50 rounded-xl p-3">
                <h3 className="font-bold text-emerald-800 text-sm mb-1">Accessibility (0-25 pts)</h3>
                <p className="text-xs text-emerald-700">How easy is it to find a vegan option? Combines raw abundance with per-capita density. A small town with a handful of vegan spots can outscore a megacity where they&apos;re lost in the crowd.</p>
              </div>
              <div className="bg-teal-50 rounded-xl p-3">
                <h3 className="font-bold text-teal-800 text-sm mb-1">Choice (0-25 pts)</h3>
                <p className="text-xs text-teal-700">Volume and purity of vegan options. More places means more choice, with a logarithmic curve that still separates the top cities. Fully-vegan-heavy cities earn a purity bonus.</p>
              </div>
              <div className="bg-blue-50 rounded-xl p-3">
                <h3 className="font-bold text-blue-800 text-sm mb-1">Variety (0-25 pts)</h3>
                <p className="text-xs text-blue-700">Depth across categories: restaurants, stores, stays, events, and orgs. Not just &ldquo;do they have one?&rdquo; — a city with 50 vegan stores scores higher than one with 1.</p>
              </div>
              <div className="bg-purple-50 rounded-xl p-3">
                <h3 className="font-bold text-purple-800 text-sm mb-1">Quality (0-25 pts)</h3>
                <p className="text-xs text-purple-700">Community ratings, Bayesian-smoothed so a single 5-star review can&apos;t game the system. Every city starts near ~7 pts; real reviews push it up toward 25. <strong>Rate places to help your city climb!</strong></p>
              </div>
            </div>
            <div className="bg-surface-container-low rounded-xl p-3 mb-4">
              <h3 className="font-bold text-on-surface text-sm mb-2">Grade Scale</h3>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div><span className="font-bold text-emerald-500">A+</span> <span className="text-on-surface-variant">88-100</span></div>
                <div><span className="font-bold text-emerald-500">A</span> <span className="text-on-surface-variant">78-87</span></div>
                <div><span className="font-bold text-green-500">B</span> <span className="text-on-surface-variant">62-77</span></div>
                <div><span className="font-bold text-yellow-500">C</span> <span className="text-on-surface-variant">45-61</span></div>
                <div><span className="font-bold text-orange-500">D</span> <span className="text-on-surface-variant">30-44</span></div>
                <div><span className="font-bold text-red-500">F</span> <span className="text-on-surface-variant">0-29</span></div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
