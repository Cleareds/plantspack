'use client'

// Leaflet CSS — scoped to the city-directory route via this component.
import 'leaflet/dist/leaflet.css'

import { useEffect, useRef, useState } from 'react'

interface CityMapProps {
  places: { id: string; name: string; slug?: string; latitude: number; longitude: number; category: string }[]
  className?: string
}

export default function CityMap({ places, className = '' }: CityMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const [mapInstance, setMapInstance] = useState<any>(null)

  useEffect(() => {
    if (!mapRef.current || places.length === 0 || mapInstance) return

    // Dynamic import of Leaflet
    import('leaflet').then((L) => {
      // Fix default icon issue
      delete (L.Icon.Default.prototype as any)._getIconUrl
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
      })

      // Calculate bounds
      const lats = places.map(p => p.latitude)
      const lngs = places.map(p => p.longitude)
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

      // Add markers
      for (const place of places) {
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
  }, [places])

  if (places.length === 0) return null

  return (
    <>
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css" />
      <div ref={mapRef} className={`rounded-xl overflow-hidden ${className}`} style={{ minHeight: '300px' }} />
    </>
  )
}
