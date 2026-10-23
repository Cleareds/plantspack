'use client'

import { BadgePercent } from 'lucide-react'

export interface PublicDeal {
  id: string
  title: string
  details: string | null
  audience: 'everyone' | 'supporters'
  starts_on: string
  ends_on: string | null
}

const todayIso = () => new Date().toISOString().slice(0, 10)

/** Deals whose dates include today. Checked in the browser so cached pages never show an ended deal. */
export function liveDeals<T extends { starts_on: string; ends_on: string | null }>(deals: T[]): T[] {
  const t = todayIso()
  return deals.filter((d) => d.starts_on <= t && (!d.ends_on || d.ends_on >= t))
}

/**
 * Deals from a Partner venue on the place page. Always labelled as a deal
 * from the venue; a deal never changes ranking or labels.
 */
export default function PlaceDealsSection({ deals }: { deals: PublicDeal[] }) {
  const live = liveDeals(deals).slice(0, 3)
  if (!live.length) return null
  return (
    <div id="deals" className="p-6 border-b border-outline-variant/15 scroll-mt-20">
      <h2 className="text-lg font-semibold text-on-surface flex items-center gap-2 mb-3">
        <BadgePercent className="h-5 w-5 text-primary" /> {live.length === 1 ? 'Deal' : 'Deals'} from the venue
      </h2>
      <ul className="space-y-3">
        {live.map((d) => (
          <li key={d.id} className="rounded-xl border border-primary/30 bg-primary/5 p-4">
            <div className="font-semibold text-on-surface">{d.title}</div>
            {d.details && <p className="text-sm text-on-surface-variant mt-1">{d.details}</p>}
            <p className="text-xs text-on-surface-variant mt-2">
              {d.audience === 'supporters' ? 'For PlantsPack supporters: show your supporter card from the PlantsPack app or website. ' : ''}
              {d.ends_on ? `Until ${new Date(d.ends_on + 'T00:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}.` : 'Ongoing.'}
            </p>
          </li>
        ))}
      </ul>
    </div>
  )
}
