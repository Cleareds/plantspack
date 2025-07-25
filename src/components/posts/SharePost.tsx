'use client'

import { useState } from 'react'
import { useAuth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { Tables } from '@/lib/supabase'
import { Share, MessageSquareQuote, Repeat2, X } from 'lucide-react'
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
  const { user } = useAuth()

  const handleShare = async () => {
    if (!user || submitting) return

    try {
      setSubmitting(true)

      // Create share content based on type
      let shareContent = ''
      
      if (shareType === 'quote' && quoteContent.trim()) {
        // Quote post format
        shareContent = `${quoteContent.trim()}\n\n📝 Quoting @${post.users.username}:\n"${post.content}"`
      } else {
        // Simple share format
        shareContent = `🔄 Shared from @${post.users.username}:\n\n${post.content}`
      }

      // Create base share data that works with current database schema
      const shareData: any = {
        user_id: user.id,
        content: shareContent,
        privacy
      }

      // Add image if the original post has one (backward compatibility)
      if (post.images && post.images.length > 0) {
        shareData.image_url = post.images[0] // Use first image for backward compatibility
      } else if (post.image_url) {
        shareData.image_url = post.image_url
      }

      const { error } = await supabase
        .from('posts')
        .insert(shareData)

      if (error) throw error

      onShared()
      onClose()
      setQuoteContent('')
    } catch (error) {
      console.error('Error sharing post:', error)
    } finally {
      setSubmitting(false)
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
          {/* Share Type Selection */}
          <div className="flex space-x-2">
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
    </div>
  )
}