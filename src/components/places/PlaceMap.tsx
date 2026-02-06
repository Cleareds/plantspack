'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import type { Icon } from 'leaflet'

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
}

export default function PlaceMap({ latitude, longitude, name, address }: PlaceMapProps) {
  const [customIcon, setCustomIcon] = useState<Icon | null>(null)

  useEffect(() => {
    // Import leaflet config only on client side
    import('@/lib/leaflet-config').then((mod) => {
      setCustomIcon(mod.veganMarkerIcon)
    })
  }, [])

  return (
    <Link
      href={`/map?location=${encodeURIComponent(address)}`}
      className="block h-64 rounded-lg overflow-hidden border border-gray-200 relative z-0 group cursor-pointer"
    >
      <MapContainer
        center={[latitude, longitude]}
        zoom={15}
        style={{ height: '100%', width: '100%', zIndex: 0 }}
        scrollWheelZoom={false}
        zoomControl={true}
        dragging={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {customIcon && <Marker position={[latitude, longitude]} icon={customIcon} />}
      </MapContainer>

      {/* Hover overlay */}
      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-all duration-200 flex items-center justify-center pointer-events-none z-10">
        <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
          <MapPin className="h-4 w-4 text-green-600" />
          <span className="text-sm font-medium text-gray-900">View on full map</span>
        </div>
      </div>
    </Link>
  )
}
