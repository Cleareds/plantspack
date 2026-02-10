'use client'

import React, { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useAuth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { formatDistanceToNow } from 'date-fns'
import { Star, Send, Edit2, Trash2 } from 'lucide-react'
import FollowButton from '../social/FollowButton'
import ReportButton from '../moderation/ReportButton'
import ReviewReactions from '../reactions/ReviewReactions'
import StarRating from './StarRating'

type Review = {
  id: string
  place_id: string
  user_id: string
  rating: number
  content: string
  deleted_at: string | null
  edited_at: string | null
  edit_count: number
  created_at: string
  updated_at: string
  users: {
    id: string
    username: string
    first_name: string | null
    last_name: string | null
    avatar_url: string | null
  }
}

interface PlaceReviewsProps {
  placeId: string
}

export default function PlaceReviews({ placeId }: PlaceReviewsProps) {
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [page, setPage] = useState(0)
  const [newRating, setNewRating] = useState(0)
  const [newContent, setNewContent] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [editingReviewId, setEditingReviewId] = useState<string | null>(null)
  const [blockedUserIds, setBlockedUserIds] = useState<string[]>([])
  const [userReview, setUserReview] = useState<Review | null>(null)
  const { user, profile } = useAuth()

  const REVIEWS_PER_PAGE = 20

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
        setBlockedUserIds([])
      }
    }

    fetchBlockedUsers()
  }, [user])

  const fetchReviews = useCallback(async (pageNumber: number = 0, append: boolean = false) => {
    try {
      if (!append) {
        setLoading(true)
      } else {
        setLoadingMore(true)
      }

      const offset = pageNumber * REVIEWS_PER_PAGE

      const { data, error } = await supabase
        .from('place_reviews')
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
        .eq('place_id', placeId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .range(offset, offset + REVIEWS_PER_PAGE - 1)

      if (error) throw error

      const uniqueReviews = (data || []).reduce((acc: Review[], current) => {
        const existingIndex = acc.findIndex(review => review.id === current.id)
        if (existingIndex === -1) {
          acc.push(current as Review)
        }
        return acc
      }, [])

      setHasMore(uniqueReviews.length === REVIEWS_PER_PAGE)

      if (append) {
        setReviews(prev => [...prev, ...uniqueReviews])
      } else {
        setReviews(uniqueReviews)

        // Find user's review if it exists
        if (user) {
          const myReview = uniqueReviews.find(r => r.user_id === user.id)
          setUserReview(myReview || null)
        }
      }
    } catch (error) {
      if (!append) {
        setReviews([])
      }
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [placeId, user])

  const loadMoreReviews = () => {
    const nextPage = page + 1
    setPage(nextPage)
    fetchReviews(nextPage, true)
  }

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !newContent.trim() || newRating === 0 || submitting) return

    if (profile?.is_banned) {
      alert('Your account has been suspended and cannot create reviews')
      return
    }

    const reviewContent = newContent.trim()
    const reviewRating = newRating
    setNewContent('')
    setNewRating(0)
    setSubmitting(true)

    try {
      const { data: rateLimitData, error: rateLimitError } = await supabase
        .rpc('check_rate_limit', {
          p_user_id: user.id,
          p_action_type: 'review',
          p_max_actions: 30,
          p_window_minutes: 5
        })

      if (rateLimitError) {
        console.error('Rate limit check error:', rateLimitError)
      } else if (rateLimitData === false) {
        setNewContent(reviewContent)
        setNewRating(reviewRating)
        throw new Error('Rate limit exceeded. Please wait before reviewing again.')
      }

      const response = await fetch(`/api/places/${placeId}/reviews`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          rating: reviewRating,
          content: reviewContent
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to submit review')
      }

      const { review, updated } = await response.json()

      if (updated) {
        // Update existing review in list
        setReviews(prev => prev.map(r => r.id === review.id ? review : r))
        setUserReview(review)
      } else {
        // Add new review at the beginning
        setReviews(prev => [review, ...prev])
        setUserReview(review)
      }

      setEditingReviewId(null)
    } catch (error) {
      setNewContent(reviewContent)
      setNewRating(reviewRating)
      alert(error instanceof Error ? error.message : 'Failed to submit review. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleEditReview = (review: Review) => {
    setEditingReviewId(review.id)
    setNewRating(review.rating)
    setNewContent(review.content)
  }

  const handleCancelEdit = () => {
    setEditingReviewId(null)
    setNewRating(0)
    setNewContent('')
  }

  const handleDeleteReview = async (reviewId: string) => {
    if (!confirm('Are you sure you want to delete this review?')) return

    try {
      const response = await fetch(`/api/places/${placeId}/reviews`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete review')
      }

      setReviews(prev => prev.filter(r => r.id !== reviewId))
      setUserReview(null)
    } catch (error) {
      alert('Failed to delete review. Please try again.')
    }
  }

  useEffect(() => {
    setPage(0)
    setHasMore(true)
    fetchReviews(0, false)
  }, [fetchReviews])

  return (
    <div className="space-y-6">
      {/* Review Form */}
      {!user ? (
        <div className="border border-gray-200 rounded-lg p-6 bg-gray-50 text-center">
          <p className="text-gray-700 mb-4">
            Sign in to leave a review and share your experience with the community
          </p>
          <Link
            href="/auth"
            className="inline-flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 font-medium transition-colors"
          >
            Sign In to Review
          </Link>
        </div>
      ) : (
        <div className="border border-gray-200 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {editingReviewId ? 'Edit Your Review' : userReview ? 'Update Your Review' : 'Write a Review'}
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            You can only leave one review per place. Submitting a new review will replace your previous one.
          </p>
          <form onSubmit={handleSubmitReview} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Rating
              </label>
              <StarRating
                rating={newRating}
                editable
                onChange={setNewRating}
                size="lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Review
              </label>
              <textarea
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                placeholder="Share your experience..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
                rows={4}
                maxLength={500}
              />
              <div className="flex items-center justify-between mt-2">
                <span className={`text-xs ${newContent.length > 450 ? 'text-red-500' : 'text-gray-400'}`}>
                  {newContent.length}/500
                </span>
                <div className="flex gap-2">
                  {editingReviewId && (
                    <button
                      type="button"
                      onClick={handleCancelEdit}
                      className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                    >
                      Cancel
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={!newContent.trim() || newRating === 0 || submitting}
                    className="flex items-center space-x-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                  >
                    <Send className="h-4 w-4" />
                    <span>{submitting ? 'Submitting...' : editingReviewId ? 'Update' : 'Submit'}</span>
                  </button>
                </div>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Reviews List */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">
          Reviews ({reviews.length})
        </h3>

        {loading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse border border-gray-100 rounded-lg p-4">
                <div className="flex space-x-3">
                  <div className="h-10 w-10 bg-gray-300 rounded-full"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-gray-300 rounded w-1/4 mb-2"></div>
                    <div className="h-4 bg-gray-300 rounded w-3/4 mb-2"></div>
                    <div className="h-4 bg-gray-300 rounded w-full"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : reviews.length === 0 ? (
          <div className="text-center py-8 text-gray-500 border border-gray-100 rounded-lg">
            No reviews yet. Be the first to review!
          </div>
        ) : (
          reviews
            .filter((review, index, array) =>
              array.findIndex(r => r.id === review.id) === index
            )
            .filter(review => !blockedUserIds.includes(review.user_id))
            .map((review, index) => {
              const key = review.id || `review-${index}-${review.created_at}`

              return (
                <div key={key} className="border border-gray-100 rounded-lg p-4">
                  <div className="flex space-x-3">
                    <div className="flex-shrink-0">
                      {review.users?.avatar_url ? (
                        <img
                          src={review.users.avatar_url}
                          alt={`${review.users.username}'s avatar`}
                          className="h-10 w-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                          <span className="text-sm font-medium text-green-600">
                            {review.users?.first_name?.[0] || review.users?.username?.[0]?.toUpperCase() || '?'}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <Link
                            href={`/profile/${review.users?.username || 'unknown'}`}
                            className="font-medium text-gray-900 hover:text-green-600 transition-colors"
                          >
                            {review.users?.first_name
                              ? `${review.users.first_name} ${review.users.last_name || ''}`.trim()
                              : review.users?.username || 'Unknown User'
                            }
                          </Link>
                          <Link
                            href={`/profile/${review.users?.username || 'unknown'}`}
                            className="text-gray-400 hover:text-green-600 transition-colors"
                          >
                            @{review.users?.username || 'unknown'}
                          </Link>
                          <span className="text-gray-400">·</span>
                          <span className="text-gray-400 text-sm">
                            {formatDistanceToNow(new Date(review.created_at), { addSuffix: true })}
                          </span>
                          {review.edited_at && (
                            <>
                              <span className="text-gray-400">·</span>
                              <span className="text-gray-400 text-sm italic">
                                Edited {review.edit_count > 1 ? `${review.edit_count} times` : ''}
                              </span>
                            </>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {review.users?.id && (
                            <FollowButton userId={review.users.id} showText={false} />
                          )}
                          {user && review.user_id === user.id && (
                            <>
                              <button
                                onClick={() => handleEditReview(review)}
                                className="text-gray-400 hover:text-green-600 transition-colors"
                                title="Edit review"
                              >
                                <Edit2 className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteReview(review.id)}
                                className="text-gray-400 hover:text-red-600 transition-colors"
                                title="Delete review"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </>
                          )}
                          {user && review.user_id !== user.id && (
                            <ReportButton
                              reportedType="review"
                              reportedId={review.id}
                            />
                          )}
                        </div>
                      </div>

                      <div className="mb-2">
                        <StarRating rating={review.rating} size="sm" />
                      </div>

                      <p className="text-gray-700 text-sm mb-3 whitespace-pre-wrap">{review.content}</p>

                      <ReviewReactions
                        reviewId={review.id}
                      />
                    </div>
                  </div>
                </div>
              )
            })
        )}

        {/* Load More Button */}
        {!loading && hasMore && reviews.length > 0 && (
          <div className="flex justify-center pt-4">
            <button
              onClick={loadMoreReviews}
              disabled={loadingMore}
              className="px-4 py-2 text-sm font-medium text-green-600 hover:text-green-700 hover:bg-green-50 rounded-md transition-colors disabled:opacity-50"
            >
              {loadingMore ? 'Loading...' : 'Load more reviews'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
