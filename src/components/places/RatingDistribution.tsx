'use client'

import { Star } from 'lucide-react'

interface RatingDistributionProps {
  distribution: {
    '5': number
    '4': number
    '3': number
    '2': number
    '1': number
    total: number
  }
}

export default function RatingDistribution({ distribution }: RatingDistributionProps) {
  const total = distribution.total || 0

  const getPercentage = (count: number) => {
    if (total === 0) return 0
    return Math.round((count / total) * 100)
  }

  const ratings = [5, 4, 3, 2, 1] as const

  return (
    <div className="space-y-2">
      <div className="text-sm font-medium text-gray-700 mb-3">
        Rating Distribution ({total} {total === 1 ? 'review' : 'reviews'})
      </div>

      {ratings.map((rating) => {
        const count = distribution[rating.toString() as keyof typeof distribution] as number
        const percentage = getPercentage(count)

        return (
          <div key={rating} className="flex items-center gap-2">
            <div className="flex items-center gap-1 w-12">
              <span className="text-sm font-medium text-gray-700">{rating}</span>
              <Star className="h-3 w-3 text-yellow-400 fill-yellow-400" />
            </div>

            <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-yellow-400 rounded-full transition-all duration-300"
                style={{ width: `${percentage}%` }}
              />
            </div>

            <div className="text-sm text-gray-600 w-12 text-right">
              {count} ({percentage}%)
            </div>
          </div>
        )
      })}
    </div>
  )
}
