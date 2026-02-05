'use client'

import { Leaf, Salad, Heart, Sparkles } from 'lucide-react'

interface PlaceTagBadgesProps {
  tags: string[]
  size?: 'sm' | 'md'
}

const tagConfig: Record<string, { label: string; icon: any; color: string }> = {
  vegan: {
    label: 'Vegan',
    icon: Leaf,
    color: 'bg-green-100 text-green-700 border-green-200'
  },
  vegetarian: {
    label: 'Vegetarian',
    icon: Salad,
    color: 'bg-emerald-100 text-emerald-700 border-emerald-200'
  },
  'gluten-free': {
    label: 'Gluten-Free',
    icon: Sparkles,
    color: 'bg-amber-100 text-amber-700 border-amber-200'
  },
  organic: {
    label: 'Organic',
    icon: Heart,
    color: 'bg-lime-100 text-lime-700 border-lime-200'
  },
  'pet-friendly': {
    label: 'Pet Friendly',
    icon: Heart,
    color: 'bg-blue-100 text-blue-700 border-blue-200'
  },
  'allergen-friendly': {
    label: 'Allergen Friendly',
    icon: Sparkles,
    color: 'bg-purple-100 text-purple-700 border-purple-200'
  },
  sustainable: {
    label: 'Sustainable',
    icon: Leaf,
    color: 'bg-teal-100 text-teal-700 border-teal-200'
  },
  'locally-sourced': {
    label: 'Locally Sourced',
    icon: Heart,
    color: 'bg-orange-100 text-orange-700 border-orange-200'
  }
}

export default function PlaceTagBadges({ tags, size = 'md' }: PlaceTagBadgesProps) {
  if (!tags || tags.length === 0) {
    return null
  }

  const sizeClasses = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-3 py-1.5'
  }

  const iconSizeClasses = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4'
  }

  return (
    <div className="flex flex-wrap gap-2">
      {tags.map((tag) => {
        const config = tagConfig[tag] || {
          label: tag.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
          icon: Sparkles,
          color: 'bg-gray-100 text-gray-700 border-gray-200'
        }
        const Icon = config.icon

        return (
          <span
            key={tag}
            className={`
              inline-flex items-center gap-1.5 rounded-full border font-medium
              ${config.color}
              ${sizeClasses[size]}
            `}
          >
            <Icon className={iconSizeClasses[size]} />
            {config.label}
          </span>
        )
      })}
    </div>
  )
}
