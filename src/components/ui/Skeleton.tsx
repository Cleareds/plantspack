/**
 * Reusable skeleton loading components for shimmer effects.
 * Uses Tailwind animate-pulse with bg-surface-container-low.
 */

export function PostSkeleton() {
  return (
    <div className="bg-surface-container-lowest rounded-2xl editorial-shadow p-4 animate-pulse">
      {/* Header: avatar + name */}
      <div className="flex space-x-3 mb-3">
        <div className="h-10 w-10 bg-surface-container-low rounded-full flex-shrink-0" />
        <div className="flex-1">
          <div className="h-4 bg-surface-container-low rounded w-1/3 mb-2" />
          <div className="h-3 bg-surface-container-low rounded w-1/5" />
        </div>
      </div>
      {/* Text lines */}
      <div className="space-y-2 mb-3">
        <div className="h-4 bg-surface-container-low rounded w-full" />
        <div className="h-4 bg-surface-container-low rounded w-4/5" />
        <div className="h-4 bg-surface-container-low rounded w-2/3" />
      </div>
      {/* Image placeholder */}
      <div className="h-48 bg-surface-container-low rounded-xl mb-3" />
      {/* Action bar */}
      <div className="flex space-x-6">
        <div className="h-4 bg-surface-container-low rounded w-12" />
        <div className="h-4 bg-surface-container-low rounded w-12" />
        <div className="h-4 bg-surface-container-low rounded w-12" />
      </div>
    </div>
  )
}

export function RecipeSkeleton() {
  return (
    <div className="bg-surface-container-lowest rounded-2xl editorial-shadow ghost-border overflow-hidden animate-pulse">
      {/* Image placeholder */}
      <div className="aspect-[4/3] bg-surface-container-low" />
      {/* Content */}
      <div className="p-4">
        <div className="h-4 bg-surface-container-low rounded w-3/4 mb-2" />
        <div className="h-3 bg-surface-container-low rounded w-1/2 mb-3" />
        {/* Metadata */}
        <div className="flex items-center gap-3 mb-3">
          <div className="h-3 bg-surface-container-low rounded w-12" />
          <div className="h-3 bg-surface-container-low rounded w-10" />
          <div className="h-4 bg-surface-container-low rounded-full w-14" />
        </div>
        {/* Tags */}
        <div className="flex gap-1 mb-3">
          <div className="h-5 bg-surface-container-low rounded w-14" />
          <div className="h-5 bg-surface-container-low rounded w-16" />
        </div>
        {/* Author */}
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 bg-surface-container-low rounded-full" />
          <div className="h-3 bg-surface-container-low rounded w-20" />
        </div>
      </div>
    </div>
  )
}

export function PlaceSkeleton() {
  return (
    <div className="bg-surface-container-lowest rounded-xl p-4 ghost-border editorial-shadow animate-pulse">
      {/* Image */}
      <div className="w-full h-24 bg-surface-container-low rounded-lg mb-2" />
      {/* Name */}
      <div className="h-4 bg-surface-container-low rounded w-2/3 mb-2" />
      {/* Address */}
      <div className="h-3 bg-surface-container-low rounded w-4/5 mb-2" />
      {/* Category + rating */}
      <div className="flex items-center gap-2">
        <div className="h-5 bg-surface-container-low rounded-full w-16" />
        <div className="h-3 bg-surface-container-low rounded w-10" />
      </div>
    </div>
  )
}
