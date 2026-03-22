'use client'

import { Heart } from 'lucide-react'

interface TierBadgeProps {
  tier: 'free' | 'medium' | 'premium'
  size?: 'sm' | 'md' | 'lg'
  showIcon?: boolean
  className?: string
}

const tierStyles: Record<string, string> = {
  medium: 'bg-secondary-container text-on-secondary',
  premium: 'silk-gradient text-on-primary',
}

export default function TierBadge({
  tier,
  size = 'sm',
  showIcon = true,
  className = ''
}: TierBadgeProps) {
  // Free users don't get a badge
  if (tier === 'free') return null

  const sizes = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-2 text-base'
  }

  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5'
  }

  return (
    <span
      className={`
        inline-flex items-center space-x-1 rounded-full font-medium
        ${sizes[size]}
        ${tierStyles[tier] || ''}
        ${className}
      `}
    >
      {showIcon && <Heart className={iconSizes[size]} />}
      <span className={"hidden sm:inline"}>{tier === 'premium' ? 'Supporter' : 'Supporter'}</span>
    </span>
  )
}
