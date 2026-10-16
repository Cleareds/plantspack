'use client'

export type BadgeCode = 'early_contributor' | 'reviewer' | 'curator' | 'explorer' | 'local_hero'

interface BadgeConfig {
  emoji: string
  label: string
  tooltip: string
  bg: string
  fg: string
}

export const BADGE_CONFIG: Record<BadgeCode, BadgeConfig> = {
  early_contributor: {
    emoji: '🌱',
    label: 'Early',
    tooltip: 'Early Contributor — one of the first 100 people to contribute to PlantsPack.',
    bg: 'bg-emerald-100',
    fg: 'text-emerald-800',
  },
  reviewer: {
    emoji: '📝',
    label: 'Reviewer',
    tooltip: 'Reviewer — 5+ reviews published.',
    bg: 'bg-blue-100',
    fg: 'text-blue-800',
  },
  curator: {
    emoji: '🏛',
    label: 'Curator',
    tooltip: 'Curator — added 3+ places to the directory.',
    bg: 'bg-amber-100',
    fg: 'text-amber-900',
  },
  explorer: {
    emoji: '🌍',
    label: 'Explorer',
    tooltip: 'Explorer — shared vegan experiences from 3+ cities.',
    bg: 'bg-sky-100',
    fg: 'text-sky-800',
  },
  local_hero: {
    emoji: '🦸',
    label: 'Local hero',
    tooltip: 'Local Hero — top contributor in a city.',
    bg: 'bg-purple-100',
    fg: 'text-purple-800',
  },
}

interface BadgeChipProps {
  code: BadgeCode
  size?: 'xs' | 'sm' | 'md'
  iconOnly?: boolean
  className?: string
}

export default function BadgeChip({ code, size = 'sm', iconOnly = false, className = '' }: BadgeChipProps) {
  const cfg = BADGE_CONFIG[code]
  if (!cfg) return null

  const sizes = {
    xs: 'text-[10px] px-1.5 py-0.5 gap-0.5',
    sm: 'text-xs px-2 py-0.5 gap-1',
    md: 'text-sm px-2.5 py-1 gap-1.5',
  }

  return (
    <span
      title={cfg.tooltip}
      className={`inline-flex items-center rounded-full font-medium ${sizes[size]} ${cfg.bg} ${cfg.fg} ${className}`}
    >
      <span aria-hidden>{cfg.emoji}</span>
      {!iconOnly && <span>{cfg.label}</span>}
    </span>
  )
}
