'use client'

import { useState } from 'react'
import { useAuth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { Tables } from '@/lib/supabase'
import { Share, MessageSquareQuote, Repeat2, X, Facebook, Twitter, Instagram, Link as LinkIcon, MessageCircle } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import ImageSlider from '../ui/ImageSlider'

type Post = Tables<'posts'> & {
  users: Tables<'users'>
}

interface SharePostProps {
  post: Post
  isOpen: boolean
  onClose: () => void
  onShared: () => void
}

export default function SharePost({ post, isOpen, onClose, onShared }: SharePostProps) {
  const [shareType, setShareType] = useState<'share' | 'quote'>('share')
  const [quoteContent, setQuoteContent] = useState('')
  const [privacy, setPrivacy] = useState<'public' | 'friends'>('public')
  const [submitting, setSubmitting] = useState(false)
  const [copied, setCopied] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const { user } = useAuth()

  const postUrl = typeof window !== 'undefined' ? `${window.location.origin}/post/${post.id}` : ''
  // Create share text with content excerpt
  const contentExcerpt = post.content.length > 120
    ? post.content.substring(0, 120) + '...'
    : post.content
  const shareText = `${contentExcerpt}`

  const handleShare = async () => {
    if (!user || submitting) return

    try {
      setSubmitting(true)

      // Create share data with proper post_type and parent_post_id
      const shareData: any = {
        user_id: user.id,
        parent_post_id: post.id,
        post_type: shareType,
        privacy
      }

      if (shareType === 'quote' && quoteContent.trim()) {
        // Quote post - store user's quote text in quote_content
        shareData.quote_content = quoteContent.trim()
        // Content is still the original post content for reference
        shareData.content = post.content
      } else {
        // Simple share - no quote content needed
        shareData.quote_content = null
        shareData.content = post.content
      }

      // Don't copy images - parent post preview will show text only with link

      const { error } = await supabase
        .from('posts')
        .insert(shareData)

      if (error) throw error

      // Show success notification
      setShowSuccess(true)
      setTimeout(() => {
        setShowSuccess(false)
        onShared()
        onClose()
        setQuoteContent('')
      }, 1500)
    } catch (error) {
      console.error('Error sharing post:', error)
    } finally {
      setSubmitting(false)
    }
  }

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(postUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Error copying link:', error)
    }
  }

  const handleShareToFacebook = () => {
    // Facebook uses Open Graph tags from the URL, no need for text parameter
    const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(postUrl)}`
    window.open(facebookUrl, '_blank', 'width=600,height=400')
  }

  const handleShareToTwitter = () => {
    // Twitter will use Twitter Card meta tags and include the text
    const twitterText = `${shareText}\n\nvia @PlantsPack`
    const twitterUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(postUrl)}&text=${encodeURIComponent(twitterText)}`
    window.open(twitterUrl, '_blank', 'width=600,height=400')
  }

  const handleShareToWhatsApp = () => {
    // WhatsApp needs both text and URL in the message
    const whatsappText = `${shareText}\n\n${postUrl}`
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(whatsappText)}`
    window.open(whatsappUrl, '_blank', 'width=600,height=400')
  }

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        const userName = post.users.first_name
          ? `${post.users.first_name} ${post.users.last_name || ''}`.trim()
          : post.users.username

        await navigator.share({
          title: `${userName} on PlantsPack`,
          text: shareText,
          url: postUrl
        })
      } catch (error) {
        // User cancelled or error occurred
        if ((error as Error).name !== 'AbortError') {
          console.error('Error sharing:', error)
        }
      }
    }
  }

  if (!isOpen || !user) return null

  return (
    <div className="fixed inset-0 flex items-center justify-center p-4 z-50" style={{backgroundColor: 'rgba(0,0,0,0.3)'}}>
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[80vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
            <Share className="h-5 w-5" />
            <span>Share Post</span>
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Social Media Sharing */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-3">Share to social media</h3>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              <button
                onClick={handleCopyLink}
                className="flex flex-col items-center justify-center p-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <LinkIcon className="h-5 w-5 text-gray-600 mb-1" />
                <span className="text-xs text-gray-600">{copied ? 'Copied!' : 'Copy Link'}</span>
              </button>
              <button
                onClick={handleShareToFacebook}
                className="flex flex-col items-center justify-center p-3 border border-gray-300 rounded-lg hover:bg-blue-50 transition-colors"
              >
                <Facebook className="h-5 w-5 text-blue-600 mb-1" />
                <span className="text-xs text-gray-600">Facebook</span>
              </button>
              <button
                onClick={handleShareToTwitter}
                className="flex flex-col items-center justify-center p-3 border border-gray-300 rounded-lg hover:bg-sky-50 transition-colors"
              >
                <Twitter className="h-5 w-5 text-sky-500 mb-1" />
                <span className="text-xs text-gray-600">X (Twitter)</span>
              </button>
              <button
                onClick={handleShareToWhatsApp}
                className="flex flex-col items-center justify-center p-3 border border-gray-300 rounded-lg hover:bg-green-50 transition-colors"
              >
                <MessageCircle className="h-5 w-5 text-green-600 mb-1" />
                <span className="text-xs text-gray-600">WhatsApp</span>
              </button>
              {typeof navigator !== 'undefined' && typeof navigator.share !== 'undefined' && (
                <button
                  onClick={handleNativeShare}
                  className="flex flex-col items-center justify-center p-3 border border-gray-300 rounded-lg hover:bg-purple-50 transition-colors"
                >
                  <Share className="h-5 w-5 text-purple-600 mb-1" />
                  <span className="text-xs text-gray-600">More</span>
                </button>
              )}
            </div>
          </div>

          {/* Share within PlantsPack */}
          <div className="border-t border-gray-200 pt-4">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Share within PlantsPack</h3>

            {/* Share Type Selection */}
            <div className="flex space-x-2 mb-4">
              <button
                onClick={() => setShareType('share')}
                className={`flex items-center space-x-2 px-4 py-2 rounded-md font-medium transition-colors ${
                  shareType === 'share'
                    ? 'bg-green-100 text-green-700 border border-green-300'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Repeat2 className="h-4 w-4" />
                <span>Share</span>
              </button>
              <button
                onClick={() => setShareType('quote')}
                className={`flex items-center space-x-2 px-4 py-2 rounded-md font-medium transition-colors ${
                  shareType === 'quote'
                    ? 'bg-green-100 text-green-700 border border-green-300'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <MessageSquareQuote className="h-4 w-4" />
                <span>Quote</span>
              </button>
            </div>

          {/* Info message about basic mode */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-blue-800 text-sm">
              📝 <strong>Basic sharing mode:</strong> Your {shareType === 'quote' ? 'quote' : 'share'} will be posted as a regular post with attribution. 
              Full quote post features will be available after database migration.
            </p>
          </div>

          {/* Quote Content Input (only for quote posts) */}
          {shareType === 'quote' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Add your thoughts
              </label>
              <textarea
                value={quoteContent}
                onChange={(e) => setQuoteContent(e.target.value)}
                placeholder="What do you think about this post?"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
                rows={3}
                maxLength={500}
              />
              <div className="flex justify-between items-center mt-1">
                <span className={`text-xs ${quoteContent.length > 450 ? 'text-red-500' : 'text-gray-400'}`}>
                  {quoteContent.length}/500
                </span>
              </div>
            </div>
          )}

          {/* Privacy Setting */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Who can see this?
            </label>
            <select
              value={privacy}
              onChange={(e) => setPrivacy(e.target.value as 'public' | 'friends')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              <option value="public">Everyone</option>
              <option value="friends">Friends only</option>
            </select>
          </div>

          {/* Original Post Preview */}
          <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
            <div className="flex space-x-3">
              <div className="flex-shrink-0">
                {post.users.avatar_url ? (
                  <img
                    src={post.users.avatar_url}
                    alt={`${post.users.username}'s avatar`}
                    className="h-10 w-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                    <span className="text-sm font-medium text-green-600">
                      {post.users.first_name?.[0] || post.users.username[0].toUpperCase()}
                    </span>
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2 mb-1">
                  <span className="font-medium text-gray-900">
                    {post.users.first_name 
                      ? `${post.users.first_name} ${post.users.last_name || ''}`.trim()
                      : post.users.username
                    }
                  </span>
                  <span className="text-gray-400">@{post.users.username}</span>
                  <span className="text-gray-400">·</span>
                  <span className="text-gray-400 text-sm">
                    {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                  </span>
                </div>
                <p className="text-gray-700">{post.content}</p>
                {/* Handle both new images array and legacy image_url */}
                {((post.images && post.images.length > 0) || post.image_url) && (
                  <div className="mt-3">
                    <ImageSlider 
                      images={post.images && post.images.length > 0 ? post.images : (post.image_url ? [post.image_url] : [])} 
                      aspectRatio="auto"
                      className="max-w-full"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

            {/* Action Buttons */}
            <div className="flex space-x-3 pt-4">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleShare}
                disabled={submitting}
                className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-md font-medium transition-colors"
              >
                {submitting ? 'Sharing...' : shareType === 'share' ? 'Share Post' : 'Post Quote'}
              </button>
            </div>
          </div>
        </div>

        {/* Success Notification */}
        {showSuccess && (
          <div className="fixed top-20 left-1/2 transform -translate-x-1/2 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg z-[60] flex items-center space-x-2 animate-slide-down">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="font-medium">
              {shareType === 'quote' ? 'Quote posted successfully!' : 'Post shared successfully!'}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}