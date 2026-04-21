'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Star, Plus, Sparkles, CheckCircle2 } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import CityExperienceForm from './CityExperienceForm'
import CityExperienceCard, { CityExperience } from './CityExperienceCard'

interface CityExperiencesSectionProps {
  countrySlug: string
  citySlug: string
  cityName: string
  /** SSR-fetched initial experiences — avoids a client-side loading flash. */
  initialExperiences: CityExperience[]
  initialSummary: Summary
}

export interface Summary {
  experience_count: number
  avg_overall_rating: number | null
  avg_eating_out_rating: number | null
  avg_grocery_rating: number | null
}

// sessionStorage key → a toast to show ONCE after reload. Lets us do a
// full-page reload for reliable re-render while still greeting the user
// with a success message on the new page.
const TOAST_KEY = 'pp_experience_toast'

export default function CityExperiencesSection({
  countrySlug, citySlug, cityName, initialExperiences, initialSummary,
}: CityExperiencesSectionProps) {
  const { user } = useAuth()
  const router = useRouter()
  const experiences = initialExperiences
  const summary = initialSummary
  const [showForm, setShowForm] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  // Surface any pending toast from a just-completed action.
  useEffect(() => {
    try {
      const pending = sessionStorage.getItem(TOAST_KEY)
      if (pending) {
        setToast(pending)
        sessionStorage.removeItem(TOAST_KEY)
        const t = setTimeout(() => setToast(null), 4000)
        return () => clearTimeout(t)
      }
    } catch {}
  }, [])

  const mine = user ? experiences.find(e => e.user_id === user.id) : null
  const others = experiences.filter(e => !(user && e.user_id === user.id))

  // Full reload is the simplest way to guarantee every part of the page —
  // stats strip, aggregate rating, card list, contributions badge — picks
  // up the new state. router.refresh() alone was flaky (the view didn't
  // always update until a manual reload).
  const reloadWithToast = (msg: string) => {
    try { sessionStorage.setItem(TOAST_KEY, msg) } catch {}
    window.location.reload()
  }

  const handleDelete = async () => {
    if (!confirm('Delete your experience for this city?')) return
    const res = await fetch(`/api/cities/${countrySlug}/${citySlug}/experiences`, { method: 'DELETE' })
    if (!res.ok) {
      setToast('Could not delete. Please try again.')
      setTimeout(() => setToast(null), 4000)
      return
    }
    reloadWithToast('Your experience was deleted.')
  }

  const handleSaved = (updated: boolean) => {
    setShowForm(false)
    reloadWithToast(updated ? 'Your experience was updated. Thanks for keeping it fresh!' : 'Thanks for sharing your experience!')
    // router.refresh() is now redundant with the full reload but kept as a
    // no-op safety in case reload is blocked by a browser setting.
    router.refresh()
  }

  return (
    <section className="space-y-4">
      {/* Success / error toast — rendered inline (not floating) so it
          lives above the fold without extra UI chrome. */}
      {toast && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-lg p-3 flex items-start gap-2" role="status" aria-live="polite">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-600 mt-0.5" />
          <p className="text-sm font-medium flex-1">{toast}</p>
          <button onClick={() => setToast(null)} className="text-emerald-700 hover:text-emerald-900 text-xs font-semibold">
            Dismiss
          </button>
        </div>
      )}

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
          onSaved={handleSaved}
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
      {others.length === 0 && !mine ? (
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
        <>
          <div className="space-y-3">
            {others.map(e => <CityExperienceCard key={e.id} experience={e} />)}
          </div>

          {/* Bottom CTA — when visitors have read through the list, remind
              them they can add theirs. Hidden if user already wrote one or
              the form is open. */}
          {!mine && !showForm && (
            <div className="bg-primary-container/50 border border-primary/20 rounded-lg p-5 text-center mt-4">
              <p className="text-sm font-medium text-on-surface mb-1">
                Been to {cityName}?
              </p>
              <p className="text-xs text-on-surface-variant mb-3">
                Share what it&apos;s like being vegan here. Help the next traveler plan their trip.
              </p>
              {user ? (
                <button
                  onClick={() => setShowForm(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-primary text-on-primary-btn text-sm font-semibold hover:opacity-90"
                >
                  <Plus className="w-4 h-4" />
                  Share your experience
                </button>
              ) : (
                <Link
                  href={`/auth?redirect=/vegan-places/${countrySlug}/${citySlug}`}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-primary text-on-primary-btn text-sm font-semibold hover:opacity-90"
                >
                  <Plus className="w-4 h-4" />
                  Sign in to share
                </Link>
              )}
            </div>
          )}
        </>
      )}
    </section>
  )
}
