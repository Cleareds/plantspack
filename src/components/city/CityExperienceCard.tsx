'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Lightbulb, MapPin, Calendar, Pencil, Trash2 } from 'lucide-react'
import StarRating from '@/components/places/StarRating'
import TierBadge from '@/components/ui/TierBadge'
import ProfileBadges from '@/components/profile/ProfileBadges'

export interface CityExperience {
  id: string
  user_id: string
  overall_rating: number
  eating_out_rating: number | null
  grocery_rating: number | null
  summary: string
  tips: string[]
  best_neighborhoods: string | null
  visited_period: string | null
  edited_at: string | null
  created_at: string
  users: {
    id: string
    username: string
    first_name: string | null
    last_name: string | null
    avatar_url: string | null
    subscription_tier?: 'free' | 'medium' | 'premium' | null
  } | null
}

interface CityExperienceCardProps {
  experience: CityExperience
  /** If viewer is the author, show Edit + Delete controls */
  isAuthor?: boolean
  onEdit?: () => void
  onDelete?: () => void
}

export default function CityExperienceCard({ experience, isAuthor, onEdit, onDelete }: CityExperienceCardProps) {
  const u = experience.users
  const displayName = u?.first_name
    ? `${u.first_name} ${u.last_name || ''}`.trim()
    : `@${u?.username || 'unknown'}`

  return (
    <article className="bg-white rounded-lg ghost-border p-4 sm:p-5 space-y-4">
      {/* Author row */}
      <div className="flex items-start gap-3">
        <Link href={u ? `/user/${u.username}` : '#'} className="flex-shrink-0">
          {u?.avatar_url ? (
            <Image src={u.avatar_url} alt={displayName} width={44} height={44} className="w-11 h-11 rounded-full object-cover" />
          ) : (
            <div className="w-11 h-11 rounded-full bg-primary-container flex items-center justify-center text-on-primary-container font-semibold">
              {(u?.first_name?.[0] || u?.username?.[0] || '?').toUpperCase()}
            </div>
          )}
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <Link href={u ? `/user/${u.username}` : '#'} className="font-semibold text-on-surface text-sm hover:text-primary truncate">
              {displayName}
            </Link>
            {u?.subscription_tier && u.subscription_tier !== 'free' && (
              <TierBadge tier={u.subscription_tier as 'medium' | 'premium'} size="sm" />
            )}
            {u?.id && <ProfileBadges userId={u.id} size="xs" />}
          </div>
          <div className="text-xs text-on-surface-variant mt-0.5 flex items-center gap-3 flex-wrap">
            {experience.visited_period && (
              <span className="inline-flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {experience.visited_period}
              </span>
            )}
            <span>{new Date(experience.created_at).toLocaleDateString()}{experience.edited_at ? ' · edited' : ''}</span>
          </div>
        </div>
        {isAuthor && (
          <div className="flex items-center gap-1">
            {onEdit && (
              <button onClick={onEdit} className="p-1.5 text-on-surface-variant hover:text-primary rounded" aria-label="Edit experience">
                <Pencil className="w-4 h-4" />
              </button>
            )}
            {onDelete && (
              <button onClick={onDelete} className="p-1.5 text-on-surface-variant hover:text-red-600 rounded" aria-label="Delete experience">
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Ratings */}
      <div className="flex flex-wrap items-center gap-4 text-sm">
        <div className="flex items-center gap-1.5">
          <span className="text-on-surface-variant">Overall:</span>
          <StarRating rating={experience.overall_rating} size="sm" showValue />
        </div>
        {experience.eating_out_rating != null && (
          <div className="flex items-center gap-1.5">
            <span className="text-on-surface-variant">Eating out:</span>
            <StarRating rating={experience.eating_out_rating} size="sm" showValue />
          </div>
        )}
        {experience.grocery_rating != null && (
          <div className="flex items-center gap-1.5">
            <span className="text-on-surface-variant">Groceries:</span>
            <StarRating rating={experience.grocery_rating} size="sm" showValue />
          </div>
        )}
      </div>

      {/* Summary */}
      <p className="text-sm text-on-surface whitespace-pre-wrap leading-relaxed">{experience.summary}</p>

      {/* Tips */}
      {experience.tips?.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-on-surface-variant uppercase tracking-wide">Tips for fellow vegans</p>
          <ul className="space-y-1">
            {experience.tips.map((t, i) => (
              <li key={i} className="flex items-start gap-2 bg-emerald-50 text-emerald-900 rounded-md px-3 py-2 text-sm">
                <Lightbulb className="w-4 h-4 mt-0.5 flex-shrink-0 text-emerald-600" />
                <span>{t}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Neighborhoods */}
      {experience.best_neighborhoods && (
        <div className="flex items-start gap-2 text-sm text-on-surface-variant">
          <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0 text-primary" />
          <span><span className="font-medium text-on-surface">Best areas:</span> {experience.best_neighborhoods}</span>
        </div>
      )}
    </article>
  )
}
