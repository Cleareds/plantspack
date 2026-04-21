'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { Star, Plus, Loader2, Sparkles } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import CityExperienceForm from './CityExperienceForm'
import CityExperienceCard, { CityExperience } from './CityExperienceCard'

interface CityExperiencesSectionProps {
  countrySlug: string
  citySlug: string
  cityName: string
}

interface Summary {
  experience_count: number
  avg_overall_rating: number | null
  avg_eating_out_rating: number | null
  avg_grocery_rating: number | null
}

export default function CityExperiencesSection({ countrySlug, citySlug, cityName }: CityExperiencesSectionProps) {
  const { user } = useAuth()
  const [experiences, setExperiences] = useState<CityExperience[]>([])
  const [summary, setSummary] = useState<Summary>({ experience_count: 0, avg_overall_rating: null, avg_eating_out_rating: null, avg_grocery_rating: null })
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/cities/${countrySlug}/${citySlug}/experiences`, { cache: 'no-store' })
      const data = await res.json()
      setExperiences(data.experiences || [])
      setSummary(data.summary || summary)
    } finally {
      setLoading(false)
    }
  }, [countrySlug, citySlug, summary])

  useEffect(() => { load() }, [load])

  const mine = user ? experiences.find(e => e.user_id === user.id) : null
  const others = experiences.filter(e => !(user && e.user_id === user.id))

  const handleDelete = async () => {
    if (!confirm('Delete your experience for this city?')) return
    await fetch(`/api/cities/${countrySlug}/${citySlug}/experiences`, { method: 'DELETE' })
    await load()
  }

  return (
    <section className="space-y-4">
      <header className="flex items-end justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-xl sm:text-2xl font-semibold text-on-surface flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Vegan experience in {cityName}
          </h2>
          {summary.experience_count > 0 && summary.avg_overall_rating != null && (
            <p className="text-sm text-on-surface-variant mt-1">
              <span className="inline-flex items-center gap-1 font-semibold text-on-surface">
                <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                {summary.avg_overall_rating.toFixed(1)}
              </span>
              {' · '}
              <span>{summary.experience_count} {summary.experience_count === 1 ? 'experience' : 'experiences'} from travelers</span>
            </p>
          )}
        </div>

        {!showForm && !mine && (
          user ? (
            <button
              onClick={() => setShowForm(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full bg-primary text-on-primary-btn text-sm font-semibold hover:opacity-90"
            >
              <Plus className="w-4 h-4" />
              Share your experience
            </button>
          ) : (
            <Link
              href={`/auth?redirect=/vegan-places/${countrySlug}/${citySlug}`}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full bg-primary text-on-primary-btn text-sm font-semibold hover:opacity-90"
            >
              <Plus className="w-4 h-4" />
              Sign in to share
            </Link>
          )
        )}
      </header>

      {/* Form (toggle) */}
      {showForm && (
        <CityExperienceForm
          countrySlug={countrySlug}
          citySlug={citySlug}
          cityName={cityName}
          initial={mine ? {
            overall_rating: mine.overall_rating,
            eating_out_rating: mine.eating_out_rating,
            grocery_rating: mine.grocery_rating,
            summary: mine.summary,
            tips: mine.tips,
            best_neighborhoods: mine.best_neighborhoods,
            visited_period: mine.visited_period,
          } : undefined}
          onCancel={() => setShowForm(false)}
          onSaved={async () => { setShowForm(false); await load() }}
        />
      )}

      {/* User's own experience, if any */}
      {mine && !showForm && (
        <CityExperienceCard
          experience={mine}
          isAuthor
          onEdit={() => setShowForm(true)}
          onDelete={handleDelete}
        />
      )}

      {/* Others */}
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-on-surface-variant" />
        </div>
      ) : others.length === 0 && !mine ? (
        <div className="bg-surface-container-low rounded-lg p-6 text-center">
          <p className="text-sm text-on-surface-variant">
            No vegan experiences yet for {cityName}.{' '}
            {user ? (
              <button onClick={() => setShowForm(true)} className="text-primary hover:underline font-medium">Be the first to share yours →</button>
            ) : (
              <Link href={`/auth?redirect=/vegan-places/${countrySlug}/${citySlug}`} className="text-primary hover:underline font-medium">
                Sign in to share →
              </Link>
            )}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {others.map(e => <CityExperienceCard key={e.id} experience={e} />)}
        </div>
      )}
    </section>
  )
}
