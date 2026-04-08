'use client'

import { useState } from 'react'
import { MapPin } from 'lucide-react'
import AddPlaceModal from './AddPlaceModal'

interface AddPlaceButtonProps {
  cityName: string
  countryName: string
  className?: string
  children?: React.ReactNode
}

export default function AddPlaceButton({ cityName, countryName, className, children }: AddPlaceButtonProps) {
  const [showModal, setShowModal] = useState(false)

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className={className}
      >
        {children || (
          <>
            <MapPin className="h-4 w-4" />
            Add a place in {cityName}
          </>
        )}
      </button>
      {showModal && (
        <AddPlaceModal
          onClose={() => setShowModal(false)}
          defaultCity={cityName}
          defaultCountry={countryName}
        />
      )}
    </>
  )
}
