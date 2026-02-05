'use client'

import { Star } from 'lucide-react'
import { useState } from 'react'

interface StarRatingProps {
  rating: number
  editable?: boolean
  onChange?: (rating: number) => void
  size?: 'sm' | 'md' | 'lg'
  showValue?: boolean
}

export default function StarRating({
  rating,
  editable = false,
  onChange,
  size = 'md',
  showValue = false
}: StarRatingProps) {
  const [hoverRating, setHoverRating] = useState(0)

  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6'
  }

  const handleClick = (value: number) => {
    if (editable && onChange) {
      onChange(value)
    }
  }

  const handleMouseEnter = (value: number) => {
    if (editable) {
      setHoverRating(value)
    }
  }

  const handleMouseLeave = () => {
    if (editable) {
      setHoverRating(0)
    }
  }

  const displayRating = hoverRating || rating

  return (
    <div className="flex items-center gap-1">
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((value) => {
          const isFilled = value <= Math.floor(displayRating)
          const isHalfFilled = value === Math.ceil(displayRating) && displayRating % 1 !== 0

          return (
            <button
              key={value}
              type="button"
              disabled={!editable}
              onClick={() => handleClick(value)}
              onMouseEnter={() => handleMouseEnter(value)}
              onMouseLeave={handleMouseLeave}
              className={`
                ${editable ? 'cursor-pointer hover:scale-110 transition-transform' : 'cursor-default'}
                ${!editable && 'pointer-events-none'}
              `}
              aria-label={`${value} star${value !== 1 ? 's' : ''}`}
            >
              {isHalfFilled ? (
                <div className="relative">
                  <Star className={`${sizeClasses[size]} text-gray-300`} />
                  <div className="absolute inset-0 overflow-hidden" style={{ width: '50%' }}>
                    <Star className={`${sizeClasses[size]} text-yellow-400 fill-yellow-400`} />
                  </div>
                </div>
              ) : (
                <Star
                  className={`
                    ${sizeClasses[size]}
                    ${isFilled ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}
                    ${editable && hoverRating >= value ? 'text-yellow-400 fill-yellow-400' : ''}
                  `}
                />
              )}
            </button>
          )
        })}
      </div>
      {showValue && (
        <span className="text-sm font-medium text-gray-700 ml-1">
          {displayRating.toFixed(1)}
        </span>
      )}
    </div>
  )
}
