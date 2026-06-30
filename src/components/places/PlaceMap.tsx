'use client'

import { useInView } from '@/lib/hooks/use-in-view'
import Link from 'next/link'
import { MapPin } from 'lucide-react'

interface PlaceMapProps {
  latitude: number
  longitude: number
  name: string
  address: string
  category?: string
  veganLevel?: string
  // When present, /map centers on this exact place and auto-focuses its marker.
  placeId?: string
  placeSlug?: string | null
}

const MAPTILER_KEY = process.env.NEXT_PUBLIC_MAPTILER_KEY || '1p2MO19pmpo5G5xadgDF'

// This preview is non-interactive (it links to the full /map). A STATIC MapTiler
// image is ONE request, vs ~5-9 raster tiles for an interactive Leaflet map -
// and it's still only fetched when scrolled near the viewport (bots/crawlers and
// users who never reach it cost nothing). Big MapTiler free-tier saving.
export default function PlaceMap({ latitude, longitude, name, placeId, placeSlug }: PlaceMapProps) {
  const { ref, inView } = useInView<HTMLAnchorElement>({ rootMargin: '300px' })

  const href = (() => {
    const params = new URLSearchParams()
    params.set('lat', latitude.toString())
    params.set('lng', longitude.toString())
    params.set('zoom', '17')
    if (placeId) params.set('place', placeId)
    else if (placeSlug) params.set('place', placeSlug)
    return `/map?${params.toString()}`
  })()

  const staticSrc =
    `https://api.maptiler.com/maps/streets-v2/static/${longitude},${latitude},15/640x280@2x.png` +
    `?key=${MAPTILER_KEY}&markers=${longitude},${latitude}`

  return (
    <Link
      ref={ref}
      href={href}
      className="block h-64 rounded-lg overflow-hidden ghost-border relative z-0 group cursor-pointer"
    >
      {inView ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={staticSrc}
          alt={`Map showing the location of ${name}`}
          className="h-full w-full object-cover"
          loading="lazy"
          referrerPolicy="no-referrer"
        />
      ) : (
        // Lightweight placeholder: no network, becomes the static map when scrolled near.
        <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-emerald-50 via-stone-50 to-emerald-50">
          <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-surface-container-lowest shadow-sm">
            <MapPin className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-on-surface">View on map</span>
          </div>
        </div>
      )}

      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-all duration-200 flex items-center justify-center pointer-events-none z-10">
        <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-surface-container-lowest px-4 py-2 rounded-lg shadow-ambient flex items-center gap-2">
          <MapPin className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium text-on-surface">View on full map</span>
        </div>
      </div>
    </Link>
  )
}
