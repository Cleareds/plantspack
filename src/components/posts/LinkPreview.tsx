'use client'

import { useState, useEffect } from 'react'
import { ExternalLink, X, Play } from 'lucide-react'

interface LinkPreviewData {
  url: string
  title?: string
  description?: string
  image?: string
  siteName?: string
  type?: 'youtube' | 'vimeo' | 'link'
  videoId?: string
  embedUrl?: string
}

interface LinkPreviewProps {
  url: string
  onRemove?: () => void
  className?: string
}

// Utility functions for video URL detection
function isYouTubeUrl(url: string): boolean {
  const youtubeRegex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com|youtu\.be)\//
  return youtubeRegex.test(url)
}

function isVimeoUrl(url: string): boolean {
  const vimeoRegex = /(?:https?:\/\/)?(?:www\.)?(?:vimeo\.com)\//
  return vimeoRegex.test(url)
}

function extractYouTubeVideoId(url: string): string | null {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/
  const match = url.match(regExp)
  return match && match[2].length === 11 ? match[2] : null
}

function extractVimeoVideoId(url: string): string | null {
  const regExp = /(?:vimeo)\.com.*(?:videos|video|channels|)\/([\d]+)/i
  const match = url.match(regExp)
  return match ? match[1] : null
}

export default function LinkPreview({ url, onRemove, className = '' }: LinkPreviewProps) {
  const [previewData, setPreviewData] = useState<LinkPreviewData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!url) return
    fetchPreviewData(url)
  }, [url])

  const fetchPreviewData = async (targetUrl: string) => {
    try {
      setLoading(true)
      setError(false)

      const cleanUrl = targetUrl.startsWith('http') ? targetUrl : `https://${targetUrl}`
      const urlObj = new URL(cleanUrl)
      const domain = urlObj.hostname.replace('www.', '')
      
      // Check if it's a YouTube URL
      if (isYouTubeUrl(cleanUrl)) {
        const videoId = extractYouTubeVideoId(cleanUrl)
        if (videoId) {
          setPreviewData({
            url: cleanUrl,
            title: 'YouTube Video',
            description: cleanUrl,
            siteName: 'YouTube',
            type: 'youtube',
            videoId,
            embedUrl: `https://www.youtube.com/embed/${videoId}`,
            image: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`
          })
          return
        }
      }
      
      // Check if it's a Vimeo URL
      if (isVimeoUrl(cleanUrl)) {
        const videoId = extractVimeoVideoId(cleanUrl)
        if (videoId) {
          setPreviewData({
            url: cleanUrl,
            title: 'Vimeo Video',
            description: cleanUrl,
            siteName: 'Vimeo',
            type: 'vimeo',
            videoId,
            embedUrl: `https://player.vimeo.com/video/${videoId}`
          })
          return
        }
      }
      
      // For other URLs, create a basic preview
      setPreviewData({
        url: cleanUrl,
        title: `Link to ${domain}`,
        description: cleanUrl,
        siteName: domain,
        type: 'link'
      })
    } catch (err) {
      console.error('Error creating link preview:', err)
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className={`border border-gray-200 rounded-lg p-3 bg-gray-50 animate-pulse ${className}`}>
        <div className="flex space-x-3">
          <div className="w-16 h-16 bg-gray-200 rounded"></div>
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-3 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    )
  }

  if (error || !previewData) {
    return null
  }

  const handleClick = () => {
    window.open(previewData.url, '_blank', 'noopener,noreferrer')
  }

  // Special rendering for video URLs
  if (previewData.type === 'youtube' || previewData.type === 'vimeo') {
    return (
      <div className={`border border-gray-200 rounded-lg overflow-hidden bg-white ${className}`}>
        {onRemove && (
          <div className="flex justify-end p-2">
            <button
              onClick={(e) => {
                e.stopPropagation()
                onRemove()
              }}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
        
        <div className="aspect-video bg-gray-100 relative">
          <iframe
            src={previewData.embedUrl}
            className="w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            title="Video player"
          />
        </div>
        
        <div className="p-3">
          <div className="flex items-center space-x-2 mb-1">
            <div className={`w-5 h-5 rounded flex items-center justify-center ${
              previewData.type === 'youtube' ? 'bg-red-100' : 'bg-blue-100'
            }`}>
              <Play className={`h-3 w-3 ${
                previewData.type === 'youtube' ? 'text-red-600' : 'text-blue-600'
              }`} />
            </div>
            <span className="text-sm font-medium text-gray-900">
              {previewData.siteName}
            </span>
          </div>
          <a
            href={previewData.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-gray-600 hover:text-green-600 transition-colors truncate block"
          >
            {previewData.url}
          </a>
        </div>
      </div>
    )
  }

  // Regular link preview
  return (
    <div className={`border border-gray-200 rounded-lg overflow-hidden bg-white hover:bg-gray-50 transition-colors cursor-pointer ${className}`}>
      {onRemove && (
        <div className="flex justify-end p-2">
          <button
            onClick={(e) => {
              e.stopPropagation()
              onRemove()
            }}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
      
      <div onClick={handleClick} className="p-3">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0 mt-1">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <ExternalLink className="h-5 w-5 text-blue-600" />
            </div>
          </div>
          
          <div className="flex-1 min-w-0">
            {previewData.title && (
              <h3 className="text-sm font-medium text-gray-900 line-clamp-1 mb-1">
                {previewData.title}
              </h3>
            )}
            
            <div className="flex items-center space-x-1 text-xs text-gray-500 mb-1">
              <span className="truncate">
                {previewData.siteName || new URL(previewData.url).hostname}
              </span>
            </div>
            
            {previewData.description && previewData.description !== previewData.url && (
              <p className="text-xs text-gray-600 line-clamp-1">
                {previewData.description}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// Helper function to detect URLs in text
export function extractUrls(text: string): string[] {
  const urlRegex = /(https?:\/\/[^\s]+)|(www\.[^\s]+)|([a-zA-Z0-9-]+\.[a-zA-Z]{2,}[^\s]*)/g
  const matches = text.match(urlRegex)
  
  if (!matches) return []
  
  return matches
    .map(url => {
      if (url.startsWith('http')) return url
      if (url.startsWith('www.')) return `https://${url}`
      if (url.includes('.') && !url.includes(' ')) return `https://${url}`
      return null
    })
    .filter((url): url is string => url !== null)
    .slice(0, 1) // Only show preview for first URL
}