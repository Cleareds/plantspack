'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Star, Plus, Sparkles, CheckCircle2, AlertCircle } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import CityExperienceForm from './CityExperienceForm'
import CityExperienceCard, { CityExperience } from './CityExperienceCard'

interface CityExperiencesSectionProps {
  countrySlug: string
  citySlug: string
  cityName: string
  /** SSR-fetched initial experiences — seed state; optimistic updates
      from save/edit/delete mutate local state directly from here on. */
  initialExperiences: CityExperience[]
  initialSummary: Summary
}

export interface Summary {
  experience_count: number
  avg_overall_rating: number | null
  avg_eating_out_rating: number | null
  avg_grocery_rating: number | null
}

type Toast = { kind: 'success' | 'error'; message: string } | null

function recomputeSummary(list: CityExperience[]): Summary {
  if (list.length === 0) {
    return { experience_count: 0, avg_overall_rating: null, avg_eating_out_rating: null, avg_grocery_rating: null }
  }
  const avg = (key: 'overall_rating' | 'eating_out_rating' | 'grocery_rating'): number | null => {
    const vals = list.map(e => e[key]).filter((v): v is number => typeof v === 'number')
    return vals.length ? Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10 : null
  }
  return {
    experience_count: list.length,
    avg_overall_rating: avg('overall_rating'),
    avg_eating_out_rating: avg('eating_out_rating'),
    avg_grocery_rating: avg('grocery_rating'),
  }
}

export default function CityExperiencesSection({
  countrySlug, citySlug, cityName, initialExperiences, initialSummary,
}: CityExperiencesSectionProps) {
  const { user, profile } = useAuth()
  const [experiences, setExperiences] = useState<CityExperience[]>(initialExperiences)
  const [summary, setSummary] = useState<Summary>(initialSummary)
  const [showForm, setShowForm] = useState(false)
  const [toast, setToast] = useState<Toast>(null)

  // Reseed when the user navigates to a different city (new SSR props arrive).
  // Intentionally runs only on prop-identity change; within-page mutations
  // are driven by the optimistic handlers below, not by prop reflow.
  useEffect(() => {
    setExperiences(initialExperiences)
    setSummary(initialSummary)
  }, [initialExperiences, initialSummary])

  // Auto-dismiss toast after 4 seconds.
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 4000)
    return () => clearTimeout(t)
  }, [toast])

  const mine = user ? experiences.find(e => e.user_id === user.id) : null
  const others = experiences.filter(e => !(user && e.user_id === user.id))

  const handleSaved = (savedRow: any, wasUpdate: boolean) => {
    setShowForm(false)
    if (!savedRow || !user) {
      // Defensive: if the API response shape unexpectedly drops the row,
      // show a generic success and let the next navigation reconcile.
      setToast({ kind: 'success', message: wasUpdate ? 'Updated!' : 'Thanks for sharing!' })
      return
    }

    const displayExperience: CityExperience = {
      id: savedRow.id,
      user_id: savedRow.user_id,
      overall_rating: savedRow.overall_rating,
      eating_out_rating: savedRow.eating_out_rating,
      grocery_rating: savedRow.grocery_rating,
      summary: savedRow.summary,
      tips: savedRow.tips || [],
      best_neighborhoods: savedRow.best_neighborhoods,
      visited_period: savedRow.visited_period,
      edited_at: savedRow.edited_at,
      created_at: savedRow.created_at,
      users: {
        id: user.id,
        username: profile?.username || user.user_metadata?.username || 'you',
        first_name: profile?.first_name ?? null,
        last_name: profile?.last_name ?? null,
        avatar_url: profile?.avatar_url ?? null,
        subscription_tier: (profile as any)?.subscription_tier ?? null,
      },
    }

    setExperiences(prev => {
      const next = wasUpdate
        ? prev.map(e => (e.user_id === user.id ? displayExperience : e))
        : [displayExperience, ...prev.filter(e => e.user_id !== user.id)]
      setSummary(recomputeSummary(next))
      return next
    })

    setToast({
      kind: 'success',
      message: wasUpdate
        ? 'Your experience was updated. Thanks for keeping it fresh!'
        : 'Thanks for sharing your experience!',
    })
  }

  const handleDelete = async () => {
    if (!user) return
    if (!confirm('Delete your experience for this city?')) return

    // Optimistic remove — card disappears on the first click.
    const snapshot = experiences
    const next = experiences.filter(e => e.user_id !== user.id)
    setExperiences(next)
    setSummary(recomputeSummary(next))

    const res = await fetch(`/api/cities/${countrySlug}/${citySlug}/experiences`, { method: 'DELETE' })
    if (!res.ok) {
      // Rollback
      setExperiences(snapshot)
      setSummary(recomputeSummary(snapshot))
      setToast({ kind: 'error', message: 'Could not delete. Please try again.' })
      return
    }
    setToast({ kind: 'success', message: 'Your experience was deleted.' })
  }

  return (
    <section className="space-y-4">
      {/* Inline toast — green for success, red for error. Auto-dismisses in 4s. */}
      {toast && (
        <div
          className={
            toast.kind === 'success'
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-lg p-3 flex items-start gap-2'
              : 'bg-red-50 border border-red-200 text-red-900 rounded-lg p-3 flex items-start gap-2'
          }
          role="status"
          aria-live="polite"
        >
          {toast.kind === 'success' ? (
            <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-600 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-600 mt-0.5" />
          )}
          <p className="text-sm font-medium flex-1">{toast.message}</p>
          <button
            onClick={() => setToast(null)}
            className={
              toast.kind === 'success'
                ? 'text-emerald-700 hover:text-emerald-900 text-xs font-semibold'
                : 'text-red-700 hover:text-red-900 text-xs font-semibold'
            }
          >
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

          {/* Bottom CTA — reminds scrollers they can add theirs. */}
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
