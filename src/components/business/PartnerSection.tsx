'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { BadgePercent, CalendarCheck, LineChart, Lock, Megaphone, Sparkles } from 'lucide-react'
import { PARTNER_FEATURES, PARTNER_PRICE, type PlacePlan } from '@/lib/business/plan'
import type { OwnedPlace } from '@/lib/business/owned-places'

type View = 'free' | 'partner'

/**
 * Plan line + Partner tools for one place. Owners see what their plan gives
 * them. Admins get a "View as" switch to see the free and the Partner
 * dashboard of any place (admins can use every tool either way).
 */
export function PartnerSection({ place }: { place: OwnedPlace }) {
  const [plan, setPlan] = useState<PlacePlan | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [view, setView] = useState<View>('free')

  useEffect(() => {
    fetch(`/api/business/places/${place.id}`, { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!d) return
        setPlan(d.plan)
        setIsAdmin(!!d.isAdmin)
        setView(d.plan?.plan === 'partner' ? 'partner' : 'free')
      })
      .catch(() => {})
  }, [place.id])

  if (!plan) return null
  const showPartner = isAdmin ? view === 'partner' : plan.plan === 'partner'

  return (
    <div className="px-5 pb-5">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <p className="text-sm text-on-surface-variant">
          {plan.plan === 'partner'
            ? <>This place is on the <span className="font-semibold text-on-surface">Partner plan</span>{plan.source === 'admin' ? ' (granted by PlantsPack)' : plan.periodEnd ? `, renews ${new Date(plan.periodEnd).toLocaleDateString()}` : ''}.</>
            : <>This place is on the <span className="font-semibold text-on-surface">free plan</span>.</>}
          {' '}<Link href={`/business/places/${place.id}/plan`} className="text-primary font-medium hover:underline">Plan and billing</Link>
        </p>
        {isAdmin && (
          <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-surface-container-low text-xs" role="group" aria-label="View dashboard as">
            <span className="px-2 text-on-surface-variant">Admin, view as:</span>
            {(['free', 'partner'] as View[]).map((v) => (
              <button
                key={v}
                type="button"
                aria-pressed={view === v}
                onClick={() => setView(v)}
                className={`px-3 py-1 rounded-lg font-medium ${view === v ? 'bg-primary text-on-primary-btn' : 'text-on-surface hover:bg-surface-container'}`}
              >
                {v === 'free' ? 'Free owner' : 'Partner owner'}
              </button>
            ))}
          </div>
        )}
      </div>

      {showPartner ? (
        <div className="grid sm:grid-cols-3 gap-3">
          <Tile href={`/business/places/${place.id}/deals`} icon={<BadgePercent className="h-4 w-4 text-primary" />} title="Deals" text="Up to 3 deals on your page and in the app." />
          <Tile href={`/business/places/${place.id}/insights`} icon={<LineChart className="h-4 w-4 text-primary" />} title="Detailed stats" text="12-week trends, taps, and your city comparison." />
          <Tile href={`/business/places/${place.id}/message`} icon={<Megaphone className="h-4 w-4 text-primary" />} title="Message followers" text="One message a month to people who follow your city or saved your place." />
          <Tile href={`/business/places/${place.id}/buttons`} icon={<CalendarCheck className="h-4 w-4 text-primary" />} title="Booking and order buttons" text="Link your own booking page or online ordering." />
          <Tile href={`/business/places/${place.id}/events`} icon={<Sparkles className="h-4 w-4 text-primary" />} title="Featured event" text="Put one event a month at the top of the events calendar." />
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-primary/40 bg-primary/5 p-5">
          <div className="flex items-center gap-2 font-semibold text-on-surface">
            <Sparkles className="h-4 w-4 text-primary" /> Partner plan: €{PARTNER_PRICE.monthEur} a month or €{PARTNER_PRICE.yearEur} a year
          </div>
          <ul className="mt-3 grid sm:grid-cols-3 gap-3">
            {PARTNER_FEATURES.map((f) => (
              <li key={f.key} className="text-sm">
                <span className="flex items-center gap-1.5 font-medium text-on-surface"><Lock className="h-3.5 w-3.5 text-on-surface-variant" /> {f.title}</span>
                <span className="text-on-surface-variant">{f.text}</span>
              </li>
            ))}
          </ul>
          <p className="text-xs text-on-surface-variant mt-3">The plan buys tools, never a better position, label or reviews. Everything above stays free.</p>
          <Link href={`/business/places/${place.id}/plan`} className="inline-flex mt-3 px-4 py-2 rounded-xl bg-primary text-on-primary-btn text-sm font-medium">
            See the Partner plan
          </Link>
        </div>
      )}
    </div>
  )
}

function Tile({ href, icon, title, text }: { href: string; icon: React.ReactNode; title: string; text: string }) {
  return (
    <Link href={href} className="p-4 rounded-xl ghost-border hover:bg-surface-container-low transition-colors">
      <div className="flex items-center gap-2 font-semibold text-on-surface">{icon}{title}</div>
      <p className="text-sm text-on-surface-variant mt-1">{text}</p>
    </Link>
  )
}
