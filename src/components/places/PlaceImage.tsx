'use client'

import { useState } from 'react'
import { variantSrcSet } from '@/lib/image-variants'

/**
 * Resilient <img> wrapper for place thumbnails.
 *
 * Broken image URLs (dead CDN links, deleted blog images, expired CDN tokens)
 * are common on a 37K-place dataset — roughly half come from scraped sources
 * whose CDN policies are out of our control. When they 404, browsers show
 * the generic broken-image icon which hurts CTR and signals low quality to
 * Google.
 *
 * This component:
 *   - Renders a normal <img> when src is present.
 *   - On load error, swaps to a category-appropriate emoji placeholder in a
 *     muted background tile — consistent with the rest of the UI.
 *   - Renders the placeholder up-front if no src was given.
 *
 * Use this everywhere we currently hand-roll `{src ? <img/> : null}`.
 */

interface Props {
  src?: string | null
  alt: string
  category?: string | null
  className?: string
  /** Pass loading="eager" for above-the-fold images. Defaults to lazy. */
  loading?: 'lazy' | 'eager'
  /** Optional inline style */
  style?: React.CSSProperties
  /**
   * Rendered width (e.g. '(min-width: 768px) 128px, 96px'). Our own Storage
   * images then load a pre-made small WebP variant instead of the 1200 px
   * original (hub cards were 250-330 KB per 96 px thumbnail).
   */
  sizes?: string
}

const CATEGORY_EMOJI: Record<string, string> = {
  eat: '🌿',
  hotel: '🛏️',
  store: '🛍️',
  organisation: '🐾',
  event: '🎉',
}

function Placeholder({ category, className }: { category?: string | null; className?: string }) {
  const emoji = (category && CATEGORY_EMOJI[category]) || '📍'
  return (
    <div
      className={`flex items-center justify-center bg-surface-container-low text-3xl ${className || ''}`}
      aria-hidden="true"
    >
      {emoji}
    </div>
  )
}

// Extra defense: reject obviously-invalid src values up-front so we don't
// even issue a bad request. The DB occasionally contains JSON-escaped
// URLs (`https:\/\/...`), relative paths (`./foo`, `/foo`), data: URIs,
// or HTML entity-encoded URLs — none of which render but all of which
// trigger a broken-image icon flash before the onError handler fires.
function isBrowserUsableUrl(src: string): boolean {
  if (!src) return false
  // Only absolute http(s), no whitespace, no backslash (JSON-escape leftover).
  return /^https?:\/\/[^\s<>"'\\]+$/i.test(src)
}

export default function PlaceImage({ src, alt, category, className, loading = 'lazy', style, sizes }: Props) {
  const [failed, setFailed] = useState(false)
  const [variantsFailed, setVariantsFailed] = useState(false)
  if (!src || failed || !isBrowserUsableUrl(src)) {
    return <Placeholder category={category} className={className} />
  }
  const srcSet = sizes && !variantsFailed ? variantSrcSet(src) : null
  return (
    <img
      src={src}
      srcSet={srcSet ?? undefined}
      sizes={srcSet ? sizes : undefined}
      alt={alt}
      className={className}
      loading={loading}
      decoding="async"
      style={style}
      onError={() => (srcSet ? setVariantsFailed(true) : setFailed(true))}
    />
  )
}
