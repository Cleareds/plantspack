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
    color: 'bg-tertiary-container text-white border-tertiary-container'
  },
  vegetarian: {
    label: 'Vegetarian',
    icon: Salad,
    color: 'bg-tertiary-container text-white border-tertiary-container'
  },
  'gluten-free': {
    label: 'Gluten-Free',
    icon: Sparkles,
    color: 'bg-tertiary-container text-white border-tertiary-container'
  },
  organic: {
    label: 'Organic',
    icon: Heart,
    color: 'bg-tertiary-container text-white border-tertiary-container'
  },
  'pet-friendly': {
    label: 'Pet Friendly',
    icon: Heart,
    color: 'bg-tertiary-container text-white border-tertiary-container'
  },
  'allergen-friendly': {
    label: 'Allergen Friendly',
    icon: Sparkles,
    color: 'bg-tertiary-container text-white border-tertiary-container'
  },
  sustainable: {
    label: 'Sustainable',
    icon: Leaf,
    color: 'bg-tertiary-container text-white border-tertiary-container'
  },
  'locally-sourced': {
    label: 'Locally Sourced',
    icon: Heart,
    color: 'bg-tertiary-container text-white border-tertiary-container'
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

  // Only show tags that have explicit config — hide system/internal tags
  const visibleTags = tags.filter(tag => tag in tagConfig)

  if (visibleTags.length === 0) {
    return null
  }

  return (
    <div className="flex flex-wrap gap-2">
      {visibleTags.map((tag) => {
        const config = tagConfig[tag]
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
