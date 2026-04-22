'use client'

import React, { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useAuth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { formatDistanceToNow } from 'date-fns'
import { Star, Send, Edit2, Trash2, Image as ImageIcon, Video, X } from 'lucide-react'
import FollowButton from '../social/FollowButton'
import ReportButton from '../moderation/ReportButton'
import ReviewReactions from '../reactions/ReviewReactions'
import StarRating from '../places/StarRating'
import ImageUploader from '../ui/ImageUploader'
import VideoUploader from '../ui/VideoUploader'
import LinkifiedText from '../ui/LinkifiedText'

type Review = {
  id: string
  post_id: string
  user_id: string
  rating: number
  content: string
  images: string[]
  video_url: string | null
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

interface RecipeReviewsProps {
  recipeId: string
}

export default function RecipeReviews({ recipeId }: RecipeReviewsProps) {
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
  const [validationError, setValidationError] = useState('')
  const [imageUrls, setImageUrls] = useState<string[]>([])
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [showImageUploader, setShowImageUploader] = useState(false)
  const [showVideoUploader, setShowVideoUploader] = useState(false)
  const [lightboxImage, setLightboxImage] = useState<string | null>(null)
  const { user, profile } = useAuth()

  const REVIEWS_PER_PAGE = 20

  // Calculate average rating
  const averageRating = reviews.length > 0
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    : 0

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
        .from('recipe_reviews')
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
        .eq('post_id', recipeId)
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
  }, [recipeId, user])

  const loadMoreReviews = () => {
    const nextPage = page + 1
    setPage(nextPage)
    fetchReviews(nextPage, true)
  }

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault()
    setValidationError('')
    if (!user) return
    if (newRating === 0) {
      setValidationError('Please select a star rating')
      return
    }
    if (!newContent.trim()) {
      setValidationError('Please write a review')
      return
    }
    if (submitting) return

    if (profile?.is_banned) {
      alert('Your account has been suspended and cannot create reviews')
      return
    }

    const reviewContent = newContent.trim()
    const reviewRating = newRating
    const reviewImages = [...imageUrls]
    const reviewVideo = videoUrl
    setNewContent('')
    setNewRating(0)
    setImageUrls([])
    setVideoUrl(null)
    setShowImageUploader(false)
    setShowVideoUploader(false)
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
        setImageUrls(reviewImages)
        setVideoUrl(reviewVideo)
        throw new Error('Rate limit exceeded. Please wait before reviewing again.')
      }

      const response = await fetch(`/api/recipes/${recipeId}/reviews`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          rating: reviewRating,
          content: reviewContent,
          images: reviewImages,
          video_url: reviewVideo,
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
      setImageUrls(reviewImages)
      setVideoUrl(reviewVideo)
      alert(error instanceof Error ? error.message : 'Failed to submit review. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleEditReview = (review: Review) => {
    setEditingReviewId(review.id)
    setNewRating(review.rating)
    setNewContent(review.content)
    setImageUrls(review.images || [])
    setVideoUrl(review.video_url || null)
    setShowImageUploader((review.images || []).length > 0)
    setShowVideoUploader(!!review.video_url)
  }

  const handleCancelEdit = () => {
    setEditingReviewId(null)
    setNewRating(0)
    setNewContent('')
    setImageUrls([])
    setVideoUrl(null)
    setShowImageUploader(false)
    setShowVideoUploader(false)
  }

  const handleDeleteReview = async (reviewId: string) => {
    if (!confirm('Are you sure you want to delete this review?')) return

    try {
      const response = await fetch(`/api/recipes/${recipeId}/reviews`, {
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
      {/* Average Rating Summary */}
      {reviews.length > 0 && (
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
            <span className="text-lg font-semibold text-on-surface">
              {averageRating.toFixed(1)}
            </span>
          </div>
          <span className="text-sm text-on-surface-variant">
            ({reviews.length} {reviews.length === 1 ? 'review' : 'reviews'})
          </span>
        </div>
      )}

      {/* Review Form */}
      {!user ? (
        <div className="ghost-border rounded-lg p-6 bg-surface-container-low text-center">
          <p className="text-on-surface-variant mb-4">
            Sign in to leave a review and share your experience with this recipe
          </p>
          <Link
            href="/auth"
            className="inline-flex items-center gap-2 px-6 py-2 silk-gradient text-on-primary rounded-md hover:opacity-90 font-medium transition-colors"
          >
            Sign In to Review
          </Link>
        </div>
      ) : (
        <div className="ghost-border rounded-lg p-4">
          <h3 className="text-lg font-semibold text-on-surface mb-2">
            {editingReviewId ? 'Edit Your Review' : userReview ? 'Update Your Review' : 'Write a Review'}
          </h3>
          {userReview && !editingReviewId && (
            <p className="text-xs text-on-surface-variant mb-3 bg-surface-container-low px-3 py-2 rounded-md">
              You already have a review for this recipe. Submitting will update your existing review.
            </p>
          )}
          <form onSubmit={handleSubmitReview} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-on-surface-variant mb-2">
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
              <label className="block text-sm font-medium text-on-surface-variant mb-2">
                Review
              </label>
              <textarea
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                placeholder="How was this recipe? Share your experience..."
                className="w-full px-3 py-2 ghost-border rounded-md focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
                rows={4}
                maxLength={500}
              />
              {/* Uploaded image thumbnails */}
              {imageUrls.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {imageUrls.map((url, idx) => (
                    <div key={idx} className="relative group">
                      <img
                        src={url}
                        alt={`Upload ${idx + 1}`}
                        className="h-16 w-16 object-cover rounded-md border border-outline-variant"
                      />
                      <button
                        type="button"
                        onClick={() => setImageUrls(prev => prev.filter((_, i) => i !== idx))}
                        className="absolute -top-1.5 -right-1.5 bg-error text-on-error rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Image uploader */}
              {showImageUploader && (
                <div className="mt-2">
                  <ImageUploader
                    onImagesChange={(urls) => setImageUrls(prev => [...prev, ...urls].slice(0, 5))}
                    maxImages={5 - imageUrls.length}
                  />
                </div>
              )}

              {/* Video preview */}
              {videoUrl && (
                <div className="relative mt-2 inline-block">
                  <video src={videoUrl} className="h-20 rounded-md border border-outline-variant" />
                  <button
                    type="button"
                    onClick={() => setVideoUrl(null)}
                    className="absolute -top-1.5 -right-1.5 bg-error text-on-error rounded-full p-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              )}

              {/* Video uploader */}
              {showVideoUploader && !videoUrl && (
                <div className="mt-2">
                  <VideoUploader
                    onVideosChange={(urls) => { if (urls.length > 0) setVideoUrl(urls[0]) }}
                    maxVideos={1}
                    maxVideoSizeMB={50}
                  />
                </div>
              )}

              {validationError && (
                <p className="text-xs text-error mt-2">{validationError}</p>
              )}

              <div className="flex items-center justify-between mt-2">
                <div className="flex items-center gap-3">
                  <span className={`text-xs ${newContent.length > 450 ? 'text-error' : 'text-outline'}`}>
                    {newContent.length}/500
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowImageUploader(!showImageUploader)}
                    className={`flex items-center gap-1 text-xs px-2 py-1 rounded-md transition-colors ${
                      showImageUploader || imageUrls.length > 0
                        ? 'text-primary bg-primary-container/30'
                        : 'text-on-surface-variant hover:text-primary hover:bg-surface-container-low'
                    }`}
                    title="Add images"
                  >
                    <ImageIcon className="h-4 w-4" />
                    <span>{imageUrls.length > 0 ? `${imageUrls.length}/5` : 'Photos'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowVideoUploader(!showVideoUploader)}
                    className={`flex items-center gap-1 text-xs px-2 py-1 rounded-md transition-colors ${
                      showVideoUploader || videoUrl
                        ? 'text-primary bg-primary-container/30'
                        : 'text-on-surface-variant hover:text-primary hover:bg-surface-container-low'
                    }`}
                    title="Add video"
                  >
                    <Video className="h-4 w-4" />
                    <span>{videoUrl ? '1/1' : 'Video'}</span>
                  </button>
                </div>
                <div className="flex gap-2">
                  {editingReviewId && (
                    <button
                      type="button"
                      onClick={handleCancelEdit}
                      className="px-4 py-2 text-sm font-medium text-on-surface-variant hover:text-on-surface-variant hover:bg-surface-container-low rounded-md transition-colors"
                    >
                      Cancel
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={!newContent.trim() || newRating === 0 || submitting}
                    className="flex items-center space-x-1 silk-gradient hover:opacity-90 disabled:bg-outline text-on-primary px-4 py-2 rounded-md text-sm font-medium transition-colors"
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
        <h3 className="text-lg font-semibold text-on-surface">
          Reviews ({reviews.length})
        </h3>

        {loading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse ghost-border rounded-lg p-4">
                <div className="flex space-x-3">
                  <div className="h-10 w-10 bg-surface-container-low rounded-full"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-surface-container-low rounded w-1/4 mb-2"></div>
                    <div className="h-4 bg-surface-container-low rounded w-3/4 mb-2"></div>
                    <div className="h-4 bg-surface-container-low rounded w-full"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : reviews.length === 0 ? (
          <div className="text-center py-8 text-outline ghost-border rounded-lg">
            No reviews yet. Be the first to review this recipe!
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
                <div key={key} className="ghost-border rounded-lg p-4">
                  <div className="flex space-x-3">
                    <div className="flex-shrink-0">
                      {review.users?.avatar_url ? (
                        <img
                          src={review.users.avatar_url}
                          alt={`${review.users.username}'s avatar`}
                          className="h-10 w-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="h-10 w-10 rounded-full bg-surface-container-low flex items-center justify-center">
                          <span className="text-sm font-medium text-primary">
                            {review.users?.first_name?.[0] || review.users?.username?.[0]?.toUpperCase() || '?'}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <Link
                            href={`/user/${review.users?.username || 'unknown'}`}
                            className="font-medium text-on-surface hover:text-primary transition-colors"
                          >
                            {review.users?.first_name
                              ? `${review.users.first_name} ${review.users.last_name || ''}`.trim()
                              : review.users?.username || 'Unknown User'
                            }
                          </Link>
                          <Link
                            href={`/user/${review.users?.username || 'unknown'}`}
                            className="text-outline hover:text-primary transition-colors"
                          >
                            @{review.users?.username || 'unknown'}
                          </Link>
                          <span className="text-outline">·</span>
                          <span className="text-outline text-sm">
                            {formatDistanceToNow(new Date(review.created_at), { addSuffix: true })}
                          </span>
                          {review.edited_at && (
                            <>
                              <span className="text-outline">·</span>
                              <span className="text-outline text-sm italic">
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
                                className="text-outline hover:text-primary transition-colors"
                                title="Edit review"
                              >
                                <Edit2 className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteReview(review.id)}
                                className="text-outline hover:text-error transition-colors"
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

                      <p className="text-on-surface-variant text-sm mb-3 whitespace-pre-wrap">
                        <LinkifiedText text={review.content} />
                      </p>

                      {/* Review images */}
                      {review.images && review.images.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-3">
                          {review.images.map((img, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => setLightboxImage(img)}
                              className="block"
                            >
                              <img
                                src={img}
                                alt={`Review photo ${idx + 1}`}
                                className="h-20 w-20 object-cover rounded-md border border-outline-variant hover:opacity-80 transition-opacity cursor-pointer"
                              />
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Review video */}
                      {review.video_url && (
                        <div className="mb-3">
                          <video
                            src={review.video_url}
                            controls
                            className="max-h-60 rounded-md border border-outline-variant"
                          />
                        </div>
                      )}

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
              className="px-4 py-2 text-sm font-medium text-primary hover:text-primary hover:bg-surface-container-low rounded-md transition-colors disabled:opacity-50"
            >
              {loadingMore ? 'Loading...' : 'Load more reviews'}
            </button>
          </div>
        )}
      </div>

      {/* Image lightbox */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setLightboxImage(null)}
        >
          <button
            onClick={() => setLightboxImage(null)}
            className="absolute top-4 right-4 text-white bg-black/50 rounded-full p-2 hover:bg-black/70 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
          <img
            src={lightboxImage}
            alt="Review photo"
            className="max-w-full max-h-[90vh] object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  )
}
