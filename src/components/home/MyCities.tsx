'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { MapPin, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { getGradeColor, getScoreBarColor } from '@/lib/score-utils'

interface FollowedCity {
  city: string
  country: string
  currentScore: number
  currentGrade: string
  lastSeenScore: number | null
  delta: number | null
  nextGrade: string | null
  pointsToNext: number | null
  placeCount: number
  fvCount: number
}

export default function MyCities() {
  const { user, authReady } = useAuth()
  const [cities, setCities] = useState<FollowedCity[]>([])
  const [loading, setLoading] = useState(true)

  // Depend on `user?.id` (stable string), not the full `user` object whose
  // reference changes on every auth rehydration. Prevents duplicate fetches.
  const userId = user?.id
  useEffect(() => {
    if (!authReady || !userId) { setLoading(false); return }

    fetch('/api/cities/followed', { credentials: 'include' })
      .then(r => r.ok ? r.json() : { cities: [] })
      .then(data => setCities(data.cities || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [userId, authReady])

  // Exclude the pinned city (already shown in hero)
  const pinnedCity = typeof window !== 'undefined' ? localStorage.getItem('pinned_city_name') : null
  const pinnedCountry = typeof window !== 'undefined' ? localStorage.getItem('pinned_country_name') : null
  const displayCities = cities.filter(c =>
    !(c.city === pinnedCity && c.country === pinnedCountry)
  )

  // Skeleton while auth + fetch resolves — prevents CLS. Only reserve the
  // space if there's a user + authReady (non-logged-in visitors see nothing).
  if (!user || loading) {
    if (!user) return null
    return (
      <div className="mt-6" aria-busy="true">
        <div className="flex items-center gap-2 mb-3">
          <MapPin className="h-4 w-4 text-primary" />
          <h2 className="font-semibold text-on-surface">My Cities</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[0, 1].map(i => (
            <div
              key={i}
              className="bg-surface-container-lowest rounded-xl ghost-border p-3 animate-pulse"
              style={{ minHeight: '108px' }}
            >
              <div className="h-4 w-24 bg-surface-container-high rounded mb-2" />
              <div className="h-3 w-32 bg-surface-container-low rounded mb-3" />
              <div className="h-1.5 w-full bg-surface-container-low rounded-full" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (displayCities.length === 0) return null

  return (
    <div className="mt-6">
      <div className="flex items-center gap-2 mb-3">
        <MapPin className="h-4 w-4 text-primary" />
        <h2 className="font-semibold text-on-surface">My Cities</h2>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {displayCities.map(city => {
          const countrySlug = city.country.toLowerCase().replace(/\s+/g, '-')
          const citySlug = city.city.toLowerCase().replace(/\s+/g, '-')

          return (
            <Link
              key={`${city.city}-${city.country}`}
              href={`/vegan-places/${countrySlug}/${citySlug}`}
              className="bg-surface-container-lowest rounded-xl ghost-border p-3 hover:bg-primary/[0.03] transition-colors group"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="min-w-0">
                  <p className="font-medium text-sm text-on-surface truncate group-hover:text-primary transition-colors">
                    {city.city}
                  </p>
                  <p className="text-[11px] text-on-surface-variant">
                    {city.country} · {city.placeCount} places
                  </p>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <span className={`text-lg font-black ${getGradeColor(city.currentGrade)}`}>
                    {city.currentGrade}
                  </span>
                  {city.delta !== null && city.delta !== 0 && (
                    <span className={`text-[10px] font-bold flex items-center gap-0.5 ${
                      city.delta > 0 ? 'text-emerald-600' : 'text-red-500'
                    }`}>
                      {city.delta > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                      {city.delta > 0 ? '+' : ''}{city.delta}
                    </span>
                  )}
                  {city.delta === null && (
                    <span className="text-[9px] font-medium text-primary bg-primary/10 px-1.5 py-0.5 rounded">NEW</span>
                  )}
                </div>
              </div>

              {/* Score bar */}
              <div className="flex items-center gap-2 mb-1.5">
                <div className="flex-1 h-1.5 bg-surface-container-low rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${getScoreBarColor(city.currentScore)} transition-all`}
                    style={{ width: `${city.currentScore}%` }}
                  />
                </div>
                <span className="text-[10px] font-medium text-on-surface-variant w-8 text-right">
                  {city.currentScore}
                </span>
              </div>

              {/* Gamification hook */}
              {city.pointsToNext && city.nextGrade && (
                <p className="text-[10px] text-on-surface-variant">
                  {city.pointsToNext} pts to reach {city.nextGrade}
                </p>
              )}
            </Link>
          )
        })}
      </div>
    </div>
  )
}
