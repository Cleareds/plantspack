'use client'

// Leaflet CSS here so routes that include this component (place/[id]) get the
// stylesheet via their own route chunk - not via the global app bundle.
import 'leaflet/dist/leaflet.css'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import type { Icon } from 'leaflet'
import { useInView } from '@/lib/hooks/use-in-view'

const MapContainer = dynamic(() => import('react-leaflet').then(mod => mod.MapContainer), { ssr: false })
const TileLayer = dynamic(() => import('react-leaflet').then(mod => mod.TileLayer), { ssr: false })
const Marker = dynamic(() => import('react-leaflet').then(mod => mod.Marker), { ssr: false })

import Link from 'next/link'
import { MapPin } from 'lucide-react'

interface PlaceMapProps {
  latitude: number
  longitude: number
  name: string
  address: string
  category?: string
  veganLevel?: string
  // Optional - when present, /map will center on this exact place and try
  // to auto-focus its marker instead of geocoding the address (which can
  // land near the user's current location).
  placeId?: string
  placeSlug?: string | null
}

export default function PlaceMap({ latitude, longitude, name, address, category, veganLevel, placeId, placeSlug }: PlaceMapProps) {
  const [customIcon, setCustomIcon] = useState<Icon | null>(null)
  // Defer mounting the live MapContainer (and the MapTiler tile fetches it
  // triggers) until the component is near the viewport. Bots and pre-render
  // crawlers never scroll, so they never trigger tile fetches - this keeps
  // free-tier quota for real users.
  const { ref, inView } = useInView<HTMLAnchorElement>({ rootMargin: '300px' })

  useEffect(() => {
    if (!inView) return
    import('@/lib/leaflet-config').then((mod) => {
      setCustomIcon(mod.getCategoryIcon(category || 'eat', veganLevel) as unknown as Icon)
    })
  }, [category, veganLevel, inView])

  const href = (() => {
    const params = new URLSearchParams()
    params.set('lat', latitude.toString())
    params.set('lng', longitude.toString())
    params.set('zoom', '17')
    if (placeId) params.set('place', placeId)
    else if (placeSlug) params.set('place', placeSlug)
    return `/map?${params.toString()}`
  })()

  return (
    <Link
      ref={ref}
      href={href}
      className="block h-64 rounded-lg overflow-hidden ghost-border relative z-0 group cursor-pointer"
    >
      {inView ? (
        <MapContainer
          center={[latitude, longitude]}
          zoom={15}
          style={{ height: '100%', width: '100%', zIndex: 0 }}
          scrollWheelZoom={false}
          zoomControl={true}
          dragging={false}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.maptiler.com/copyright/">MapTiler</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://api.maptiler.com/maps/streets-v2/{z}/{x}/{y}@2x.png?key=CBtMRLqBbJmyBLkXAk5p"
            tileSize={256}
          />
          {customIcon && <Marker position={[latitude, longitude]} icon={customIcon} />}
        </MapContainer>
      ) : (
        // Lightweight placeholder: no network, no JS, just a CSS gradient
        // and the same CTA. Becomes the live map when the user scrolls
        // close to it.
        <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-emerald-50 via-stone-50 to-emerald-50">
          <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-surface-container-lowest shadow-sm">
            <MapPin className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-on-surface">View on map</span>
          </div>
        </div>
      )}

      {/* Hover overlay (only meaningful once map is loaded) */}
      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-all duration-200 flex items-center justify-center pointer-events-none z-10">
        <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-surface-container-lowest px-4 py-2 rounded-lg shadow-ambient flex items-center gap-2">
          <MapPin className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium text-on-surface">View on full map</span>
        </div>
      </div>
    </Link>
  )
}
