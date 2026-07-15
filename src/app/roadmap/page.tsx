'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/lib/auth'
import Link from 'next/link'
import { CheckCircle, Lock, ThumbsUp, MapPin, Sparkles, Heart, ArrowLeft } from 'lucide-react'

/**
 * Public roadmap with supporter-gated voting.
 *
 * Two sections:
 *   - Features: what gets built next on the platform
 *   - Coverage: which countries/cities get the next deep audit pass
 *
 * Voting is supporter-only and toggle-able (click a second time to
 * un-vote). Anyone signed in can SEE the totals; only supporters can
 * cast votes. Non-supporters see a lock + CTA to /support.
 *
 * The data is hard-coded here because the list is curated. When/if
 * supporter count grows past hand-curation, the source of truth
 * moves to a Supabase table; this file is structured so swapping
 * the items array for a fetch is a one-place change.
 */

type Status = 'shipped' | 'in-development' | 'ongoing' | 'planned' | 'exploring'

interface VoteItem {
  id: string
  category: 'feature' | 'coverage'
  label: string
  description: string
  status: Status
  quarter?: string
  votable: boolean // shipped items are visible but locked
}

const ITEMS: VoteItem[] = [
  // ---------------- Features ----------------
  { id: 'packs', category: 'feature', label: 'Packs', description: 'Save and organise places into personal collections — your favourites, bucket lists, city guides.', status: 'shipped', quarter: 'Q1 2026', votable: false },
  { id: 'trips', category: 'feature', label: 'Trips & Check-ins', description: 'Log places you have visited, build a personal history of vegan travels.', status: 'shipped', quarter: 'Q1 2026', votable: false },
  { id: 'social-feed', category: 'feature', label: 'Community feed', description: 'Follow other plant-based travellers, share posts, discover places through your community.', status: 'shipped', quarter: 'Q1 2026', votable: false },
  { id: 'recipe-collection', category: 'feature', label: 'Recipe collection (vegan creators)', description: 'Curated recipes from 100% vegan creators with proper attribution.', status: 'shipped', quarter: 'Q2 2026', votable: false },
  { id: 'event-calendar', category: 'feature', label: 'Event calendar', description: 'Local + travel-worthy vegan events. Notifications for cities you follow.', status: 'shipped', quarter: 'Q2 2026', votable: false },
  { id: 'companion', category: 'feature', label: 'Companion (vegan platform guide)', description: 'A non-AI companion that surfaces personalised picks from your follows and pinned city.', status: 'planned', votable: true },
  { id: 'mobile-app', category: 'feature', label: 'iOS & Android app', description: 'Native mobile wrapper around the platform with offline + push.', status: 'planned', votable: true },
  { id: 'browser-extension', category: 'feature', label: 'Browser extension', description: 'Right-click any place on Google Maps to add it to Plants Pack.', status: 'exploring', votable: true },
  { id: 'internal-messaging', category: 'feature', label: 'Direct messages', description: 'Private DMs between members so trip planning + place tips stay on-platform.', status: 'exploring', votable: true },
  { id: 'better-packs', category: 'feature', label: 'Pack collaborations', description: 'Co-build a Pack with friends; shared trip planning.', status: 'exploring', votable: true },
  { id: 'improve-notifications', category: 'feature', label: 'Smarter notifications', description: 'Tunable digest for new places in your follows / friends activity.', status: 'planned', votable: true },
  { id: 'fixes-stability', category: 'feature', label: 'Quality & stability work', description: 'Ongoing: faster pages, fewer bugs, better mobile UX.', status: 'ongoing', votable: true },

  // ---------------- Coverage ----------------
  { id: 'expand-germany-tier2', category: 'coverage', label: 'Germany tier-2 cities', description: 'Düsseldorf, Cologne, Stuttgart, Hamburg — deep audit + verified fully-vegan promotions.', status: 'planned', votable: true },
  { id: 'expand-brazil', category: 'coverage', label: 'Brazil — São Paulo + Rio in depth', description: 'Top-rated venues verified, neighbourhood coverage, PT-friendly metadata.', status: 'planned', votable: true },
  { id: 'expand-netherlands-beyond-amsterdam', category: 'coverage', label: 'Netherlands beyond Amsterdam', description: 'Utrecht, Rotterdam, The Hague, Groningen — all need a proper audit.', status: 'planned', votable: true },
  { id: 'expand-greece', category: 'coverage', label: 'Greece (Athens + Thessaloniki + islands)', description: 'Full Greece pass with travel-intent search optimisation.', status: 'planned', votable: true },
  { id: 'expand-austria-portugal', category: 'coverage', label: 'Austria + Portugal tier-2 cities', description: 'Vienna, Graz, Salzburg, Porto — verified venues + city scoring.', status: 'planned', votable: true },
  { id: 'expand-eastern-europe', category: 'coverage', label: 'Eastern Europe expansion', description: 'Warsaw, Prague, Budapest, Bucharest — vegan scene is growing fast.', status: 'exploring', votable: true },
  { id: 'expand-uk-tier2', category: 'coverage', label: 'UK tier-2 cities', description: 'Brighton, Bristol, Manchester, Edinburgh — beyond London-only coverage.', status: 'exploring', votable: true },
  { id: 'expand-spain-tier2', category: 'coverage', label: 'Spain tier-2 cities', description: 'Valencia, Seville, Granada, Bilbao — local audit + Spanish metadata.', status: 'exploring', votable: true },
  // Shipped coverage milestones — proof we deliver. Live at the
  // bottom of the Coverage column thanks to the votable=false sink.
  { id: 'coverage-belgium-blog', category: 'coverage', label: 'Belgium — full guide + blog post', description: 'In-depth Belgium coverage: every Belgian city with 5+ places audited, plus a written guide to the vegan scene published on the blog.', status: 'shipped', quarter: 'Q2 2026', votable: false },
  { id: 'coverage-belgium-fully-vegan', category: 'coverage', label: '100% vegan places in Belgium verified', description: 'Every fully-vegan venue in Belgium reviewed and confirmed 100% vegan against menu + website checks. No mistakenly-tagged spots remain.', status: 'shipped', quarter: 'Q2 2026', votable: false },
]

