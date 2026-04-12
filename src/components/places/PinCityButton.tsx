'use client'

import { useState, useEffect } from 'react'
import { MapPinned, Check } from 'lucide-react'

interface PinCityButtonProps {
  cityName: string
  countryName: string
  className?: string
}

export default function PinCityButton({ cityName, countryName, className = '' }: PinCityButtonProps) {
  const [isPinned, setIsPinned] = useState(false)

  useEffect(() => {
    const pinned = localStorage.getItem('pinned_city')
    setIsPinned(pinned === `${cityName}|||${countryName}`)
  }, [cityName, countryName])

  const handlePin = () => {
    if (isPinned) {
      // Unpin — revert to geolocation
      localStorage.removeItem('pinned_city')
      localStorage.removeItem('pinned_city_name')
      localStorage.removeItem('pinned_country_name')
      localStorage.removeItem('plantspack_home_cache') // clear home cache to force refresh
      setIsPinned(false)
    } else {
      // Pin this city
      localStorage.setItem('pinned_city', `${cityName}|||${countryName}`)
      localStorage.setItem('pinned_city_name', cityName)
      localStorage.setItem('pinned_country_name', countryName)
      localStorage.removeItem('plantspack_home_cache') // clear home cache
      setIsPinned(true)
    }
  }

  return (
    <button onClick={handlePin} className={`inline-flex items-center gap-2 text-sm font-medium transition-colors ${
      isPinned
        ? 'text-primary bg-primary/10 px-4 py-2 rounded-lg'
        : 'text-on-surface-variant ghost-border px-4 py-2 rounded-lg hover:bg-surface-container-low'
    } ${className}`}>
      {isPinned ? <Check className="h-4 w-4" /> : <MapPinned className="h-4 w-4" />}
      {isPinned ? 'Pinned to homepage' : 'Pin to homepage'}
    </button>
  )
}
