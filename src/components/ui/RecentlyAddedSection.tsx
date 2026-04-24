'use client'

import Link from 'next/link'
import { useVeganFilter } from '@/lib/vegan-filter-context'

interface Place {
  id: string
  name: string
  slug: string | null
  city: string | null
  country: string
  main_image_url: string | null
  vegan_level: string
}

interface Props {
  allPlaces: Place[]
  allCount: number
  fullyVeganPlaces: Place[]
  fullyVeganCount: number
}

export default function RecentlyAddedSection({ allPlaces, allCount, fullyVeganPlaces, fullyVeganCount }: Props) {
  const { isFullyVeganOnly } = useVeganFilter()

  const places = isFullyVeganOnly ? fullyVeganPlaces.slice(0, 6) : allPlaces.slice(0, 6)
  const count = isFullyVeganOnly ? fullyVeganCount : allCount
  const label = isFullyVeganOnly ? 'fully vegan places this month' : 'new places this month'

  if (count === 0 || places.length === 0) return null

  return (
    <section className="mb-10">
      <h2 className="text-lg font-bold text-on-surface mb-4">{count.toLocaleString()} {label}</h2>
      <div className="flex gap-3 overflow-x-auto pb-2">
        {places.map((place) => (
          <Link key={place.id} href={`/place/${place.slug || place.id}`} prefetch={false}
            className="flex-shrink-0 w-48 bg-surface-container-lowest rounded-xl ghost-border hover:border-primary/20 overflow-hidden transition-all">
            {place.main_image_url && (
              <img src={place.main_image_url} alt={place.name} className="w-full h-24 object-cover" />
            )}
            <div className="p-2.5">
              <p className="text-xs font-medium text-on-surface truncate">{place.name}</p>
              <p className="text-[10px] text-on-surface-variant">{place.city}, {place.country}</p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}
