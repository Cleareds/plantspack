'use client'

import Image from 'next/image'

interface SmartImgProps {
  src: string
  alt: string
  width: number
  height: number
  className?: string
  priority?: boolean
  sizes?: string
  unoptimizedHosts?: string[]
}

// Allowlisted hosts mirror next.config.ts -> images.remotePatterns. If the URL
// is on one of these, render with next/image so Vercel produces resized +
// AVIF/WebP variants. Otherwise fall back to a raw <img> so we don't trigger
// the Next/Image error for missing remotePatterns (and don't pay to optimize
// a one-off CDN we don't control).
const ALLOWLISTED_HOSTS = [
  /\.supabase\.co$/,
  /^(.+\.)?googleusercontent\.com$/,
  /^(.+\.)?wikimedia\.org$/,
  /\.wp\.com$/,
  /\.cloudfront\.net$/,
  /\.wixstatic\.com$/,
  /\.squarespace-cdn\.com$/,
  /\.shopifycdn\.com$/,
  /\.unsplash\.com$/,
]

function isOptimizable(src: string): boolean {
  try {
    const u = new URL(src)
    return ALLOWLISTED_HOSTS.some((re) => re.test(u.hostname))
  } catch {
    return false
  }
}

// Use only on the homepage. We don't want a global rollout of next/image
// because (a) Vercel image-optimization billing tracks source images, and
// (b) below-the-fold place page images are already lazy + small in practice.
export default function SmartImg({
  src,
  alt,
  width,
  height,
  className,
  priority,
  sizes,
}: SmartImgProps) {
  if (isOptimizable(src)) {
    return (
      <Image
        src={src}
        alt={alt}
        width={width}
        height={height}
        className={className}
        priority={priority}
        sizes={sizes}
        loading={priority ? 'eager' : 'lazy'}
      />
    )
  }
  // Raw fallback for external CDNs that aren't in remotePatterns.
  // eslint-disable-next-line @next/next/no-img-element
  return (
    <img
      src={src}
      alt={alt}
      width={width}
      height={height}
      className={className}
      loading={priority ? 'eager' : 'lazy'}
      decoding="async"
    />
  )
}
