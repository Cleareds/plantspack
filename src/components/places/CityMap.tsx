'use client'

// Leaflet CSS — scoped to the city-directory route via this component.
// Webpack chunks this so non-map routes don't ship it; do NOT also load
// the same stylesheet from a CDN at runtime — that turns it into a
// render-blocking critical-path resource and was the #1 cause of the
// city page's 5.6s LCP before this fix.
import 'leaflet/dist/leaflet.css'

import { useEffect, useRef, useState } from 'react'

interface CityMapProps {
  places: { id: string; name: string; slug?: string; latitude: number; longitude: number; category: string }[]
  className?: string
}

// Cap the number of markers rendered on the city-page sidebar map.
// Berlin pushes ~1,300 places; creating that many markers synchronously
// freezes the main thread for hundreds of ms. Real clustering belongs
// in a follow-up — for now, render the first MAX_MARKERS and offer a
// "view all on full map" link.
const MAX_MARKERS = 200

export default function CityMap({ places, className = '' }: CityMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const [mapInstance, setMapInstance] = useState<any>(null)
  const limitedPlaces = places.length > MAX_MARKERS ? places.slice(0, MAX_MARKERS) : places
  const truncated = places.length > MAX_MARKERS

  useEffect(() => {
    if (!mapRef.current || limitedPlaces.length === 0 || mapInstance) return

    // Dynamic import of Leaflet
    import('leaflet').then((L) => {
      // Skip the default-icon bootstrap entirely — every marker below is
      // a custom divIcon (inline SVG), so we never resolve Leaflet's
      // default marker URLs. Avoids three render-blocking PNG requests
      // to cdnjs.cloudflare.com that the previous code wired up.

      // Calculate bounds from the (possibly truncated) marker set
      const lats = limitedPlaces.map(p => p.latitude)
      const lngs = limitedPlaces.map(p => p.longitude)
      const bounds = L.latLngBounds(
        [Math.min(...lats) - 0.01, Math.min(...lngs) - 0.01],
        [Math.max(...lats) + 0.01, Math.max(...lngs) + 0.01]
      )

      const map = L.map(mapRef.current!, {
        scrollWheelZoom: false,
        zoomControl: true,
      }).fitBounds(bounds, { padding: [30, 30] })

      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://openstreetmap.org">OSM</a>',
        maxZoom: 18,
        referrerPolicy: 'origin',
      }).addTo(map)

      // Custom green marker
      const veganIcon = L.divIcon({
        html: '<div style="background:#16a34a;width:12px;height:12px;border-radius:50%;border:2px solid white;box-shadow:0 1px 3px rgba(0,0,0,0.3)"></div>',
        iconSize: [12, 12],
        iconAnchor: [6, 6],
        className: '',
      })

      // Add markers (capped at MAX_MARKERS)
      for (const place of limitedPlaces) {
        L.marker([place.latitude, place.longitude], { icon: veganIcon })
          .addTo(map)
          .bindPopup(`<a href="/place/${place.slug || place.id}" style="font-weight:600;text-decoration:none;color:#16a34a">${place.name}</a>`)
      }

      setMapInstance(map)
    })

    return () => {
      if (mapInstance) {
        mapInstance.remove()
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [limitedPlaces.length])

  if (places.length === 0) return null

  return (
    <div className={`relative ${className}`}>
      <div ref={mapRef} className="rounded-xl overflow-hidden h-full w-full" style={{ minHeight: '300px' }} />
      {truncated && (
        <div className="absolute bottom-2 left-2 right-2 text-[11px] text-on-surface-variant bg-surface-container-lowest/95 backdrop-blur px-2 py-1 rounded-md text-center pointer-events-none">
          Showing {MAX_MARKERS} of {places.length} places. View all on the <a href="/map" className="text-primary underline pointer-events-auto">full map</a>.
        </div>
      )}
    </div>
  )
}
