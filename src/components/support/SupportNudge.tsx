'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Heart, X } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { getUserSubscription, redirectToCheckout } from '@/lib/stripe'

/**
 * On-site, honest cost-transparent supporter ask for LOGGED-IN, FREE-tier users.
 *
 * Self-gating: renders nothing unless the viewer is signed in, on the free
 * tier, and hasn't dismissed it in the last 21 days. Existing supporters and
 * logged-out visitors never see it. Numbers come from /api/support-stats
 * (real cost + real supporter count + coverage %), never inflated.
 *
 * Dismissal is stored in localStorage (no DB write → no per-view cost).
 */
const DISMISS_KEY = 'pp_support_nudge_dismissed_at'
const DISMISS_MS = 21 * 24 * 60 * 60 * 1000

interface Stats { supporterCount: number; monthlyCostEur: number; coveragePct: number }

// Fire-and-forget GA4 event so we can see if the nudge helps or annoys.
function track(action: string, placement: string) {
  try {
    const w = window as unknown as { gtag?: (...a: unknown[]) => void }
    w.gtag?.('event', 'support_nudge', { action, placement })
  } catch { /* analytics is best-effort */ }
}

export default function SupportNudge({ placement = 'profile' }: { placement?: string }) {
  const { user } = useAuth()
  const [tier, setTier] = useState<string | null>(null)
  const [stats, setStats] = useState<Stats | null>(null)
  const [hidden, setHidden] = useState(true)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!user) return
    // frequency cap
    try {
      const ts = Number(localStorage.getItem(DISMISS_KEY) || 0)
      if (Date.now() - ts < DISMISS_MS) return
    } catch { /* private mode etc. */ }
    setHidden(false)
    getUserSubscription(user.id).then((s) => setTier(s?.tier ?? 'free')).catch(() => setTier('free'))
    fetch('/api/support-stats').then((r) => r.json()).then(setStats).catch(() => {})
  }, [user])

  // Wait until we know the tier so we never flash the ask to a supporter.
  const visible = !!user && !hidden && tier === 'free'
  useEffect(() => {
    if (visible) track('shown', placement)
  }, [visible, placement])

  if (!visible) return null

  const dismiss = () => {
    try { localStorage.setItem(DISMISS_KEY, String(Date.now())) } catch { /* ignore */ }
    setHidden(true)
    track('dismissed', placement)
  }

  const support = async () => {
    setLoading(true)
    track('click', placement)
    try { await redirectToCheckout('medium', user!.id) } catch { setLoading(false) }
  }

  const cost = stats?.monthlyCostEur ?? 70
  const n = stats?.supporterCount ?? 0
  const pct = stats?.coveragePct ?? 0

  return (
    <div className="relative rounded-2xl ghost-border bg-surface-container-lowest p-5 mb-6">
      <button
        onClick={dismiss}
        aria-label="Dismiss"
        className="absolute top-3 right-3 text-on-surface-variant hover:text-on-surface transition-colors"
      >
        <X className="h-4 w-4" />
      </button>
      <div className="flex items-start gap-3">
        <div className="mt-0.5 h-9 w-9 shrink-0 rounded-full bg-primary/10 flex items-center justify-center">
          <Heart className="h-4 w-4 text-primary fill-primary" />
        </div>
        <div className="min-w-0">
          <h3 className="font-semibold text-on-surface mb-1">Keep Plants Pack free</h3>
          <p className="text-sm text-on-surface-variant leading-relaxed mb-4">
            Plants Pack costs about €{cost} a month to run — no ads, no investors.{' '}
            {n > 0 && (
              <>Right now {n === 1 ? 'one supporter covers' : `${n} supporters cover`} about {pct}% of that. </>
            )}
            €3/month from you helps close the gap.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={support}
              disabled={loading}
              className="px-4 py-2 rounded-xl bg-primary text-on-primary font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {loading ? 'Starting…' : 'Become a supporter — €3/mo'}
            </button>
            <Link href="/support" className="text-sm font-medium text-primary hover:underline">
              Other ways to help →
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
