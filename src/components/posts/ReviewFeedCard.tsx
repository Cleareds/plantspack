'use client'

import Link from 'next/link'
import { Star } from 'lucide-react'
import ReviewReactions from '@/components/reactions/ReviewReactions'
import PlaceImage from '@/components/places/PlaceImage'

interface ReviewFeedCardData {
  id: string
  user_id: string
  place_id: string
  rating: number
  content: string
  images: string[] | null
  created_at: string
  edited_at: string | null
  users: {
    id: string
    username: string
    first_name: string | null
    last_name: string | null
    avatar_url: string | null
  } | { id: string; username: string; first_name: string | null; last_name: string | null; avatar_url: string | null }[]
  place: {
    id: string
    name: string
    slug: string | null
    city: string | null
    country: string | null
    category: string | null
    main_image_url: string | null
    images: string[] | null
    vegan_level: string | null
    average_rating: number | null
    review_count: number | null
  } | null
}

function timeAgo(d: string) {
  const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  if (m < 1440) return `${Math.floor(m / 60)}h ago`
  if (m < 43200) return `${Math.floor(m / 1440)}d ago`
  return `${Math.floor(m / 43200)}mo ago`
}

function StarRow({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5" aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map(i => (
        <Star
          key={i}
          className={`h-4 w-4 ${i <= rating ? 'fill-amber-400 text-amber-400' : 'text-outline-variant'}`}
        />
      ))}
    </div>
  )
}

interface Props {
  review: ReviewFeedCardData
}

export default function ReviewFeedCard({ review }: Props) {
  const u: any = Array.isArray(review.users) ? review.users[0] : review.users
  const place = review.place
  const placeHref = place?.slug ? `/place/${place.slug}` : place ? `/place/${place.id}` : '#'
  const reviewAnchor = `${placeHref}#review-${review.id}`
  const userHref = u?.username ? `/user/${u.username}` : '#'
  const placeImage = place?.main_image_url || place?.images?.[0] || null
  const displayName = u?.first_name || u?.username || 'Anonymous'

  const content = review.content || ''
  const TRUNCATE_AT = 320
  const truncated = content.length > TRUNCATE_AT
  const visibleContent = truncated ? content.slice(0, TRUNCATE_AT).trimEnd() + '…' : content

  return (
    <article className="bg-surface-container-lowest rounded-2xl ghost-border p-4 transition-colors">
      {/* Header: avatar, name, "reviewed", place link, timestamp + Review pill */}
      <header className="flex items-start gap-3 mb-3">
        <Link href={userHref} className="flex-shrink-0">
          {u?.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={u.avatar_url} alt={displayName} className="w-10 h-10 rounded-full object-cover" />
          ) : (
            <div className="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center text-sm font-bold text-primary">
              {displayName.charAt(0).toUpperCase()}
            </div>
          )}
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Link href={userHref} className="font-medium text-sm text-on-surface hover:text-primary truncate">
              {displayName}
            </Link>
            <span className="text-xs text-on-surface-variant">reviewed</span>
            {place && (
              <Link href={placeHref} className="text-sm font-medium text-primary hover:underline truncate max-w-[200px]">
                {place.name}
              </Link>
            )}
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700 text-[10px] font-semibold border border-amber-100">
              <Star className="h-2.5 w-2.5 fill-amber-500 text-amber-500" /> Review
            </span>
          </div>
          <div className="flex items-center gap-2 mt-1 text-[11px] text-on-surface-variant">
            <StarRow rating={review.rating} />
            <span>·</span>
            <span>{timeAgo(review.created_at)}</span>
            {review.edited_at && <span className="italic">edited</span>}
            {place?.city && (
              <>
                <span>·</span>
                <span className="truncate">{place.city}{place.country ? `, ${place.country}` : ''}</span>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Body */}
      {visibleContent && (
        <Link href={reviewAnchor} className="block group">
          <p className="text-sm text-on-surface leading-relaxed whitespace-pre-wrap mb-3">
            {visibleContent}
            {truncated && <span className="text-primary font-medium ml-1 group-hover:underline">Read more</span>}
          </p>
        </Link>
      )}

      {/* Review images */}
      {review.images && review.images.length > 0 && (
        <div className={`grid gap-2 mb-3 ${review.images.length === 1 ? 'grid-cols-1' : 'grid-cols-2 sm:grid-cols-3'}`}>
          {review.images.slice(0, 3).map((src, i) => (
            <Link key={i} href={reviewAnchor} className="block">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={src}
                alt=""
                className="w-full h-32 object-cover rounded-lg"
                loading="lazy"
              />
            </Link>
          ))}
        </div>
      )}

      {/* Place context bar */}
      {place && (
        <Link
          href={placeHref}
          className="flex items-center gap-3 p-2.5 mb-3 bg-surface-container-low rounded-xl hover:bg-surface-container transition-colors"
        >
          <PlaceImage
            src={placeImage}
            alt={place.name}
            category={place.category as any}
            className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
          />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-on-surface truncate">{place.name}</p>
            <p className="text-[11px] text-on-surface-variant truncate">
              {place.vegan_level === 'fully_vegan' ? '100% Vegan' : 'Vegan-Friendly'}
              {place.average_rating ? ` · ★ ${Number(place.average_rating).toFixed(1)}` : ''}
              {place.review_count ? ` (${place.review_count})` : ''}
            </p>
          </div>
        </Link>
      )}

      {/* Reactions */}
      <ReviewReactions reviewId={review.id} />
    </article>
  )
}
