'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import FilteredCount from '@/components/ui/FilteredCount'
import { useVeganFilter } from '@/lib/vegan-filter-context'
import { getGradeColor } from '@/lib/score-utils'

interface CityData {
  name: string
  slug: string
  count: number
  stats: { fullyVegan?: number; cityCount?: number }
}

interface CityScore {
  city: string
  country: string
  score: number
  grade: string
}

interface Props {
  cities: CityData[]
  cityImages: Record<string, string>
  countryName: string
  countrySlug: string
  cityScores: CityScore[]
}

type SortMode = 'places' | 'alpha' | 'score'

export default function CountryCityGrid({ cities, cityImages, countryName, countrySlug, cityScores }: Props) {
  const [sortMode, setSortMode] = useState<SortMode>('places')
  const { isFullyVeganOnly } = useVeganFilter()

  const scoreMap = useMemo(() => {
    const map = new Map<string, CityScore>()
    for (const s of cityScores) {
      map.set(s.city, s)
    }
    return map
  }, [cityScores])

  const sorted = useMemo(() => {
    const arr = [...cities]
    switch (sortMode) {
      case 'alpha':
        arr.sort((a, b) => a.name.localeCompare(b.name))
        break
      case 'score':
        arr.sort((a, b) => {
          const sa = scoreMap.get(a.name)?.score ?? -1
          const sb = scoreMap.get(b.name)?.score ?? -1
          return sb - sa
        })
        break
      case 'places':
      default:
        arr.sort((a, b) => {
          const ca = isFullyVeganOnly ? (a.stats?.fullyVegan || 0) : a.count
          const cb = isFullyVeganOnly ? (b.stats?.fullyVegan || 0) : b.count
          return cb - ca
        })
        break
    }
    return arr
  }, [cities, sortMode, isFullyVeganOnly, scoreMap])

  return (
    <div>
      {/* Sort pills */}
      <div className="flex gap-2 mb-4">
        {(['places', 'alpha', 'score'] as SortMode[]).map(mode => (
          <button key={mode} onClick={() => setSortMode(mode)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              sortMode === mode ? 'bg-primary text-on-primary-btn' : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'
            }`}>
            {mode === 'places' ? 'By places' : mode === 'alpha' ? 'A–Z' : 'By score'}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {sorted.map(city => {
          const img = cityImages[`${city.name}|||${countryName}`]
          const score = scoreMap.get(city.name)

          return (
            <Link key={city.slug} href={`/vegan-places/${countrySlug}/${city.slug}`} prefetch={false}
              className="group flex items-center gap-3 p-3 bg-surface-container-lowest rounded-xl ghost-border hover:border-primary/20 transition-all hover:-translate-y-0.5">
              {img ? (
                <img src={img} alt={city.name} className="w-14 h-14 rounded-lg object-cover flex-shrink-0" />
              ) : (
                <div className="w-14 h-14 rounded-lg bg-surface-container-low flex items-center justify-center text-lg flex-shrink-0">🏙️</div>
              )}
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-on-surface group-hover:text-primary transition-colors text-sm truncate">
                  {city.name}
                </h3>
                <p className="text-[11px] text-on-surface-variant">
                  <FilteredCount total={city.count} fullyVegan={city.stats?.fullyVegan} />
                </p>
              </div>
              {score && (
                <span className={`text-lg font-bold ${getGradeColor(score.grade)} flex-shrink-0`}>{score.grade}</span>
              )}
              <ArrowRight className="h-4 w-4 text-outline group-hover:text-primary transition-colors flex-shrink-0" />
            </Link>
          )
        })}
      </div>
    </div>
  )
}
