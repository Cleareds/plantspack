'use client'

import React, { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useAuth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { Tables } from '@/lib/supabase'
import { formatDistanceToNow } from 'date-fns'
import { MessageCircle, Send, Pencil, Trash2, Reply, X } from 'lucide-react'
import FollowButton from '../social/FollowButton'
import ReportButton from '../moderation/ReportButton'
import CommentReactions from '../reactions/CommentReactions'
import LinkifiedText from '../ui/LinkifiedText'

type Comment = Tables<'comments'> & {
  users: Tables<'users'>
  parent_comment_id?: string | null
  deleted_at?: string | null
  edited_at?: string | null
}

interface CommentsProps {
  postId: string
  isOpen: boolean
  onClose: () => void
  embedded?: boolean
}

function Comments({ postId, isOpen, onClose, embedded = false }: CommentsProps) {
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [page, setPage] = useState(0)
  const [newComment, setNewComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [blockedUserIds, setBlockedUserIds] = useState<string[]>([])
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null)
  const [replyingToComment, setReplyingToComment] = useState<Comment | null>(null)
  const { user, profile } = useAuth()

  const COMMENTS_PER_PAGE = 20

  // Fetch blocked users
  useEffect(() => {
    const fetchBlockedUsers = async () => {
      if (!user) {
        setBlockedUserIds([])
        return
      }

      try {
        const { data, error } = await supabase
          .from('user_blocks')
          .select('blocked_id')
          .eq('blocker_id', user.id)

        if (error) throw error

        setBlockedUserIds(data?.map(b => b.blocked_id) || [])
      } catch (error) {
        console.error('Error fetching blocked users:', error)
        setBlockedUserIds([])
      }
    }

    fetchBlockedUsers()
  }, [user])

  const fetchComments = useCallback(async (pageNumber: number = 0, append: boolean = false) => {
    try {
      if (!append) {
        setLoading(true)
      } else {
        setLoadingMore(true)
      }

      const offset = pageNumber * COMMENTS_PER_PAGE

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
        .order('created_at', { ascending: false }) // Newest first
        .range(offset, offset + COMMENTS_PER_PAGE - 1)

      if (error) throw error

      // Deduplicate comments by ID to prevent React key errors
      const uniqueComments = (data || []).reduce((acc: Comment[], current) => {
        const existingIndex = acc.findIndex(comment => comment.id === current.id)
        if (existingIndex === -1) {
          acc.push(current)
        }
        return acc
      }, [])

      // Check if there are more comments to load
      setHasMore(uniqueComments.length === COMMENTS_PER_PAGE)

      if (append) {
        setComments(prev => [...prev, ...uniqueComments])
      } else {
        setComments(uniqueComments)
      }
    } catch (error) {
      console.error('Error fetching comments:', error)
      if (!append) {
        setComments([]) // Reset to empty array on error
      }
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [postId])

  const loadMoreComments = () => {
    const nextPage = page + 1
    setPage(nextPage)
    fetchComments(nextPage, true)
  }

  // Edit comment handler
  const handleEditComment = async (commentId: string) => {
    if (!user || !editContent.trim()) return

    try {
      const { error } = await supabase
        .from('comments')
        .update({ content: editContent.trim() })
        .eq('id', commentId)
        .eq('user_id', user.id)

      if (error) throw error

      setComments(prev => prev.map(c =>
        c.id === commentId ? { ...c, content: editContent.trim(), edited_at: new Date().toISOString() } : c
      ))
      setEditingCommentId(null)
      setEditContent('')
    } catch (error) {
      console.error('Error editing comment:', error)
      alert('Failed to edit comment. Please try again.')
    }
  }

  // Soft-delete comment handler
  const handleDeleteComment = async (commentId: string) => {
    if (!user) return

    try {
      const { error } = await supabase
        .from('comments')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', commentId)
        .eq('user_id', user.id)

      if (error) throw error

      setComments(prev => prev.map(c =>
        c.id === commentId ? { ...c, deleted_at: new Date().toISOString() } : c
      ))
      setDeletingCommentId(null)
    } catch (error) {
      console.error('Error deleting comment:', error)
      alert('Failed to delete comment. Please try again.')
    }
  }

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !newComment.trim() || submitting) return

    // Check if user is banned
    if (profile?.is_banned) {
      alert('Your account has been suspended and cannot create comments')
      return
    }

    const commentContent = newComment.trim()
    setNewComment('') // Clear immediately to prevent double submissions
    setSubmitting(true)

    try {
      // Check rate limit before creating comment (max 30 comments per 5 minutes)
      const { data: rateLimitData, error: rateLimitError } = await supabase
        .rpc('check_rate_limit', {
          p_user_id: user.id,
          p_action_type: 'comment',
          p_max_actions: 30,
          p_window_minutes: 5
        })

      if (rateLimitError) {
        console.error('Rate limit check error:', rateLimitError)
        // Continue anyway if rate limit check fails
      } else if (rateLimitData === false) {
        setNewComment(commentContent) // Restore comment
        throw new Error('Rate limit exceeded. Please wait before commenting again.')
      }

      const insertData: Record<string, unknown> = {
        post_id: postId,
        user_id: user.id,
        content: commentContent,
      }

      // Add parent_comment_id if replying
      if (replyingToComment) {
        // If the comment we're replying to is itself a reply, use its parent
        // (flatten to 1 level of nesting)
        insertData.parent_comment_id = replyingToComment.parent_comment_id || replyingToComment.id
      }

      const { data, error } = await supabase
        .from('comments')
        .insert(insertData)
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

      // Add the new comment at the beginning (newest first) or after parent
      if (data) {
        setComments(prevComments => [data, ...prevComments])
        setReplyingToComment(null)

        // Create notification for post author
        try {
          // Fetch post to get author's user_id
          const { data: postData } = await supabase
            .from('posts')
            .select('user_id')
            .eq('id', postId)
            .single()

          if (postData && postData.user_id !== user.id) {
            await fetch('/api/notifications/create', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                userId: postData.user_id,
                type: 'comment',
                entityType: 'post',
                entityId: postId,
              }),
            })
          }
        } catch (notifError) {
          // Don't fail the comment if notification fails
          console.error('Failed to create notification:', notifError)
        }
      }
    } catch (error) {
      console.error('Error submitting comment:', error)
      setNewComment(commentContent) // Restore comment on error
      alert(error instanceof Error ? error.message : 'Failed to submit comment. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  useEffect(() => {
    if (isOpen) {
      setPage(0)
      setHasMore(true)
      fetchComments(0, false)
    }
  }, [isOpen, fetchComments])

  if (!isOpen) return null

  // Organize comments into threads: top-level + replies grouped under parent
  const visibleComments = comments
    .filter((comment, index, array) => array.findIndex(c => c.id === comment.id) === index)
    .filter(comment => !blockedUserIds.includes(comment.user_id))

  const topLevelComments = visibleComments.filter(c => !c.parent_comment_id)
  const repliesByParent: Record<string, Comment[]> = {}
  visibleComments.filter(c => c.parent_comment_id).forEach(c => {
    const parentId = c.parent_comment_id!
    if (!repliesByParent[parentId]) repliesByParent[parentId] = []
    repliesByParent[parentId].push(c)
  })
  // Sort replies oldest-first within each parent
  Object.values(repliesByParent).forEach(arr => arr.sort((a, b) =>
    new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  ))

  // Render a single comment (used in both embedded and modal views)
  const renderComment = (comment: Comment, index: number, isReply: boolean = false) => {
    const key = comment.id || `comment-${index}-${comment.created_at}`
    const isDeleted = !!comment.deleted_at
    const isEditing = editingCommentId === comment.id
    const isConfirmingDelete = deletingCommentId === comment.id
    const isOwner = user && comment.user_id === user.id

    if (isDeleted) {
      return (
        <div key={key} className={`flex space-x-3 ${isReply ? 'ml-8' : ''} ${embedded ? 'p-4 border border-surface-container rounded-lg' : ''}`}>
          <div className="flex-1">
            <p className="text-outline text-sm italic">[Comment deleted]</p>
          </div>
        </div>
      )
    }

    return (
      <div key={key} className={`flex space-x-3 ${isReply ? 'ml-8' : ''} ${embedded ? 'p-4 border border-surface-container rounded-lg' : ''}`}>
        <div className="flex-shrink-0">
          {comment.users?.avatar_url ? (
            <img
              src={comment.users.avatar_url}
              alt={`${comment.users.username}'s avatar`}
              className="h-8 w-8 rounded-full object-cover"
            />
          ) : (
            <div className="h-8 w-8 rounded-full bg-primary-container/30 flex items-center justify-center">
              <span className="text-sm font-medium text-primary">
                {comment.users?.first_name?.[0] || comment.users?.username?.[0]?.toUpperCase() || '?'}
              </span>
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2 mb-1">
            {embedded ? (
              <>
                <Link
                  href={`/user/${comment.users?.username || 'unknown'}`}
                  className="font-medium text-on-surface hover:text-primary transition-colors"
                >
                  {comment.users?.first_name
                    ? `${comment.users.first_name} ${comment.users.last_name || ''}`.trim()
                    : comment.users?.username || 'Unknown User'
                  }
                </Link>
                <Link
                  href={`/user/${comment.users?.username || 'unknown'}`}
                  className="text-outline hover:text-primary transition-colors"
                >
                  @{comment.users?.username || 'unknown'}
                </Link>
              </>
            ) : (
              <>
                <span className="font-medium text-on-surface">
                  {comment.users?.first_name
                    ? `${comment.users.first_name} ${comment.users.last_name || ''}`.trim()
                    : comment.users?.username || 'Unknown User'
                  }
                </span>
                <span className="text-outline">@{comment.users?.username || 'unknown'}</span>
              </>
            )}
          </div>
          <div className="flex items-center space-x-2 mb-1">
            <span className="text-outline text-sm">
              {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
            </span>
            {comment.edited_at && (
              <span className="text-outline text-xs">(edited)</span>
            )}
            {comment.users?.id && (
              <FollowButton userId={comment.users.id} showText={false} className="ml-auto" />
            )}
            {user && comment.user_id !== user.id && (
              <ReportButton
                reportedType="comment"
                reportedId={comment.id}
              />
            )}
            {/* Edit/Delete buttons for own comments */}
            {isOwner && !isEditing && (
              <>
                <button
                  onClick={() => {
                    setEditingCommentId(comment.id)
                    setEditContent(comment.content)
                  }}
                  className="p-1 text-outline hover:text-primary transition-colors rounded"
                  title="Edit comment"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => setDeletingCommentId(comment.id)}
                  className="p-1 text-outline hover:text-error transition-colors rounded"
                  title="Delete comment"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </>
            )}
          </div>

          {/* Edit mode */}
          {isEditing ? (
            <div className="mb-2">
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="w-full px-3 py-2 border border-outline-variant rounded-md focus:ring-2 focus:ring-primary focus:border-transparent resize-none text-sm"
                rows={2}
                maxLength={500}
              />
              <div className="flex items-center space-x-2 mt-1">
                <button
                  onClick={() => handleEditComment(comment.id)}
                  disabled={!editContent.trim()}
                  className="px-3 py-1 text-xs font-medium bg-primary text-white rounded-md hover:opacity-90 disabled:opacity-50 transition-colors"
                >
                  Save
                </button>
                <button
                  onClick={() => { setEditingCommentId(null); setEditContent('') }}
                  className="px-3 py-1 text-xs font-medium text-outline hover:text-on-surface transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <p className="text-on-surface-variant text-sm mb-2 whitespace-pre-wrap">
              <LinkifiedText text={comment.content} />
            </p>
          )}

          {/* Delete confirmation */}
          {isConfirmingDelete && (
            <div className="flex items-center space-x-2 mb-2 p-2 bg-error/10 rounded-md">
              <span className="text-xs text-error">Delete this comment?</span>
              <button
                onClick={() => handleDeleteComment(comment.id)}
                className="px-2 py-0.5 text-xs font-medium bg-error text-white rounded hover:opacity-90 transition-colors"
              >
                Delete
              </button>
              <button
                onClick={() => setDeletingCommentId(null)}
                className="px-2 py-0.5 text-xs font-medium text-outline hover:text-on-surface transition-colors"
              >
                Cancel
              </button>
            </div>
          )}

          <div className="flex items-center space-x-2">
            <CommentReactions commentId={comment.id} />
            {/* Reply button */}
            {user && (
              <button
                onClick={() => {
                  setReplyingToComment(comment)
                  setNewComment(`@${comment.users?.username || 'unknown'} `)
                }}
                className="flex items-center space-x-1 p-1 text-outline hover:text-primary transition-colors rounded text-xs"
              >
                <Reply className="h-3.5 w-3.5" />
                <span>Reply</span>
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Render threaded comments list
  const renderCommentsList = () => {
    if (loading) {
      return (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="flex space-x-3">
                <div className="h-8 w-8 bg-surface-container-highest rounded-full"></div>
                <div className="flex-1">
                  <div className="h-4 bg-surface-container-highest rounded w-1/4 mb-2"></div>
                  <div className="h-4 bg-surface-container-highest rounded w-3/4"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )
    }

    if (comments.length === 0) {
      return (
        <div className="text-center py-8 text-outline">
          No comments yet. Be the first to comment!
        </div>
      )
    }

    return (
      <>
        {topLevelComments.map((comment, index) => (
          <React.Fragment key={comment.id || `comment-${index}`}>
            {renderComment(comment, index, false)}
            {/* Render replies indented */}
            {repliesByParent[comment.id]?.map((reply, rIndex) =>
              renderComment(reply, rIndex, true)
            )}
          </React.Fragment>
        ))}
        {/* Also render replies whose parents haven't loaded yet (orphan replies) */}
        {visibleComments
          .filter(c => c.parent_comment_id && !topLevelComments.find(tc => tc.id === c.parent_comment_id))
          .map((comment, index) => renderComment(comment, index, true))
        }
      </>
    )
  }

  // Comment input form (shared between embedded and modal)
  const renderCommentInput = () => {
    if (!user) return null

    return (
      <div className={embedded ? 'border-t border-surface-container-high pt-4' : 'border-t border-surface-container-high p-4'}>
        {/* Reply indicator */}
        {replyingToComment && (
          <div className="flex items-center justify-between mb-2 px-2 py-1 bg-surface-container-low rounded-md text-xs text-outline">
            <span>Replying to @{replyingToComment.users?.username || 'unknown'}</span>
            <button
              onClick={() => { setReplyingToComment(null); setNewComment('') }}
              className="p-0.5 hover:text-on-surface transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
        <form onSubmit={handleSubmitComment} className="flex space-x-3">
          <div className="flex-shrink-0">
            {profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt="Your avatar"
                className="h-8 w-8 rounded-full object-cover"
              />
            ) : (
              <div className="h-8 w-8 rounded-full bg-primary-container/30 flex items-center justify-center">
                <span className="text-sm font-medium text-primary">
                  {profile?.first_name?.[0] || profile?.username?.[0]?.toUpperCase() || 'U'}
                </span>
              </div>
            )}
          </div>
          <div className="flex-1">
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder={replyingToComment ? `Reply to @${replyingToComment.users?.username || 'unknown'}...` : 'Write a comment...'}
              className="w-full px-3 py-2 border border-outline-variant rounded-md focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
              rows={2}
              maxLength={500}
            />
            <div className="flex items-center justify-between mt-2">
              <span className={`text-xs ${newComment.length > 450 ? 'text-red-500' : 'text-outline'}`}>
                {newComment.length}/500
              </span>
              <button
                type="submit"
                disabled={!newComment.trim() || submitting}
                className="flex items-center space-x-1 bg-primary hover:bg-primary disabled:bg-outline-variant text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
              >
                <Send className="h-4 w-4" />
                <span>{submitting ? 'Posting...' : replyingToComment ? 'Reply' : 'Comment'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    )
  }

  // Embedded version (for dedicated post page)
  if (embedded) {
    return (
      <div className="space-y-4">
        {/* Comments List */}
        <div className="space-y-4">
          {renderCommentsList()}

          {/* Load More Button */}
          {!loading && hasMore && comments.length > 0 && (
            <div className="flex justify-center pt-4">
              <button
                onClick={loadMoreComments}
                disabled={loadingMore}
                className="px-4 py-2 text-sm font-medium text-primary hover:text-primary hover:bg-primary-container/20 rounded-md transition-colors disabled:opacity-50"
              >
                {loadingMore ? 'Loading...' : 'Load more comments'}
              </button>
            </div>
          )}
        </div>

        {/* Comment Input */}
        {renderCommentInput()}
      </div>
    )
  }

  // Modal version (original)
  return (
    <div className="fixed inset-0 flex items-center justify-center p-4 z-50" style={{backgroundColor: 'rgba(0,0,0,0.3)'}}>
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-surface-container-high">
          <h2 className="text-lg font-semibold text-on-surface flex items-center space-x-2">
            <MessageCircle className="h-5 w-5" />
            <span>Comments ({comments.length})</span>
          </h2>
          <button
            onClick={onClose}
            className="text-outline hover:text-on-surface-variant text-xl"
          >
            ×
          </button>
        </div>

        {/* Comments List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {renderCommentsList()}

          {/* Load More Button */}
          {!loading && hasMore && comments.length > 0 && (
            <div className="flex justify-center pt-4">
              <button
                onClick={loadMoreComments}
                disabled={loadingMore}
                className="px-4 py-2 text-sm font-medium text-primary hover:text-primary hover:bg-primary-container/20 rounded-md transition-colors disabled:opacity-50"
              >
                {loadingMore ? 'Loading...' : 'Load more comments'}
              </button>
            </div>
          )}
        </div>

        {/* Comment Input */}
        {renderCommentInput()}
      </div>
    </div>
  )
}

export default React.memo(Comments)
