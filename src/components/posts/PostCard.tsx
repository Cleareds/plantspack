'use client'

import React, { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { Heart, MessageCircle, Share, MoreHorizontal, Globe, Users, Repeat2 } from 'lucide-react'
import { Tables } from '@/lib/supabase'
import { formatDistanceToNow } from 'date-fns'
import FollowButton from '../social/FollowButton'
import Comments from './Comments'
import SharePost from './SharePost'
import ImageSlider from '../ui/ImageSlider'
import LinkPreview, { extractUrls } from './LinkPreview'
import LinkifiedText from '../ui/LinkifiedText'
import Link from 'next/link'

type Post = Tables<'posts'> & {
  users: Tables<'users'>
  post_likes: { id: string; user_id: string }[]
  comments: { id: string }[]
  parent_post?: (Tables<'posts'> & {
    users: Tables<'users'>
  }) | null
}

interface PostCardProps {
  post: Post
  onUpdate?: () => void
}

function PostCard({ post, onUpdate }: PostCardProps) {
  const [isLiked, setIsLiked] = useState(false)
  const [likeCount, setLikeCount] = useState(post.post_likes?.length || 0)
  const commentCount = post.comments?.length || 0
  const [loading, setLoading] = useState(false)
  const [showComments, setShowComments] = useState(false)
  const [showShare, setShowShare] = useState(false)
  const { user } = useAuth()

  useEffect(() => {
    if (user && post.post_likes) {
      setIsLiked(post.post_likes.some(like => like.user_id === user.id))
      setLikeCount(post.post_likes.length)
    } else {
      setIsLiked(false)
      setLikeCount(post.post_likes?.length || 0)
    }
  }, [user, post.post_likes])

  const handleLike = async () => {
    if (!user || loading) return

    setLoading(true)
    try {
      if (isLiked) {
        const { error } = await supabase
          .from('post_likes')
          .delete()
          .eq('post_id', post.id)
          .eq('user_id', user.id)

        if (error) throw error
        setIsLiked(false)
        setLikeCount(prev => prev - 1)
      } else {
        const { error } = await supabase
          .from('post_likes')
          .insert({ post_id: post.id, user_id: user.id })

        if (error) throw error
        setIsLiked(true)
        setLikeCount(prev => prev + 1)
      }
    } catch (error) {
      console.error('Error toggling like:', error)
    } finally {
      setLoading(false)
    }
  }


  const isQuotePost = post.post_type === 'quote'
  const isRepost = post.post_type === 'share'

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-4">
      {/* Repost indicator */}
      {isRepost && (
        <div className="flex items-center space-x-2 text-gray-500 text-sm mb-3">
          <Repeat2 className="h-4 w-4" />
          <span>
            {post.users.first_name 
              ? `${post.users.first_name} ${post.users.last_name || ''}`.trim()
              : post.users.username
            } reposted
          </span>
        </div>
      )}

      {/* Quote post indicator and content */}
      {isQuotePost && post.quote_content && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-3">
              <Link href={`/user/${post.users.username}`} className="flex-shrink-0">
                {post.users.avatar_url ? (
                  <img
                    src={post.users.avatar_url}
                    alt={`${post.users.username}'s avatar`}
                    className="h-10 w-10 rounded-full object-cover hover:ring-2 hover:ring-green-500 hover:ring-offset-1 transition-all"
                  />
                ) : (
                  <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center hover:ring-2 hover:ring-green-500 hover:ring-offset-1 transition-all">
                    <span className="text-green-600 font-medium text-sm">
                      {post.users.first_name?.[0] || post.users.username[0].toUpperCase()}
                    </span>
                  </div>
                )}
              </Link>
              <div>
                <div className="flex items-center space-x-2">
                  <Link href={`/user/${post.users.username}`}>
                    <h3 className="font-medium text-gray-900 hover:text-green-600 transition-colors">
                      {post.users.first_name && post.users.last_name
                        ? `${post.users.first_name} ${post.users.last_name}`
                        : post.users.username}
                    </h3>
                  </Link>
                  <span className="text-gray-500">•</span>
                  <span className="text-gray-500 text-sm">
                    {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <Link href={`/user/${post.users.username}`}>
                    <span className="text-gray-500 text-xs hover:text-green-600 transition-colors">@{post.users.username}</span>
                  </Link>
                  {post.privacy === 'public' ? (
                    <Globe className="h-3 w-3 text-gray-400" />
                  ) : (
                    <Users className="h-3 w-3 text-gray-400" />
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <FollowButton userId={post.users.id} />
              <button className="text-gray-400 hover:text-gray-600">
                <MoreHorizontal className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Quote author's commentary */}
          <div className="mb-3">
            <LinkifiedText 
              text={post.quote_content} 
              className="text-gray-800 whitespace-pre-wrap" 
            />
          </div>
        </div>
      )}

      {/* Original post content */}
      <div className={`${isQuotePost ? 'border border-gray-200 rounded-lg p-3 bg-gray-50' : ''}`}>
        {/* Header for original post or non-quote posts */}
        {!isQuotePost && (
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-3">
              <Link href={`/user/${post.users.username}`} className="flex-shrink-0">
                {post.users.avatar_url ? (
                  <img
                    src={post.users.avatar_url}
                    alt={`${post.users.username}'s avatar`}
                    className="h-10 w-10 rounded-full object-cover hover:ring-2 hover:ring-green-500 hover:ring-offset-1 transition-all"
                  />
                ) : (
                  <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center hover:ring-2 hover:ring-green-500 hover:ring-offset-1 transition-all">
                    <span className="text-green-600 font-medium text-sm">
                      {post.users.first_name?.[0] || post.users.username[0].toUpperCase()}
                    </span>
                  </div>
                )}
              </Link>
              <div>
                <div className="flex items-center space-x-2">
                  <Link href={`/user/${post.users.username}`}>
                    <h3 className="font-medium text-gray-900 hover:text-green-600 transition-colors">
                      {post.users.first_name && post.users.last_name
                        ? `${post.users.first_name} ${post.users.last_name}`
                        : post.users.username}
                    </h3>
                  </Link>
                  <span className="text-gray-500">•</span>
                  <span className="text-gray-500 text-sm">
                    {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <Link href={`/user/${post.users.username}`}>
                    <span className="text-gray-500 text-xs hover:text-green-600 transition-colors">@{post.users.username}</span>
                  </Link>
                  {post.privacy === 'public' ? (
                    <Globe className="h-3 w-3 text-gray-400" />
                  ) : (
                    <Users className="h-3 w-3 text-gray-400" />
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <FollowButton userId={post.users.id} />
              <button className="text-gray-400 hover:text-gray-600">
                <MoreHorizontal className="h-5 w-5" />
              </button>
            </div>
          </div>
        )}

        {/* Content */}
        <div className={isQuotePost ? 'mb-2' : 'mb-4'}>
          <LinkifiedText 
            text={post.content} 
            className="text-gray-800 whitespace-pre-wrap" 
          />
          {/* Handle both new images array and legacy image_url */}
          {(() => {
            const imagesToShow = post.images && post.images.length > 0 
              ? post.images 
              : (post.image_url ? [post.image_url] : [])
              
            return imagesToShow.length > 0 ? (
              <div className="mt-3">
                <ImageSlider 
                  images={imagesToShow} 
                  aspectRatio="auto"
                  className="max-w-full"
                />
              </div>
            ) : null
          })()}
          
          {/* Link Preview */}
          {(() => {
            const urls = extractUrls(post.content)
            return urls.length > 0 ? (
              <div className="mt-3">
                <LinkPreview
                  url={urls[0]}
                  className="max-w-full"
                />
              </div>
            ) : null
          })()}
        </div>

        {/* Quote post author info (for the quoted post) */}
        {isQuotePost && (
          <div className="text-xs text-gray-500">
            {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
          </div>
        )}
      </div>

      {/* Actions */}
      {!isQuotePost && (
        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
          <div className="flex items-center space-x-4">
            <button
              onClick={handleLike}
              disabled={loading}
              className={`flex items-center space-x-1 px-2 py-1 rounded-md transition-colors ${
                isLiked
                  ? 'text-red-600 bg-red-50 hover:bg-red-100'
                  : 'text-gray-500 hover:text-red-600 hover:bg-red-50'
              }`}
            >
              <Heart className={`h-5 w-5 ${isLiked ? 'fill-current' : ''}`} />
              <span className="text-sm">{likeCount}</span>
            </button>
            
            <button
              onClick={() => setShowComments(true)}
              className="flex items-center space-x-1 px-2 py-1 rounded-md text-gray-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
            >
              <MessageCircle className="h-5 w-5" />
              <span className="text-sm">{commentCount}</span>
            </button>
            
            {user && (
              <button
                onClick={() => setShowShare(true)}
                className="flex items-center space-x-1 px-2 py-1 rounded-md text-gray-500 hover:text-green-600 hover:bg-green-50 transition-colors"
              >
                <Share className="h-5 w-5" />
                <span className="text-sm">Share</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Comments Modal */}
      {showComments && (
        <Comments
          postId={post.id}
          isOpen={showComments}
          onClose={() => setShowComments(false)}
        />
      )}

      {/* Share Modal */}
      <SharePost
        post={post}
        isOpen={showShare}
        onClose={() => setShowShare(false)}
        onShared={() => onUpdate?.()}
      />
    </div>
  )
}

export default React.memo(PostCard)