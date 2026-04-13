'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'

interface ImageSliderProps {
  images: string[]
  className?: string
  aspectRatio?: 'square' | 'wide' | 'auto'
}

export default function ImageSlider({
  images,
  className = '',
  aspectRatio = 'auto'
}: ImageSliderProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isLoaded, setIsLoaded] = useState<boolean[]>(new Array(images.length).fill(false))
  const [hasError, setHasError] = useState<boolean[]>(new Array(images.length).fill(false))
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const sliderRef = useRef<HTMLDivElement>(null)

  if (!images || images.length === 0) return null

  const goToPrevious = () => {
    setCurrentIndex(prev => prev === 0 ? images.length - 1 : prev - 1)
  }

  const goToNext = () => {
    setCurrentIndex(prev => prev === images.length - 1 ? 0 : prev + 1)
  }

  const goToSlide = (index: number) => {
    setCurrentIndex(index)
  }

  const handleImageLoad = (index: number) => {
    setIsLoaded(prev => {
      const newLoaded = [...prev]
      newLoaded[index] = true
      return newLoaded
    })
  }

  const handleImageError = (index: number) => {
    setHasError(prev => {
      const newErrors = [...prev]
      newErrors[index] = true
      return newErrors
    })
  }

  const getAspectRatioClass = () => {
    switch (aspectRatio) {
      case 'square': return 'aspect-square'
      case 'wide': return 'aspect-video'
      default: return 'aspect-[3/2]'
    }
  }

  const getLayoutClass = () => {
    if (images.length === 1) return 'grid-cols-1'
    if (images.length === 2) return 'grid-cols-2'
    return 'grid-cols-1'
  }

  // For 1-2 images, use a grid layout
  if (images.length <= 2) {
    return (
      <>
        <div className={`relative overflow-hidden rounded-lg ${className}`}>
          <div className={`grid gap-1 ${getLayoutClass()}`}>
            {images.map((image, index) => (
              <div
                key={index}
                className={`relative bg-surface-container-low ${getAspectRatioClass()} cursor-pointer overflow-hidden`}
                onClick={() => setLightboxIndex(index)}
              >
                <div className="absolute inset-0 bg-surface-container-high animate-pulse" />
                <img
                  src={image}
                  alt={`Image ${index + 1}`}
                  loading="eager"
                  onError={() => handleImageError(index)}
                  referrerPolicy="no-referrer"
                  className={`absolute inset-0 w-full h-full object-cover ${hasError[index] ? 'hidden' : ''}`}
                />
              </div>
            ))}
          </div>
        </div>
        {lightboxIndex !== null && (
          <ImageLightbox
            images={images}
            initialIndex={lightboxIndex}
            onClose={() => setLightboxIndex(null)}
          />
        )}
      </>
    )
  }

  // For 3+ images, use slider
  return (
    <>
      <div className={`relative overflow-hidden rounded-lg ${className}`}>
        <div
          ref={sliderRef}
          className={`relative ${getAspectRatioClass()} overflow-hidden bg-surface-container-low w-full cursor-pointer`}
          onClick={() => setLightboxIndex(currentIndex)}
        >
          <div
            className="flex transition-transform duration-300 ease-in-out h-full"
            style={{ transform: `translateX(-${currentIndex * 100}%)` }}
          >
            {images.map((image, index) => (
              <div key={index} className="w-full h-full flex-shrink-0 relative bg-surface-container-low">
                {!isLoaded[index] && !hasError[index] && (
                  <div className="absolute inset-0 bg-surface-container-high animate-pulse" />
                )}
                <img
                  src={image}
                  alt={`Image ${index + 1}`}
                  loading={index <= 1 ? 'eager' : 'lazy'}
                  onLoad={() => handleImageLoad(index)}
                  onError={() => handleImageError(index)}
                  referrerPolicy="no-referrer"
                  className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-200 ${
                    isLoaded[index] ? 'opacity-100' : 'opacity-0'
                  } ${hasError[index] ? 'hidden' : ''}`}
                />
              </div>
            ))}
          </div>

          {/* Navigation Arrows */}
          {images.length > 1 && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); goToPrevious() }}
                className="absolute left-2 top-1/2 -translate-y-1/2 bg-black bg-opacity-50 hover:bg-opacity-70 text-white rounded-full p-1 transition-all"
                style={{ display: currentIndex === 0 ? 'none' : 'block' }}
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); goToNext() }}
                className="absolute right-2 top-1/2 -translate-y-1/2 bg-black bg-opacity-50 hover:bg-opacity-70 text-white rounded-full p-1 transition-all"
                style={{ display: currentIndex === images.length - 1 ? 'none' : 'block' }}
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </>
          )}

          {/* Image Counter */}
          {images.length > 1 && (
            <div className="absolute top-2 right-2 bg-black bg-opacity-60 text-white text-xs px-2 py-1 rounded-full">
              {currentIndex + 1}/{images.length}
            </div>
          )}
        </div>

        {/* Dot Indicators */}
        {images.length > 1 && (
          <div className="flex justify-center space-x-1 mt-3">
            {images.map((_, index) => (
              <button
                key={index}
                onClick={() => goToSlide(index)}
                className={`w-2 h-2 rounded-full transition-all ${
                  index === currentIndex
                    ? 'bg-primary w-4'
                    : 'bg-surface-container-highest hover:bg-outline-variant'
                }`}
                aria-label={`Go to image ${index + 1}`}
              />
            ))}
          </div>
        )}
      </div>
      {lightboxIndex !== null && (
        <ImageLightbox
          images={images}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}
    </>
  )
}

function ImageLightbox({
  images,
  initialIndex,
  onClose
}: {
  images: string[]
  initialIndex: number
  onClose: () => void
}) {
  const [index, setIndex] = useState(initialIndex)

  const goPrev = useCallback(() => {
    setIndex(prev => prev === 0 ? images.length - 1 : prev - 1)
  }, [images.length])

  const goNext = useCallback(() => {
    setIndex(prev => prev === images.length - 1 ? 0 : prev + 1)
  }, [images.length])

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft') goPrev()
      if (e.key === 'ArrowRight') goNext()
    }
    document.addEventListener('keydown', handleKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleKey)
      document.body.style.overflow = ''
    }
  }, [onClose, goPrev, goNext])

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90"
      onClick={onClose}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 text-white/80 hover:text-white z-10 bg-black/40 rounded-full p-2 transition-colors"
      >
        <X className="h-6 w-6" />
      </button>

      {/* Counter */}
      {images.length > 1 && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 text-white/80 text-sm bg-black/40 px-3 py-1 rounded-full">
          {index + 1} / {images.length}
        </div>
      )}

      {/* Previous */}
      {images.length > 1 && (
        <button
          onClick={(e) => { e.stopPropagation(); goPrev() }}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-white/80 hover:text-white bg-black/40 hover:bg-black/60 rounded-full p-2 transition-colors z-10"
        >
          <ChevronLeft className="h-7 w-7" />
        </button>
      )}

      {/* Image */}
      <img
        src={images[index]}
        alt={`Image ${index + 1}`}
        referrerPolicy="no-referrer"
        onClick={(e) => e.stopPropagation()}
        className="max-h-[90vh] max-w-[90vw] object-contain select-none"
      />

      {/* Next */}
      {images.length > 1 && (
        <button
          onClick={(e) => { e.stopPropagation(); goNext() }}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-white/80 hover:text-white bg-black/40 hover:bg-black/60 rounded-full p-2 transition-colors z-10"
        >
          <ChevronRight className="h-7 w-7" />
        </button>
      )}
    </div>
  )
}
