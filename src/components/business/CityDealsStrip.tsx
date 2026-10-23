'use client'

import Link from 'next/link'
import { BadgePercent } from 'lucide-react'
import type { CityDeal } from '@/lib/business/city-deals'
import { liveDeals } from './PlaceDealsSection'

/**
 * Deals from Partner places in this city. Labelled as deals from the venues;
 * the strip never changes the order of the place list below it.
 */
export default function CityDealsStrip({ deals, cityName }: { deals: CityDeal[]; cityName: string }) {
  const live = liveDeals(deals)
  if (!live.length) return null
  return (
    <section className="mb-8" aria-labelledby="city-deals-heading">
      <h2 id="city-deals-heading" className="text-lg font-semibold text-on-surface flex items-center gap-2 mb-3">
        <BadgePercent className="h-5 w-5 text-primary" /> Deals from vegan places in {cityName}
      </h2>
      <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 snap-x">
        {live.map((d) => (
          <Link
            key={d.id}
            prefetch={false}
            href={`/place/${d.place.slug || d.place.id}#deals`}
            className="snap-start flex-shrink-0 w-72 rounded-xl border border-primary/30 bg-primary/5 p-4 hover:bg-primary/10 transition-colors"
          >
            <div className="text-xs font-medium text-primary">Deal from {d.place.name}</div>
            <div className="font-semibold text-on-surface mt-1 leading-snug">{d.title}</div>
            {d.details && <p className="text-sm text-on-surface-variant mt-1 line-clamp-2">{d.details}</p>}
            <p className="text-xs text-on-surface-variant mt-2">
              {d.audience === 'supporters' ? 'Supporters only. ' : ''}
              {d.ends_on ? `Until ${new Date(d.ends_on + 'T00:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}` : 'Ongoing'}
            </p>
          </Link>
        ))}
      </div>
    </section>
  )
}
