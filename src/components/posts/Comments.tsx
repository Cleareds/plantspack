'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { Tables } from '@/lib/supabase'
import { formatDistanceToNow } from 'date-fns'
import { MessageCircle, Send, Heart } from 'lucide-react'
import FollowButton from '../social/FollowButton'

type Comment = Tables<'comments'> & {
  users: Tables<'users'>
}

interface CommentsProps {
  postId: string
  isOpen: boolean
  onClose: () => void
}

function Comments({ postId, isOpen, onClose }: CommentsProps) {
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)
  const [newComment, setNewComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const { user, profile } = useAuth()

  const fetchComments = useCallback(async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('comments')
        .select(`
          *,
          users (
            id,
            username,
            first_name,
            last_name,
            avatar_url
          )
        `)
        .eq('post_id', postId)
        .order('created_at', { ascending: true })

      if (error) throw error
      
      // Deduplicate comments by ID to prevent React key errors
      const uniqueComments = (data || []).reduce((acc: Comment[], current) => {
        const existingIndex = acc.findIndex(comment => comment.id === current.id)
        if (existingIndex === -1) {
          acc.push(current)
        }
        return acc
      }, [])
      
      setComments(uniqueComments)
    } catch (error) {
      console.error('Error fetching comments:', error)
      setComments([]) // Reset to empty array on error
    } finally {
      setLoading(false)
    }
  }, [postId])

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !newComment.trim() || submitting) return

    const commentContent = newComment.trim()
    setNewComment('') // Clear immediately to prevent double submissions
    setSubmitting(true)

    try {
      const { data, error } = await supabase
        .from('comments')
        .insert({
          post_id: postId,
          user_id: user.id,
          content: commentContent
        })
        .select(`
          *,
          users (
            id,
            username,
            first_name,
            last_name,
            avatar_url
          )
        `)
        .single()

      if (error) throw error

      // Add the new comment to the existing list instead of refetching all
      if (data) {
        setComments(prevComments => [...prevComments, data])
      }
    } catch (error) {
      console.error('Error submitting comment:', error)
      setNewComment(commentContent) // Restore comment on error
    } finally {
      setSubmitting(false)
    }
  }

  useEffect(() => {
    if (isOpen) {
      fetchComments()
    }
  }, [isOpen, fetchComments])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
            <MessageCircle className="h-5 w-5" />
            <span>Comments ({comments.length})</span>
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl"
          >
            ×
          </button>
        </div>

        {/* Comments List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {loading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="flex space-x-3">
                    <div className="h-8 w-8 bg-gray-300 rounded-full"></div>
                    <div className="flex-1">
                      <div className="h-4 bg-gray-300 rounded w-1/4 mb-2"></div>
                      <div className="h-4 bg-gray-300 rounded w-3/4"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : comments.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No comments yet. Be the first to comment!
            </div>
          ) : (
            comments
              .filter((comment, index, array) => 
                // Additional deduplication filter to ensure unique keys
                array.findIndex(c => c.id === comment.id) === index
              )
              .map((comment, index) => {
                // Use fallback key in case of missing ID
                const key = comment.id || `comment-${index}-${comment.created_at}`
                
                return (
                  <div key={key} className="flex space-x-3">
                    <div className="flex-shrink-0">
                      {comment.users?.avatar_url ? (
                        <img
                          src={comment.users.avatar_url}
                          alt={`${comment.users.username}'s avatar`}
                          className="h-8 w-8 rounded-full object-cover"
                        />
                      ) : (
                        <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
                          <span className="text-sm font-medium text-green-600">
                            {comment.users?.first_name?.[0] || comment.users?.username?.[0]?.toUpperCase() || '?'}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="font-medium text-gray-900">
                          {comment.users?.first_name 
                            ? `${comment.users.first_name} ${comment.users.last_name || ''}`.trim()
                            : comment.users?.username || 'Unknown User'
                          }
                        </span>
                        <span className="text-gray-400">@{comment.users?.username || 'unknown'}</span>
                        <span className="text-gray-400">·</span>
                        <span className="text-gray-400 text-sm">
                          {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                        </span>
                        {comment.users?.id && (
                          <FollowButton userId={comment.users.id} showText={false} className="ml-auto" />
                        )}
                      </div>
                      <p className="text-gray-700 text-sm">{comment.content}</p>
                    </div>
                  </div>
                )
              })
          )}
        </div>

        {/* Comment Input */}
        {user && (
          <div className="border-t border-gray-200 p-4">
            <form onSubmit={handleSubmitComment} className="flex space-x-3">
              <div className="flex-shrink-0">
                {profile?.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt="Your avatar"
                    className="h-8 w-8 rounded-full object-cover"
                  />
                ) : (
                  <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
                    <span className="text-sm font-medium text-green-600">
                      {profile?.first_name?.[0] || profile?.username?.[0]?.toUpperCase() || 'U'}
                    </span>
                  </div>
                )}
              </div>
              <div className="flex-1">
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Write a comment..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
                  rows={2}
                  maxLength={280}
                />
                <div className="flex items-center justify-between mt-2">
                  <span className={`text-xs ${newComment.length > 250 ? 'text-red-500' : 'text-gray-400'}`}>
                    {newComment.length}/280
                  </span>
                  <button
                    type="submit"
                    disabled={!newComment.trim() || submitting}
                    className="flex items-center space-x-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                  >
                    <Send className="h-4 w-4" />
                    <span>{submitting ? 'Posting...' : 'Comment'}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}

export default React.memo(Comments)