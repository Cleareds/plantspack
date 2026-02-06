'use client'

import { Crown, Star, Leaf } from 'lucide-react'
import { getTierBadge } from '@/lib/stripe'

interface TierBadgeProps {
  tier: 'free' | 'medium' | 'premium'
  size?: 'sm' | 'md' | 'lg'
  showIcon?: boolean
  className?: string
}

export default function TierBadge({ 
  tier, 
  size = 'sm', 
  showIcon = true, 
  className = '' 
}: TierBadgeProps) {
  const badge = getTierBadge(tier)
  
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
  
  const getIcon = () => {
    switch (tier) {
      case 'free':
        return <Leaf className={iconSizes[size]} />
      case 'medium':
        return <Star className={iconSizes[size]} />
      case 'premium':
        return <Crown className={iconSizes[size]} />
      default:
        return null
    }
  }
  
  return (
    <span
      className={`
        inline-flex items-center space-x-1 rounded-full font-medium
        ${sizes[size]}
        ${className}
      `}
      style={{
        backgroundColor: badge.bgColor,
        color: badge.color
      }}
    >
      {showIcon && getIcon()}
      <span className={"hidden sm:inline"}>{badge.text}</span>
    </span>
  )
}