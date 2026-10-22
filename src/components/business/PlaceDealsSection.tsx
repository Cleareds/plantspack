import { BadgePercent } from 'lucide-react'

export interface PublicDeal {
  id: string
  title: string
  details: string | null
  audience: 'everyone' | 'supporters'
  ends_on: string | null
}

/**
 * Deals from a Partner venue, server-rendered on the place page. Always
 * labelled as a deal from the venue; a deal never changes ranking or labels.
 */
export default function PlaceDealsSection({ deals }: { deals: PublicDeal[] }) {
  return (
    <div id="deals" className="p-6 border-b border-outline-variant/15 scroll-mt-20">
      <h2 className="text-lg font-semibold text-on-surface flex items-center gap-2 mb-3">
        <BadgePercent className="h-5 w-5 text-primary" /> {deals.length === 1 ? 'Deal' : 'Deals'} from the venue
      </h2>
      <ul className="space-y-3">
        {deals.map((d) => (
          <li key={d.id} className="rounded-xl border border-primary/30 bg-primary/5 p-4">
            <div className="font-semibold text-on-surface">{d.title}</div>
            {d.details && <p className="text-sm text-on-surface-variant mt-1">{d.details}</p>}
            <p className="text-xs text-on-surface-variant mt-2">
              {d.audience === 'supporters' ? 'For PlantsPack supporters: show your supporter badge in the app. ' : ''}
              {d.ends_on ? `Until ${new Date(d.ends_on + 'T00:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}.` : 'Ongoing.'}
            </p>
          </li>
        ))}
      </ul>
    </div>
  )
}
