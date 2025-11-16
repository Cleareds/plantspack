'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { Image as ImageIcon, Globe, Users, Send, X, MapPin, Tag, Video } from 'lucide-react'
import ImageUploader from '../ui/ImageUploader'
import ImageSlider from '../ui/ImageSlider'
import VideoUploader from '../ui/VideoUploader'
import LinkPreview, { extractUrls } from './LinkPreview'
import MentionAutocomplete from './MentionAutocomplete'
import Link from 'next/link'
import { analyzePostContent, getCurrentLocation, detectLanguage, type LocationData, type PostMetadata } from '@/lib/post-analytics'
import { getUserSubscription, SUBSCRIPTION_TIERS, type UserSubscription, canPerformAction } from '@/lib/stripe'
import { moderateContent, shouldBlockContent } from '@/lib/moderation'
import { extractHashtags, extractMentions, resolveUsernames, getOrCreateHashtags, linkHashtagsToPost } from '@/lib/hashtags'

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
  const [error, setError] = useState<string | null>(null)
  const [charCount, setCharCount] = useState(() => loadDraft()?.content?.length || 0)
  const [showImageUploader, setShowImageUploader] = useState(() => loadDraft()?.showImageUploader || false)
  const [imageUrls, setImageUrls] = useState<string[]>(() => loadDraft()?.imageUrls || [])
  const [showVideoUploader, setShowVideoUploader] = useState(() => loadDraft()?.showVideoUploader || false)
  const [videoUrls, setVideoUrls] = useState<string[]>(() => loadDraft()?.videoUrls || [])
  const [detectedUrls, setDetectedUrls] = useState<string[]>([])
  const [showLinkPreview, setShowLinkPreview] = useState(() => loadDraft()?.showLinkPreview !== false)

  // Mention autocomplete state
  const [mentionQuery, setMentionQuery] = useState('')
  const [mentionStartPos, setMentionStartPos] = useState(-1)
  const [showMentionAutocomplete, setShowMentionAutocomplete] = useState(false)
  const [cursorPosition, setCursorPosition] = useState({ top: 0, left: 0 })
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  
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

    // Validation
    if (!user) {
      setError('You must be logged in to create a post')
      return
    }

    if (!content.trim() && imageUrls.length === 0 && videoUrls.length === 0) {
      setError('Please add some content, images, or videos')
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Check rate limit before creating post
      const { data: rateLimitData, error: rateLimitError } = await supabase
        .rpc('check_rate_limit_posts', { p_user_id: user.id })

      if (rateLimitError) {
        console.error('Rate limit check error:', rateLimitError)
        // Continue anyway if rate limit check fails
      } else if (rateLimitData === false) {
        throw new Error('Rate limit exceeded. Please wait a few minutes before posting again.')
      }

      // Check content moderation before posting
      let moderationResult = null
      let contentWarnings: string[] = []
      let isSensitive = false

      if (content.trim()) {
        moderationResult = await moderateContent(content.trim(), imageUrls[0])

        // Block content if it violates serious policies
        if (shouldBlockContent(moderationResult)) {
          throw new Error('This content violates our community guidelines and cannot be posted. Please review our community standards.')
        }

        // If flagged but not blocked, add content warnings
        if (moderationResult.flagged && moderationResult.warnings.length > 0) {
          contentWarnings = moderationResult.warnings
          isSensitive = true
        }
      }

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
        language: detectedLang,
        content_warnings: contentWarnings.length > 0 ? contentWarnings : null,
        is_sensitive: isSensitive
      }

      // Add location data if user chose to share
      if (shareLocation && locationData) {
        if (locationData.city) postData.location_city = locationData.city
        if (locationData.region) postData.location_region = locationData.region
      }

      // Only add images field if we have images to avoid database errors
      if (imageUrls.length > 0) {
        postData.images = imageUrls
      }

      // Only add videos field if we have videos
      if (videoUrls.length > 0) {
        postData.video_urls = videoUrls
      }

      // Extract hashtags and mentions before creating post
      const hashtags = extractHashtags(content)
      const mentions = extractMentions(content)

      // Resolve mentions to user IDs
      let mentionedUserIds: string[] = []
      if (mentions.length > 0) {
        mentionedUserIds = await resolveUsernames(mentions)
        if (mentionedUserIds.length > 0) {
          postData.mentioned_users = mentionedUserIds
        }
      }

      const { data: createdPost, error: dbError } = await supabase
        .from('posts')
        .insert(postData)
        .select('id')
        .single()

      if (dbError) {
        console.error('Database error:', dbError)
        throw new Error(dbError.message || 'Failed to create post')
      }

      if (!createdPost) {
        throw new Error('Post created but ID not returned')
      }

      // Process hashtags (create and link to post)
      if (hashtags.length > 0) {
        try {
          const hashtagIds = await getOrCreateHashtags(hashtags)
          if (hashtagIds.length > 0) {
            await linkHashtagsToPost(createdPost.id, hashtagIds)
          }
        } catch (hashtagError) {
          console.error('Error processing hashtags:', hashtagError)
          // Don't fail the post creation if hashtag processing fails
        }
      }

      // Send notifications to mentioned users
      if (mentionedUserIds.length > 0) {
        try {
          for (const mentionedUserId of mentionedUserIds) {
            // Don't notify if user mentioned themselves
            if (mentionedUserId !== user.id) {
              await fetch('/api/notifications/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  userId: mentionedUserId,
                  type: 'mention',
                  entityType: 'post',
                  entityId: createdPost.id,
                }),
              })
            }
          }
        } catch (notifError) {
          console.error('Error sending mention notifications:', notifError)
          // Don't fail the post creation if notification fails
        }
      }

      // Reset form only on success
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
      setError(null)
      clearDraft()
      onPostCreated()
    } catch (err) {
      console.error('Error creating post:', err)
      setError(err instanceof Error ? err.message : 'Failed to create post. Please try again.')
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
              Sign Up - Free Forever
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
        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

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

                {/* Only show Location for paid users */}
                {subscription && subscription.tier !== 'free' && (
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
                )}
                
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
            </div>

              <div className="flex flex-col space-y-2 mt-4">
                <div className="flex items-center space-x-3">
                  <button
                      type="submit"
                      disabled={(!content.trim() && imageUrls.length === 0 && videoUrls.length === 0) || loading || (maxChars !== -1 && charCount > maxChars)}
                      className="flex items-center space-x-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white px-4 py-2 rounded-md font-medium transition-colors"
                  >
                      <Send className="h-4 w-4" />
                      <span>{loading ? 'Posting...' : 'Post'}</span>
                  </button>
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
                </div>

                {/* Promotional note for free tier users */}
                {(!subscription || subscription.tier === 'free') && (
                  <p className="text-xs text-gray-600">
                    Get more posting freedom by{' '}
                    <Link
                      href="/pricing"
                      className="text-green-600 hover:text-green-700 underline font-medium"
                    >
                      supporting us
                    </Link>
                  </p>
                )}
              </div>

          </div>
        </div>
      </form>
    </div>
  )
}