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
  Image as ImageIcon,
  MapPin,
  Lock,
  Globe,
  Users
} from 'lucide-react'

interface Post {
  id: string
  user_id: string
  content: string
  image_url: string | null
  location_name: string | null
  privacy: string
  created_at: string
  deleted_at: string | null
  users: {
    username: string
    avatar_url: string | null
  }
}

const POSTS_PER_PAGE = 20

export default function PostsManagement() {
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [totalPosts, setTotalPosts] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterPrivacy, setFilterPrivacy] = useState<'all' | 'public' | 'friends' | 'private'>('all')
  const [showDeleted, setShowDeleted] = useState(false)

  useEffect(() => {
    loadPosts()
  }, [currentPage, searchQuery, filterPrivacy, showDeleted])

  const loadPosts = async () => {
    setLoading(true)
    try {
      // Build query
      let query = supabase
        .from('posts')
        .select('*, users(username, avatar_url)', { count: 'exact' })

      // Apply deleted filter
      if (showDeleted) {
        query = query.not('deleted_at', 'is', null)
      } else {
        query = query.is('deleted_at', null)
      }

      // Apply search filter
      if (searchQuery) {
        query = query.or(`content.ilike.%${searchQuery}%,location_name.ilike.%${searchQuery}%`)
      }

      // Apply privacy filter
      if (filterPrivacy !== 'all') {
        query = query.eq('privacy', filterPrivacy)
      }

      // Apply pagination
      const from = (currentPage - 1) * POSTS_PER_PAGE
      const to = from + POSTS_PER_PAGE - 1
      query = query.range(from, to).order('created_at', { ascending: false })

      const { data, error, count } = await query

      if (error) throw error

      setPosts(data as any || [])
      setTotalPosts(count || 0)
    } catch (error) {
      console.error('Error loading posts:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDeletePost = async (postId: string, isDeleted: boolean) => {
    const action = isDeleted ? 'restore' : 'delete'
    if (!confirm(`Are you sure you want to ${action} this post?`)) return

    try {
      const { error } = await supabase
        .from('posts')
        .update({
          deleted_at: isDeleted ? null : new Date().toISOString()
        })
        .eq('id', postId)

      if (error) throw error

      // Reload posts
      loadPosts()
    } catch (error) {
      console.error(`Error ${action}ing post:`, error)
      alert(`Failed to ${action} post`)
    }
  }

  const handlePermanentDelete = async (postId: string) => {
    if (!confirm('Are you sure you want to PERMANENTLY delete this post? This action cannot be undone!')) return

    try {
      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', postId)

      if (error) throw error

      // Reload posts
      loadPosts()
    } catch (error) {
      console.error('Error permanently deleting post:', error)
      alert('Failed to permanently delete post')
    }
  }

  const totalPages = Math.ceil(totalPosts / POSTS_PER_PAGE)

  const getPrivacyIcon = (privacy: string) => {
    switch (privacy) {
      case 'public':
        return <Globe className="h-3 w-3" />
      case 'friends':
        return <Users className="h-3 w-3" />
      case 'private':
        return <Lock className="h-3 w-3" />
      default:
        return null
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Posts Management</h1>
        <p className="text-gray-600 mt-1">Manage all user posts</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Search
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by content or location..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  setCurrentPage(1)
                }}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Privacy Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Privacy
            </label>
            <select
              value={filterPrivacy}
              onChange={(e) => {
                setFilterPrivacy(e.target.value as any)
                setCurrentPage(1)
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              <option value="all">All Privacy</option>
              <option value="public">Public</option>
              <option value="friends">Friends</option>
              <option value="private">Private</option>
            </select>
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
              <option value="active">Active Posts</option>
              <option value="deleted">Deleted Posts</option>
            </select>
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center justify-between pt-4 border-t">
          <p className="text-sm text-gray-600">
            Showing {posts.length} of {totalPosts} posts
          </p>
          <p className="text-sm text-gray-600">
            Page {currentPage} of {totalPages}
          </p>
        </div>
      </div>

      {/* Posts Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12 bg-white rounded-lg shadow">
          <Loader2 className="h-8 w-8 animate-spin text-green-600" />
        </div>
      ) : posts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 bg-white rounded-lg shadow">
          <AlertCircle className="h-12 w-12 text-gray-400 mb-2" />
          <p className="text-gray-600">No posts found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {posts.map((post) => (
            <div key={post.id} className="bg-white rounded-lg shadow overflow-hidden">
              {/* Post Image */}
              {post.image_url ? (
                <div className="relative h-48 bg-gray-100">
                  <img
                    src={post.image_url}
                    alt="Post"
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="h-48 bg-gray-100 flex items-center justify-center">
                  <ImageIcon className="h-12 w-12 text-gray-300" />
                </div>
              )}

              {/* Post Content */}
              <div className="p-4 space-y-3">
                {/* User Info */}
                <div className="flex items-center space-x-2">
                  {post.users?.avatar_url ? (
                    <img
                      src={post.users.avatar_url}
                      alt={post.users.username}
                      className="h-8 w-8 rounded-full object-cover"
                    />
                  ) : (
                    <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
                      <Eye className="h-4 w-4 text-gray-500" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {post.users?.username || 'Unknown User'}
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(post.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                      post.privacy === 'public'
                        ? 'bg-green-100 text-green-800'
                        : post.privacy === 'friends'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {getPrivacyIcon(post.privacy)}
                    <span className="ml-1 capitalize">{post.privacy}</span>
                  </span>
                </div>

                {/* Content */}
                <p className="text-sm text-gray-700 line-clamp-3">
                  {post.content || 'No content'}
                </p>

                {/* Location */}
                {post.location_name && (
                  <div className="flex items-center text-xs text-gray-500">
                    <MapPin className="h-3 w-3 mr-1" />
                    {post.location_name}
                  </div>
                )}

                {/* Deleted Badge */}
                {post.deleted_at && (
                  <div className="bg-red-50 border border-red-200 rounded-md px-3 py-2">
                    <p className="text-xs text-red-800">
                      Deleted on {new Date(post.deleted_at).toLocaleDateString()}
                    </p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center space-x-2 pt-2 border-t">
                  <button
                    onClick={() => window.open(`/post/${post.id}`, '_blank')}
                    className="flex-1 inline-flex items-center justify-center px-3 py-2 border border-gray-300 rounded-md text-xs font-medium text-gray-700 bg-white hover:bg-gray-50"
                  >
                    <Eye className="h-3 w-3 mr-1" />
                    View
                  </button>
                  {post.deleted_at ? (
                    <>
                      <button
                        onClick={() => handleDeletePost(post.id, true)}
                        className="flex-1 inline-flex items-center justify-center px-3 py-2 border border-green-300 rounded-md text-xs font-medium text-green-700 bg-green-50 hover:bg-green-100"
                      >
                        Restore
                      </button>
                      <button
                        onClick={() => handlePermanentDelete(post.id)}
                        className="inline-flex items-center justify-center px-3 py-2 border border-red-300 rounded-md text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100"
                        title="Permanently delete"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => handleDeletePost(post.id, false)}
                      className="flex-1 inline-flex items-center justify-center px-3 py-2 border border-red-300 rounded-md text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100"
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      Delete
                    </button>
                  )}
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
