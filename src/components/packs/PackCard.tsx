'use client'

import { PackWithStats } from '@/types/packs'
import Link from 'next/link'
import Image from 'next/image'
import { Users, FileText, Crown } from 'lucide-react'

interface PackCardProps {
  pack: PackWithStats
}

export default function PackCard({ pack }: PackCardProps) {
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'recipes': return '🍽️'
      case 'places': return '📍'
      case 'products': return '🛍️'
      case 'resources': return '📚'
      case 'lifestyle': return '🌱'
      case 'other': return '📦'
      default: return '📦'
    }
  }

  const getCategoryLabel = (category: string) => {
    return category.charAt(0).toUpperCase() + category.slice(1)
  }

  const packCategories: string[] = (pack as any).categories?.length > 0
    ? (pack as any).categories
    : (pack.category ? [pack.category] : [])

  return (
    <Link href={`/packs/${pack.id}`}>
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow overflow-hidden group">
        {/* Banner Image */}
        <div className="relative w-full h-40 bg-gradient-to-br from-green-100 to-green-200">
          {pack.banner_url ? (
            <Image
              src={pack.banner_url}
              alt={pack.title}
              fill
              className="object-cover"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-6xl">
              {packCategories.length > 0 ? getCategoryIcon(packCategories[0]) : '📦'}
            </div>
          )}
          {/* Category Badges */}
          {packCategories.length > 0 && (
            <div className="absolute top-2 left-2 flex flex-wrap gap-1">
              {packCategories.map((cat) => (
                <div key={cat} className="bg-white px-2 py-1 rounded-full text-xs font-medium text-gray-700">
                  {getCategoryIcon(cat)} {getCategoryLabel(cat)}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-4">
          {/* Title */}
          <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2 group-hover:text-green-600 transition-colors">
            {pack.title}
          </h3>

          {/* Description */}
          {pack.description && (
            <p className="text-sm text-gray-600 line-clamp-2 mb-3">
              {pack.description}
            </p>
          )}

          {/* Creator */}
          <div className="flex items-center gap-2 mb-3 text-sm text-gray-600">
            <div className="flex items-center gap-1">
              <span>by</span>
              <span className="font-medium text-gray-900">
                @{pack.users.username}
              </span>
              {pack.users.subscription_tier === 'premium' && (
                <Crown className="h-3 w-3 text-yellow-500" />
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <div className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              <span>{pack.member_count}</span>
            </div>
            <div className="flex items-center gap-1">
              <FileText className="h-4 w-4" />
              <span>{pack.post_count} posts</span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  )
}
