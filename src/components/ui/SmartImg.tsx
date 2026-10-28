'use client'

import { useState } from 'react'
import { variantSrcSet } from '@/lib/image-variants'

interface SmartImgProps {
  src: string
  alt: string
  width?: number
  height?: number
  className?: string
  style?: React.CSSProperties
  /** LCP image: eager + fetchpriority=high. */
  priority?: boolean
  /** Rendered width, so the browser picks the smallest variant from srcSet. */
  sizes?: string
  /** Absolutely fill the (relative) parent, like next/image `fill`. */
  fill?: boolean
  /** Called once the original also failed to load. */
  onError?: (e: React.SyntheticEvent<HTMLImageElement>) => void
}

// Plain <img>, never next/image: Vercel image optimisation is off (it billed
// per transformation). Our own Storage images get a srcSet of pre-made WebP
// variants; if a variant is missing the browser falls back to the original.
export default function SmartImg({ src, alt, width, height, className, style, priority, sizes, fill, onError }: SmartImgProps) {
  const [variantsFailed, setVariantsFailed] = useState(false)
  const srcSet = variantsFailed ? null : variantSrcSet(src)
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      srcSet={srcSet ?? undefined}
      sizes={srcSet ? (sizes ?? (width ? `${width}px` : undefined)) : undefined}
      alt={alt}
      width={width}
      height={height}
      className={fill ? `absolute inset-0 w-full h-full ${className || ''}` : className}
      style={style}
      loading={priority ? 'eager' : 'lazy'}
      fetchPriority={priority ? 'high' : undefined}
      decoding="async"
      onError={(e) => (srcSet ? setVariantsFailed(true) : onError?.(e))}
    />
  )
}
