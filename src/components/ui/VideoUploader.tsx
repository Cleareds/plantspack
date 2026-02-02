'use client'

import { useState, useRef, useCallback } from 'react'
import { Upload, X, Play, AlertCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { getUserSubscription, SUBSCRIPTION_TIERS, type UserSubscription } from '@/lib/stripe'

interface VideoUploaderProps {
  onVideosChange: (urls: string[]) => void
  maxVideos?: number
  maxVideoSizeMB?: number
  subscription?: UserSubscription | null
}

export default function VideoUploader({ 
  onVideosChange, 
  maxVideos = 1,
  maxVideoSizeMB = 64,
  subscription 
}: VideoUploaderProps) {
  const [videoUrls, setVideoUrls] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Get actual limits from subscription
  const actualMaxVideos = subscription ? SUBSCRIPTION_TIERS[subscription.tier].maxVideos : 0
  const actualMaxSizeMB = subscription ? SUBSCRIPTION_TIERS[subscription.tier].maxVideoSize / (1024 * 1024) : 0

  const uploadVideo = useCallback(async (file: File): Promise<string> => {
    const fileExt = file.name.split('.').pop()
    const fileName = `${Math.random()}.${fileExt}`
    const filePath = `videos/${fileName}`

    const { data, error } = await supabase.storage
      .from('media')
      .upload(filePath, file, {
        cacheControl: 'public, max-age=2592000, immutable', // 30 days - filenames are unique
        upsert: false
      })

    if (error) {
      throw error
    }

    const { data: { publicUrl } } = supabase.storage
      .from('media')
      .getPublicUrl(filePath)

    return publicUrl
  }, [])

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files || files.length === 0) return

    const file = files[0]
    
    // Validate file type
    if (!file.type.startsWith('video/')) {
      setError('Please select a valid video file')
      return
    }

    // Validate file size
    const fileSizeMB = file.size / (1024 * 1024)
    if (fileSizeMB > actualMaxSizeMB) {
      setError(`Video size must be less than ${actualMaxSizeMB}MB`)
      return
    }

    // Check if we can add more videos
    if (videoUrls.length >= actualMaxVideos) {
      setError(`You can only upload ${actualMaxVideos} video${actualMaxVideos > 1 ? 's' : ''} per post`)
      return
    }

    setError(null)
    setUploading(true)

    try {
      const videoUrl = await uploadVideo(file)
      const newVideoUrls = [...videoUrls, videoUrl]
      setVideoUrls(newVideoUrls)
      onVideosChange(newVideoUrls)
    } catch (err) {
      console.error('Error uploading video:', err)
      setError('Failed to upload video. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  const removeVideo = (indexToRemove: number) => {
    const newVideoUrls = videoUrls.filter((_, index) => index !== indexToRemove)
    setVideoUrls(newVideoUrls)
    onVideosChange(newVideoUrls)
  }

  const canUploadMore = videoUrls.length < actualMaxVideos && actualMaxVideos > 0

  if (actualMaxVideos === 0) {
    return (
      <div className="text-center p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <AlertCircle className="h-5 w-5 text-yellow-600 mx-auto mb-2" />
        <p className="text-sm text-yellow-800">
          Video uploads require a paid subscription
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Upload Button */}
      {canUploadMore && (
        <div className="flex items-center justify-center">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex items-center space-x-2 px-4 py-2 border border-dashed border-gray-300 rounded-lg hover:border-green-500 hover:bg-green-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-600"></div>
                <span className="text-sm text-gray-700">Uploading...</span>
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-700">Upload Video</span>
              </>
            )}
          </button>
          
          <input
            ref={fileInputRef}
            type="file"
            accept="video/*"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>
      )}

      {/* Upload Limits Info */}
      <div className="text-xs text-gray-500 text-center">
        {videoUrls.length}/{actualMaxVideos} videos • Max {actualMaxSizeMB}MB each
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center space-x-2">
            <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
            <p className="text-sm text-red-800">{error}</p>
          </div>
        </div>
      )}

      {/* Video Previews - small thumbnails matching image preview size */}
      {videoUrls.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {videoUrls.map((url, index) => (
            <div key={index} className="relative group">
              <div className="relative bg-gray-100 rounded-lg overflow-hidden h-24">
                <video
                  src={url}
                  className="w-full h-24 object-cover rounded-lg"
                  preload="metadata"
                  muted
                />
                {/* Play icon overlay */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="bg-black bg-opacity-40 rounded-full p-1.5">
                    <Play className="h-4 w-4 text-white fill-white" />
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => removeVideo(index)}
                className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}