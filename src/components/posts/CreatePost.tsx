'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { Image as ImageIcon, Globe, Users, Send, X, MapPin, Tag, Video } from 'lucide-react'
import ImageUploader from '../ui/ImageUploader'
import ImageSlider from '../ui/ImageSlider'
import VideoUploader from '../ui/VideoUploader'
import LinkPreview, { extractUrls } from './LinkPreview'
import Link from 'next/link'
import { analyzePostContent, getCurrentLocation, detectLanguage, type LocationData, type PostMetadata } from '@/lib/post-analytics'
import { getUserSubscription, SUBSCRIPTION_TIERS, type UserSubscription, canPerformAction } from '@/lib/stripe'

interface CreatePostProps {
  onPostCreated: () => void
}

const DRAFT_KEY = 'createpost_draft'

export default function CreatePost({ onPostCreated }: CreatePostProps) {
  const { user, profile } = useAuth()
  const [subscription, setSubscription] = useState<UserSubscription | null>(null)
  
  // Get max characters based on subscription tier
  const maxChars = subscription ? SUBSCRIPTION_TIERS[subscription.tier].maxPostLength : 500

  // Load draft from localStorage on mount
  const loadDraft = useCallback(() => {
    if (typeof window === 'undefined') return null
    try {
      const draft = localStorage.getItem(DRAFT_KEY)
      return draft ? JSON.parse(draft) : null
    } catch {
      return null
    }
  }, [])

  const [content, setContent] = useState(() => loadDraft()?.content || '')
  const [privacy, setPrivacy] = useState<'public' | 'friends'>(() => loadDraft()?.privacy || 'public')
  const [loading, setLoading] = useState(false)
  const [charCount, setCharCount] = useState(() => loadDraft()?.content?.length || 0)
  const [showImageUploader, setShowImageUploader] = useState(() => loadDraft()?.showImageUploader || false)
  const [imageUrls, setImageUrls] = useState<string[]>(() => loadDraft()?.imageUrls || [])
  const [showVideoUploader, setShowVideoUploader] = useState(() => loadDraft()?.showVideoUploader || false)
  const [videoUrls, setVideoUrls] = useState<string[]>(() => loadDraft()?.videoUrls || [])
  const [detectedUrls, setDetectedUrls] = useState<string[]>([])
  const [showLinkPreview, setShowLinkPreview] = useState(() => loadDraft()?.showLinkPreview !== false)
  
  // Enhanced metadata state
  const [locationData, setLocationData] = useState<LocationData | null>(null)
  const [shareLocation, setShareLocation] = useState(false)
  const [analyzedMetadata, setAnalyzedMetadata] = useState<Pick<PostMetadata, 'tags' | 'contentType' | 'mood'> | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)

  // Load user subscription on mount
  useEffect(() => {
    if (user) {
      getUserSubscription(user.id).then(setSubscription)
    }
  }, [user])

  // Save draft to localStorage
  const saveDraft = useCallback(() => {
    if (typeof window === 'undefined') return
    try {
      const draft = {
        content,
        privacy,
        showImageUploader,
        imageUrls,
        showVideoUploader,
        videoUrls,
        showLinkPreview,
        shareLocation,
        locationData
      }
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft))
    } catch {
      // Ignore localStorage errors
    }
  }, [content, privacy, showImageUploader, imageUrls, showLinkPreview, shareLocation, locationData])

  // Save draft when form state changes
  useEffect(() => {
    if (content || imageUrls.length > 0 || videoUrls.length > 0) {
      saveDraft()
    }
  }, [content, privacy, showImageUploader, imageUrls, showVideoUploader, videoUrls, showLinkPreview, saveDraft])

  // Clear draft
  const clearDraft = useCallback(() => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(DRAFT_KEY)
    }
  }, [])

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value
    // Allow unlimited for premium tier (-1), otherwise respect the limit
    if (maxChars === -1 || text.length <= maxChars) {
      setContent(text)
      setCharCount(text.length)
    }
  }

  // Detect URLs in content
  useEffect(() => {
    const urls = extractUrls(content)
    setDetectedUrls(urls)
  }, [content])

  // Analyze content for metadata when content changes
  useEffect(() => {
    if (content.trim().length < 10) {
      setAnalyzedMetadata(null)
      return
    }

    const timeoutId = setTimeout(() => {
      setIsAnalyzing(true)
      const metadata = analyzePostContent(content)
      setAnalyzedMetadata(metadata)
      setIsAnalyzing(false)
    }, 500) // Debounce analysis

    return () => clearTimeout(timeoutId)
  }, [content])

  // Get location when user wants to share it
  const handleLocationToggle = useCallback(async () => {
    if (!shareLocation) {
      setShareLocation(true)
      if (!locationData) {
        try {
          const location = await getCurrentLocation()
          setLocationData(location)
        } catch (error) {
          console.warn('Failed to get location:', error)
          setShareLocation(false)
        }
      }
    } else {
      setShareLocation(false)
    }
  }, [shareLocation, locationData])

  const handleImagesChange = (urls: string[]) => {
    setImageUrls(urls)
  }

  const removeAllImages = () => {
    setImageUrls([])
    setShowImageUploader(false)
  }

  const handleVideosChange = (urls: string[]) => {
    setVideoUrls(urls)
  }

  const removeAllVideos = () => {
    setVideoUrls([])
    setShowVideoUploader(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || (!content.trim() && imageUrls.length === 0 && videoUrls.length === 0)) return

    setLoading(true)
    try {
      // Get final content analysis
      const finalMetadata = analyzedMetadata || analyzePostContent(content)
      const detectedLang = detectLanguage(content)
      
      const postData: any = {
        user_id: user.id,
        content: content.trim(),
        privacy,
        tags: finalMetadata.tags,
        content_type: finalMetadata.contentType,
        mood: finalMetadata.mood,
        language: detectedLang
      }

      // Add location data if user chose to share
      if (shareLocation && locationData) {
        if (locationData.city) postData.location_city = locationData.city
        if (locationData.region) postData.location_region = locationData.region
      }

      // Only add images field if we have images to avoid database errors
      if (imageUrls.length > 0) {
        postData.image_urls = imageUrls
      }
      
      // Only add videos field if we have videos
      if (videoUrls.length > 0) {
        postData.video_urls = videoUrls
      }

      const { error } = await supabase.from('posts').insert(postData)

      if (error) throw error

      // Reset form
      setContent('')
      setCharCount(0)
      setPrivacy('public')
      setImageUrls([])
      setVideoUrls([])
      setShowImageUploader(false)
      setShowVideoUploader(false)
      setShowLinkPreview(true)
      setShareLocation(false)
      setLocationData(null)
      setAnalyzedMetadata(null)
      clearDraft()
      onPostCreated()
    } catch (error) {
      console.error('Error creating post:', error)
    } finally {
      setLoading(false)
    }
  }

  if (!user) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="text-center">
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Join the conversation!
          </h3>
          <p className="text-gray-600 mb-4">
            Sign up or log in to start sharing your vegan journey with the community.
          </p>
          <div className="flex justify-center space-x-3">
            <Link 
              href="/auth" 
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md font-medium transition-colors"
            >
              Sign Up
            </Link>
            <Link 
              href="/auth" 
              className="bg-gray-100 hover:bg-gray-200 text-gray-800 px-4 py-2 rounded-md font-medium transition-colors"
            >
              Log In
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <form onSubmit={handleSubmit}>
        <div className="flex space-x-3">
          <Link href={`/user/${profile?.username}`} className="flex-shrink-0">
            {profile?.avatar_url ? (
              <div className="h-10 w-10 rounded-full overflow-hidden bg-gray-100 hover:ring-2 hover:ring-green-500 hover:ring-offset-1 transition-all cursor-pointer">
                <img
                  src={profile.avatar_url}
                  alt={`${profile.first_name || profile.username}'s avatar`}
                  className="h-full w-full object-cover"
                />
              </div>
            ) : (
              <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center hover:ring-2 hover:ring-green-500 hover:ring-offset-1 transition-all cursor-pointer">
                <span className="text-green-600 font-medium text-sm">
                  {profile?.first_name?.[0] || profile?.username?.[0] || 'U'}
                </span>
              </div>
            )}
          </Link>
          <div className="flex-1">
            <textarea
              value={content}
              onChange={handleContentChange}
              placeholder="Share your vegan journey..."
              className="w-full p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              rows={3}
            />

            {/* Image Preview */}
            {imageUrls.length > 0 && (
              <div className="mt-3 relative">
                <button
                  type="button"
                  onClick={removeAllImages}
                  className="absolute top-2 right-2 z-10 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
                <ImageSlider 
                  images={imageUrls} 
                  aspectRatio="wide"
                  className="max-w-full"
                />
              </div>
            )}

            {/* Image Uploader */}
            {showImageUploader && (
              <div className="mt-3">
                <ImageUploader
                  onImagesChange={handleImagesChange}
                  maxImages={subscription ? SUBSCRIPTION_TIERS[subscription.tier].maxImages : 3}
                />
              </div>
            )}

            {/* Video Previews */}
            {videoUrls.length > 0 && (
              <div className="mt-3 space-y-3">
                {videoUrls.map((url, index) => (
                  <div key={index} className="relative">
                    <div className="relative bg-gray-100 rounded-lg overflow-hidden aspect-video">
                      <video
                        src={url}
                        className="w-full h-full object-cover"
                        controls
                        preload="metadata"
                      >
                        Your browser does not support the video tag.
                      </video>
                      
                      <button
                        type="button"
                        onClick={removeAllVideos}
                        className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Video Uploader */}
            {showVideoUploader && (
              <div className="mt-3">
                <VideoUploader
                  onVideosChange={handleVideosChange}
                  subscription={subscription}
                />
              </div>
            )}

            {/* Link Preview */}
            {detectedUrls.length > 0 && showLinkPreview && (
              <div className="mt-3">
                <LinkPreview
                  url={detectedUrls[0]}
                  onRemove={() => setShowLinkPreview(false)}
                  className="max-w-full"
                />
              </div>
            )}

            {/* Content Analysis Preview */}
            {analyzedMetadata && (
              <div className="mt-3 p-3 bg-gray-50 rounded-lg border">
                <div className="flex items-center space-x-2 mb-2">
                  <Tag className="h-4 w-4 text-gray-500" />
                  <span className="text-sm font-medium text-gray-700">Content Analysis</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                    {analyzedMetadata.contentType.replace('_', ' ')}
                  </span>
                  <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                    {analyzedMetadata.mood}
                  </span>
                  {analyzedMetadata.tags.map((tag, index) => (
                    <span key={index} className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Location Preview */}
            {shareLocation && locationData && (
              <div className="mt-3 p-3 bg-blue-50 rounded-lg border">
                <div className="flex items-center space-x-2">
                  <MapPin className="h-4 w-4 text-blue-600" />
                  <span className="text-sm text-blue-800">
                    Sharing location: {locationData.city && locationData.region 
                      ? `${locationData.city}, ${locationData.region}`
                      : locationData.city || locationData.region || 'Current location'
                    }
                  </span>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between mt-3">
              <div className="flex items-center space-x-4">
                <button
                  type="button"
                  onClick={() => setShowImageUploader(!showImageUploader)}
                  className={`flex items-center space-x-1 hover:text-green-600 transition-colors ${
                    showImageUploader || imageUrls.length > 0 
                      ? 'text-green-600' 
                      : 'text-gray-500'
                  }`}
                >
                  <ImageIcon className="h-5 w-5" />
                  <span className="text-sm">Photo</span>
                </button>

                {subscription && canPerformAction(subscription, 'upload_video') && (
                  <button
                    type="button"
                    onClick={() => setShowVideoUploader(!showVideoUploader)}
                    className={`flex items-center space-x-1 hover:text-purple-600 transition-colors ${
                      showVideoUploader || videoUrls.length > 0 
                        ? 'text-purple-600' 
                        : 'text-gray-500'
                    }`}
                  >
                    <Video className="h-5 w-5" />
                    <span className="text-sm">Video</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleLocationToggle}
                  className={`flex items-center space-x-1 hover:text-blue-600 transition-colors ${
                    shareLocation 
                      ? 'text-blue-600' 
                      : 'text-gray-500'
                  }`}
                >
                  <MapPin className="h-5 w-5" />
                  <span className="text-sm">Location</span>
                </button>
                
                <div className="flex items-center space-x-2">
                  <label className="flex items-center space-x-1 cursor-pointer">
                    <input
                      type="radio"
                      value="public"
                      checked={privacy === 'public'}
                      onChange={(e) => setPrivacy(e.target.value as 'public' | 'friends')}
                      className="text-green-600 focus:ring-green-500"
                    />
                    <Globe className="h-4 w-4 text-gray-500" />
                    <span className="text-sm text-gray-700">Public</span>
                  </label>
                  <label className="flex items-center space-x-1 cursor-pointer">
                    <input
                      type="radio"
                      value="friends"
                      checked={privacy === 'friends'}
                      onChange={(e) => setPrivacy(e.target.value as 'public' | 'friends')}
                      className="text-green-600 focus:ring-green-500"
                    />
                    <Users className="h-4 w-4 text-gray-500" />
                    <span className="text-sm text-gray-700">Friends</span>
                  </label>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-2">
                  <span className={`text-sm ${maxChars !== -1 && charCount > maxChars * 0.9 ? 'text-red-500' : 'text-gray-500'}`}>
                    {charCount}{maxChars === -1 ? '' : `/${maxChars}`}
                  </span>
                  {subscription?.tier === 'free' && charCount > 400 && (
                    <Link
                      href="/pricing"
                      className="text-xs text-green-600 hover:text-green-700 underline"
                    >
                      Upgrade for unlimited chars
                    </Link>
                  )}
                </div>
                <button
                  type="submit"
                  disabled={(!content.trim() && imageUrls.length === 0 && videoUrls.length === 0) || loading || (maxChars !== -1 && charCount > maxChars)}
                  className="flex items-center space-x-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white px-4 py-2 rounded-md font-medium transition-colors"
                >
                  <Send className="h-4 w-4" />
                  <span>{loading ? 'Posting...' : 'Post'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}