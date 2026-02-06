'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import type { Icon } from 'leaflet'

const MapContainer = dynamic(() => import('react-leaflet').then(mod => mod.MapContainer), { ssr: false })
const TileLayer = dynamic(() => import('react-leaflet').then(mod => mod.TileLayer), { ssr: false })
const Marker = dynamic(() => import('react-leaflet').then(mod => mod.Marker), { ssr: false })

interface PlaceMapProps {
  latitude: number
  longitude: number
  name: string
}

export default function PlaceMap({ latitude, longitude, name }: PlaceMapProps) {
  const [customIcon, setCustomIcon] = useState<Icon | null>(null)

  useEffect(() => {
    // Import leaflet config only on client side
    import('@/lib/leaflet-config').then((mod) => {
      setCustomIcon(mod.veganMarkerIcon)
    })
  }, [])

  return (
    <div className="h-64 rounded-lg overflow-hidden border border-gray-200 relative z-0">
      <MapContainer
        center={[latitude, longitude]}
        zoom={15}
        style={{ height: '100%', width: '100%', zIndex: 0 }}
        scrollWheelZoom={false}
        zoomControl={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {customIcon && <Marker position={[latitude, longitude]} icon={customIcon} />}
      </MapContainer>
    </div>
  )
}
