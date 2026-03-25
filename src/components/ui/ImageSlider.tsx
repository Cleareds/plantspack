'use client'

import { useState, useRef } from 'react'
import Image from 'next/image'
import { ChevronLeft, ChevronRight } from 'lucide-react'

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
  const sliderRef = useRef<HTMLDivElement>(null)

  if (!images || images.length === 0) return null

  // Domains whitelisted in next.config.ts — use optimized Image for these
  const OPTIMIZED_DOMAINS = ['supabase.co', 'googleusercontent.com', 'googleapis.com', 'wikimedia.org']
  const isOptimized = (url: string) => {
    try {
      const hostname = new URL(url).hostname
      return OPTIMIZED_DOMAINS.some(d => hostname.endsWith(d))
    } catch { return false }
  }

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
      case 'square':
        return 'aspect-square'
      case 'wide':
        return 'aspect-video'
      default:
        return 'h-80' // Explicit height for proper child rendering
    }
  }

  const getLayoutClass = () => {
    if (images.length === 1) return 'grid-cols-1'
    if (images.length === 2) return 'grid-cols-2'
    return 'grid-cols-1' // For 3+ images, use slider
  }

  // For 1-2 images, use a grid layout instead of slider
  if (images.length <= 2) {
    return (
      <div className={`relative overflow-hidden rounded-lg ${className}`}>
        <div className={`grid gap-1 ${getLayoutClass()}`}>
          {images.map((image, index) => (
            <div
              key={index}
              className={`relative bg-surface-container-low ${getAspectRatioClass()}`}
              style={{ minHeight: aspectRatio === 'auto' ? '16rem' : undefined }}
            >
              {!isLoaded[index] && (
                <div className="absolute inset-0 bg-surface-container-high animate-pulse" />
              )}
              <Image
                src={image}
                alt={`Image ${index + 1}`}
                fill
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                quality={75}
                unoptimized={!isOptimized(image)}
                onLoad={() => handleImageLoad(index)}
                onError={() => handleImageError(index)}
                referrerPolicy="no-referrer"
                className={`object-cover transition-opacity duration-200 ${
                  isLoaded[index] ? 'opacity-100' : 'opacity-0'
                } ${hasError[index] ? 'hidden' : ''}`}
              />
            </div>
          ))}
        </div>
      </div>
    )
  }

  // For 3+ images, use slider
  return (
    <div className={`relative overflow-hidden rounded-lg ${className}`}>
      {/* Main Image Container */}
      <div
        ref={sliderRef}
        className={`relative ${getAspectRatioClass()} overflow-hidden bg-surface-container-low w-full`}
        style={{ minHeight: aspectRatio === 'auto' ? '16rem' : undefined }}
      >
        <div
          className="flex transition-transform duration-300 ease-in-out h-full"
          style={{ transform: `translateX(-${currentIndex * 100}%)` }}
        >
          {images.map((image, index) => (
            <div key={index} className="w-full h-full flex-shrink-0 relative bg-surface-container-low">
              {!isLoaded[index] && (
                <div className="absolute inset-0 bg-surface-container-high animate-pulse" />
              )}
              <Image
                src={image}
                alt={`Image ${index + 1}`}
                fill
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                quality={75}
                unoptimized={!isOptimized(image)}
                onLoad={() => handleImageLoad(index)}
                onError={() => handleImageError(index)}
                referrerPolicy="no-referrer"
                className={`object-cover transition-opacity duration-200 ${
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
              onClick={goToPrevious}
              className="absolute left-2 top-1/2 -translate-y-1/2 bg-black bg-opacity-50 hover:bg-opacity-70 text-white rounded-full p-1 transition-all"
              style={{ display: currentIndex === 0 ? 'none' : 'block' }}
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              onClick={goToNext}
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
  )
}