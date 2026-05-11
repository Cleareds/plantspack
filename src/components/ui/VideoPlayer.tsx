'use client'

import { useState } from 'react'

interface VideoPlayerProps {
  src: string
  className?: string
  variant?: 'feed' | 'review'
}

// Shared video player for feed posts and place reviews.
// - playsInline keeps iOS Safari inline instead of forcing fullscreen
// - #t=0.1 forces the browser to render the first frame as a poster
// - aspect-video locks ratio so portrait videos don't break the card
// - onError hides the block instead of showing a broken element
export default function VideoPlayer({ src, className = '', variant = 'feed' }: VideoPlayerProps) {
  const [errored, setErrored] = useState(false)
  if (errored || !src) return null

  // Append the first-frame hint, but only if it doesn't already have a fragment.
  const posterSrc = src.includes('#') ? src : `${src}#t=0.1`

  const wrapperClass =
    variant === 'review'
      ? 'relative bg-surface-container-low rounded-md border border-outline-variant overflow-hidden aspect-video max-w-md'
      : 'relative bg-surface-container-low rounded-lg overflow-hidden aspect-video'

  return (
    <div className={`${wrapperClass} ${className}`}>
      <video
        src={posterSrc}
        className="w-full h-full object-contain bg-black"
        controls
        playsInline
        preload="metadata"
        onError={() => setErrored(true)}
      >
        Your browser does not support the video tag.
      </video>
    </div>
  )
}
