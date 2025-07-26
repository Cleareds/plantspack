'use client'

import { useState, useEffect } from 'react'
import { ExternalLink, X } from 'lucide-react'

interface LinkPreviewData {
  url: string
  title?: string
  description?: string
  image?: string
  siteName?: string
}

interface LinkPreviewProps {
  url: string
  onRemove?: () => void
  className?: string
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

      // Use a CORS proxy service or your own backend to fetch metadata
      // For now, we'll use a simple approach with basic URL parsing
      const cleanUrl = targetUrl.startsWith('http') ? targetUrl : `https://${targetUrl}`
      
      // Try to extract domain and create a basic preview
      const urlObj = new URL(cleanUrl)
      const domain = urlObj.hostname.replace('www.', '')
      
      // For MVP, create a basic preview with just the URL info
      // In production, you'd want to fetch actual meta tags via your backend
      setPreviewData({
        url: cleanUrl,
        title: `Link to ${domain}`,
        description: cleanUrl,
        siteName: domain
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
        <div className="flex space-x-3">
          {previewData.image && (
            <div className="flex-shrink-0">
              <img
                src={previewData.image}
                alt=""
                className="w-16 h-16 object-cover rounded"
                onError={(e) => {
                  const target = e.target as HTMLImageElement
                  target.style.display = 'none'
                }}
              />
            </div>
          )}
          
          <div className="flex-1 min-w-0">
            {previewData.title && (
              <h3 className="text-sm font-medium text-gray-900 line-clamp-2 mb-1">
                {previewData.title}
              </h3>
            )}
            
            {previewData.description && (
              <p className="text-xs text-gray-600 line-clamp-2 mb-2">
                {previewData.description}
              </p>
            )}
            
            <div className="flex items-center space-x-1 text-xs text-gray-500">
              <ExternalLink className="h-3 w-3" />
              <span className="truncate">
                {previewData.siteName || new URL(previewData.url).hostname}
              </span>
            </div>
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