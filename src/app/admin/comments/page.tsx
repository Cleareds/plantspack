'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import {
  Search,
  Trash2,
  Eye,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertCircle,
  MessageSquare
} from 'lucide-react'

interface Comment {
  id: string
  post_id: string
  user_id: string
  content: string
  created_at: string
  deleted_at: string | null
  users: {
    username: string
    avatar_url: string | null
  }
  posts: {
    id: string
    content: string
  }
}

const COMMENTS_PER_PAGE = 20

export default function CommentsManagement() {
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)
  const [totalComments, setTotalComments] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [searchQuery, setSearchQuery] = useState('')
  const [showDeleted, setShowDeleted] = useState(false)

  useEffect(() => {
    loadComments()
  }, [currentPage, searchQuery, showDeleted])

  const loadComments = async () => {
    setLoading(true)
    try {
      // Build query
      let query = supabase
        .from('comments')
        .select('*, users(username, avatar_url), posts(id, content)', { count: 'exact' })

      // Apply deleted filter
      if (showDeleted) {
        query = query.not('deleted_at', 'is', null)
      } else {
        query = query.is('deleted_at', null)
      }

      // Apply search filter
      if (searchQuery) {
        query = query.ilike('content', `%${searchQuery}%`)
      }

      // Apply pagination
      const from = (currentPage - 1) * COMMENTS_PER_PAGE
      const to = from + COMMENTS_PER_PAGE - 1
      query = query.range(from, to).order('created_at', { ascending: false })

      const { data, error, count } = await query

      if (error) throw error

      setComments(data as any || [])
      setTotalComments(count || 0)
    } catch (error) {
      console.error('Error loading comments:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteComment = async (commentId: string, isDeleted: boolean) => {
    const action = isDeleted ? 'restore' : 'delete'
    if (!confirm(`Are you sure you want to ${action} this comment?`)) return

    try {
      const { error } = await supabase
        .from('comments')
        .update({
          deleted_at: isDeleted ? null : new Date().toISOString()
        })
        .eq('id', commentId)

      if (error) throw error

      // Reload comments
      loadComments()
    } catch (error) {
      console.error(`Error ${action}ing comment:`, error)
      alert(`Failed to ${action} comment`)
    }
  }

  const handlePermanentDelete = async (commentId: string) => {
    if (!confirm('Are you sure you want to PERMANENTLY delete this comment? This action cannot be undone!')) return

    try {
      const { error } = await supabase
        .from('comments')
        .delete()
        .eq('id', commentId)

      if (error) throw error

      // Reload comments
      loadComments()
    } catch (error) {
      console.error('Error permanently deleting comment:', error)
      alert('Failed to permanently delete comment')
    }
  }

  const totalPages = Math.ceil(totalComments / COMMENTS_PER_PAGE)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Comments Management</h1>
        <p className="text-gray-600 mt-1">Manage all user comments</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Search
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by comment content..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  setCurrentPage(1)
                }}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Deleted Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              value={showDeleted ? 'deleted' : 'active'}
              onChange={(e) => {
                setShowDeleted(e.target.value === 'deleted')
                setCurrentPage(1)
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              <option value="active">Active Comments</option>
              <option value="deleted">Deleted Comments</option>
            </select>
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center justify-between pt-4 border-t">
          <p className="text-sm text-gray-600">
            Showing {comments.length} of {totalComments} comments
          </p>
          <p className="text-sm text-gray-600">
            Page {currentPage} of {totalPages}
          </p>
        </div>
      </div>

      {/* Comments List */}
      {loading ? (
        <div className="flex items-center justify-center py-12 bg-white rounded-lg shadow">
          <Loader2 className="h-8 w-8 animate-spin text-green-600" />
        </div>
      ) : comments.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 bg-white rounded-lg shadow">
          <AlertCircle className="h-12 w-12 text-gray-400 mb-2" />
          <p className="text-gray-600">No comments found</p>
        </div>
      ) : (
        <div className="space-y-4">
          {comments.map((comment) => (
            <div key={comment.id} className="bg-white rounded-lg shadow p-6">
              <div className="flex items-start space-x-4">
                {/* User Avatar */}
                <div className="flex-shrink-0">
                  {comment.users?.avatar_url ? (
                    <img
                      src={comment.users.avatar_url}
                      alt={comment.users.username}
                      className="h-10 w-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                      <MessageSquare className="h-5 w-5 text-gray-500" />
                    </div>
                  )}
                </div>

                {/* Comment Content */}
                <div className="flex-1 min-w-0">
                  {/* User Info */}
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {comment.users?.username || 'Unknown User'}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(comment.created_at).toLocaleString()}
                      </p>
                    </div>
                    {comment.deleted_at && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        Deleted
                      </span>
                    )}
                  </div>

                  {/* Comment Text */}
                  <p className="text-sm text-gray-700 mb-3">
                    {comment.content}
                  </p>

                  {/* Post Context */}
                  <div className="bg-gray-50 rounded-md p-3 mb-3">
                    <p className="text-xs text-gray-500 mb-1">Comment on post:</p>
                    <p className="text-sm text-gray-700 line-clamp-2">
                      {comment.posts?.content || 'Post not found'}
                    </p>
                  </div>

                  {/* Deleted Info */}
                  {comment.deleted_at && (
                    <div className="bg-red-50 border border-red-200 rounded-md px-3 py-2 mb-3">
                      <p className="text-xs text-red-800">
                        Deleted on {new Date(comment.deleted_at).toLocaleDateString()}
                      </p>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => window.open(`/post/${comment.post_id}`, '_blank')}
                      className="inline-flex items-center px-3 py-1.5 border border-gray-300 rounded-md text-xs font-medium text-gray-700 bg-white hover:bg-gray-50"
                    >
                      <Eye className="h-3 w-3 mr-1" />
                      View Post
                    </button>
                    {comment.deleted_at ? (
                      <>
                        <button
                          onClick={() => handleDeleteComment(comment.id, true)}
                          className="inline-flex items-center px-3 py-1.5 border border-green-300 rounded-md text-xs font-medium text-green-700 bg-green-50 hover:bg-green-100"
                        >
                          Restore
                        </button>
                        <button
                          onClick={() => handlePermanentDelete(comment.id)}
                          className="inline-flex items-center px-3 py-1.5 border border-red-300 rounded-md text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100"
                        >
                          <Trash2 className="h-3 w-3 mr-1" />
                          Permanent Delete
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => handleDeleteComment(comment.id, false)}
                        className="inline-flex items-center px-3 py-1.5 border border-red-300 rounded-md text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100"
                      >
                        <Trash2 className="h-3 w-3 mr-1" />
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="bg-white rounded-lg shadow px-6 py-4 flex items-center justify-between">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Previous
          </button>

          <div className="flex items-center space-x-2">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum
              if (totalPages <= 5) {
                pageNum = i + 1
              } else if (currentPage <= 3) {
                pageNum = i + 1
              } else if (currentPage >= totalPages - 2) {
                pageNum = totalPages - 4 + i
              } else {
                pageNum = currentPage - 2 + i
              }

              return (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  className={`px-4 py-2 rounded-md text-sm font-medium ${
                    currentPage === pageNum
                      ? 'bg-green-600 text-white'
                      : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {pageNum}
                </button>
              )
            })}
          </div>

          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
            <ChevronRight className="h-4 w-4 ml-1" />
          </button>
        </div>
      )}
    </div>
  )
}