const STATUS_BADGE: Record<Status, { label: string; cls: string }> = {
  shipped: { label: 'Shipped', cls: 'bg-emerald-100 text-emerald-800' },
  'in-development': { label: 'In progress', cls: 'bg-blue-100 text-blue-800' },
  ongoing: { label: 'Ongoing', cls: 'bg-amber-100 text-amber-800' },
  planned: { label: 'Planned', cls: 'bg-purple-100 text-purple-800' },
  exploring: { label: 'Exploring', cls: 'bg-slate-200 text-slate-700' },
}

export default function RoadmapPage() {
  const { user, profile } = useAuth()
  const [votes, setVotes] = useState<Record<string, number>>({})
  const [userVotes, setUserVotes] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [pending, setPending] = useState<Set<string>>(new Set())
  const [error, setError] = useState<string | null>(null)

  // subscription_tier isn't in the generated UserProfile type — cast.
  // Matches the pattern used in src/components/places/PlaceEditButton.tsx.
  const tier = (profile as { subscription_tier?: string } | null)?.subscription_tier
  const isSupporter = tier === 'medium' || tier === 'premium'

  const fetchVotes = useCallback(async () => {
    try {
      setLoading(true)
      const r = await fetch('/api/roadmap/votes')
      const d = await r.json()
      if (r.ok) {
        setVotes(d.votes || {})
        setUserVotes(new Set<string>(d.userVotes || []))
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchVotes()
  }, [fetchVotes])

  const toggleVote = async (id: string) => {
    if (!user) return
    if (!isSupporter) {
      setError('Voting is a supporter perk. Join from /support to cast your vote.')
      return
    }
    if (pending.has(id)) return
    setError(null)
    setPending((prev) => new Set(prev).add(id))

    // Optimistic
    const wasVoted = userVotes.has(id)
    const nextUserVotes = new Set(userVotes)
    if (wasVoted) nextUserVotes.delete(id)
    else nextUserVotes.add(id)
    setUserVotes(nextUserVotes)
    setVotes((prev) => ({ ...prev, [id]: Math.max(0, (prev[id] || 0) + (wasVoted ? -1 : 1)) }))

    try {
      const r = await fetch('/api/roadmap/votes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      if (!r.ok) {
        // Roll back
        setUserVotes((prev) => {
          const next = new Set(prev)
          if (wasVoted) next.add(id)
          else next.delete(id)
          return next
        })
        setVotes((prev) => ({ ...prev, [id]: Math.max(0, (prev[id] || 0) + (wasVoted ? 1 : -1)) }))
        const data = await r.json().catch(() => ({}))
        setError(data.error || 'Failed to record vote')
      }
    } finally {
      setPending((prev) => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    }
  }

  const features = ITEMS.filter((i) => i.category === 'feature')
  const coverage = ITEMS.filter((i) => i.category === 'coverage')

  // Votable (open) items rise to the top so the active queue is what
  // visitors see first; shipped items sink to the bottom as a
  // "what's already done" reference.
  const sortedByVotes = (list: VoteItem[]) =>
    [...list].sort((a, b) => {
      if (a.votable && !b.votable) return -1
      if (!a.votable && b.votable) return 1
      return (votes[b.id] || 0) - (votes[a.id] || 0)
    })

  return (
    <div className="min-h-screen bg-surface">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <Link href="/support" className="inline-flex items-center text-sm text-on-surface-variant hover:text-on-surface mb-6">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Support
        </Link>

        <div className="mb-8">
          <h1 className="font-headline font-extrabold text-3xl md:text-4xl text-on-surface tracking-tight mb-2">
            Roadmap
          </h1>
          <p className="text-on-surface-variant max-w-2xl">
            What we are building next and where we are expanding coverage. Supporters vote — the most-voted items rise to the top of our queue.
          </p>
        </div>

        {/* Supporter status banner */}
        {!user ? (
          <div className="rounded-2xl ghost-border bg-surface-container-lowest p-4 mb-8 flex items-center gap-3">
            <Lock className="h-5 w-5 text-on-surface-variant shrink-0" />
            <p className="text-sm text-on-surface-variant flex-1">
              <Link href="/auth" className="text-primary font-medium hover:underline">Sign in</Link> to see vote counts. Voting requires supporter status.
            </p>
          </div>
        ) : !isSupporter ? (
          <div className="rounded-2xl border-2 border-primary/30 bg-primary/5 p-4 mb-8 flex items-center gap-3">
            <Heart className="h-5 w-5 text-primary shrink-0" />
            <p className="text-sm text-on-surface flex-1">
              Voting is a supporter perk. <Link href="/support" className="text-primary font-bold hover:underline">Become a supporter for €3/month</Link> to influence what gets built next.
            </p>
          </div>
        ) : (
          <div className="rounded-2xl border-2 border-emerald-200 bg-emerald-50 p-4 mb-8 flex items-center gap-3">
            <CheckCircle className="h-5 w-5 text-emerald-700 shrink-0" />
            <p className="text-sm text-emerald-900 flex-1">
              You are a supporter — your votes count. Click any item below to vote or un-vote.
            </p>
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 mb-6 text-sm text-red-800">
            {error}
          </div>
        )}

        {/* Two columns on desktop, stacked on mobile. Each column is
            independently scrollable in content height so a long Coverage
            list doesn't drag the Features column down visually. */}
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-10 items-start">
          <Section
            title="Features"
            subtitle="What we build next"
            icon={<Sparkles className="h-5 w-5 text-primary" />}
            items={sortedByVotes(features)}
            votes={votes}
            userVotes={userVotes}
            pending={pending}
            loading={loading}
            canVote={isSupporter}
            isSignedIn={!!user}
            onVote={toggleVote}
          />
          <Section
            title="Coverage"
            subtitle="Where we expand the directory next"
            icon={<MapPin className="h-5 w-5 text-primary" />}
            items={sortedByVotes(coverage)}
            votes={votes}
            userVotes={userVotes}
            pending={pending}
            loading={loading}
            canVote={isSupporter}
            isSignedIn={!!user}
            onVote={toggleVote}
          />
        </div>

        <p className="text-center text-xs text-on-surface-variant mt-12 max-w-md mx-auto">
          Missing something obvious? <Link href="/contact" className="underline">Tell us</Link> — we curate this list and add new items roughly monthly.
        </p>
      </div>
    </div>
  )
}

function Section(props: {
  title: string
  subtitle: string
  icon: React.ReactNode
  items: VoteItem[]
  votes: Record<string, number>
  userVotes: Set<string>
  pending: Set<string>
  loading: boolean
  canVote: boolean
  isSignedIn: boolean
  onVote: (id: string) => void
}) {
  const { title, subtitle, icon, items, votes, userVotes, pending, loading, canVote, isSignedIn, onVote } = props
  return (
    <section>
      <div className="flex items-center gap-3 mb-4">
        {icon}
        <div>
          <h2 className="font-bold text-xl text-on-surface">{title}</h2>
          <p className="text-xs text-on-surface-variant">{subtitle}</p>
        </div>
      </div>

      <ul className="space-y-2">
        {items.map((item) => {
          const count = votes[item.id] || 0
          const voted = userVotes.has(item.id)
          const isPending = pending.has(item.id)
          const status = STATUS_BADGE[item.status]
          return (
            <li
              key={item.id}
              className="bg-surface-container-lowest ghost-border rounded-xl p-4 flex items-start gap-4"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <h3 className="font-semibold text-on-surface">{item.label}</h3>
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${status.cls}`}>
                    {status.label}
                  </span>
                  {item.quarter && (
                    <span className="text-[10px] text-on-surface-variant">{item.quarter}</span>
                  )}
                </div>
                <p className="text-sm text-on-surface-variant leading-relaxed">{item.description}</p>
              </div>
              <div className="flex flex-col items-stretch gap-1 min-w-[88px]">
                <button
                  type="button"
                  onClick={() => onVote(item.id)}
                  disabled={!item.votable || isPending || (!isSignedIn) || loading}
                  aria-pressed={voted}
                  className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-full text-sm font-semibold transition-colors disabled:cursor-not-allowed ${
                    !item.votable
                      ? 'bg-surface-container-low text-on-surface-variant'
                      : voted
                      ? 'bg-primary text-on-primary-btn'
                      : canVote
                      ? 'bg-surface-container-low text-on-surface hover:bg-primary/10 hover:text-primary'
                      : 'bg-surface-container-low text-on-surface-variant'
                  }`}
                  title={
                    !item.votable
                      ? 'Already shipped'
                      : !isSignedIn
                      ? 'Sign in to vote'
                      : !canVote
                      ? 'Supporters only'
                      : voted
                      ? 'Click to un-vote'
                      : 'Click to vote'
                  }
                >
                  {!item.votable ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : !isSignedIn || !canVote ? (
                    <Lock className="h-4 w-4" />
                  ) : (
                    <ThumbsUp className="h-4 w-4" />
                  )}
                  <span>{count}</span>
                </button>
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
