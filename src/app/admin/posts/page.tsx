'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import {
  Search,
  Trash2,
  Eye,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertCircle,
  MapPin,
  Lock,
  Globe,
  Users
} from 'lucide-react'

interface Post {
  id: string
  user_id: string
  content: string
  location_name: string | null
  privacy: string
  created_at: string
  deleted_at: string | null
  users: {
    username: string
    avatar_url: string | null
  }
}

const POSTS_PER_PAGE = 30

export default function PostsManagement() {
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [totalPosts, setTotalPosts] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterPrivacy, setFilterPrivacy] = useState<'all' | 'public' | 'friends' | 'private'>('all')
  const [showDeleted, setShowDeleted] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  useEffect(() => {
    loadPosts()
  }, [currentPage, searchQuery, filterPrivacy, showDeleted])

  const loadPosts = async () => {
    setLoading(true)
    try {
      let query = supabase
        .from('posts')
        .select('id, user_id, content, location_name, privacy, created_at, deleted_at, users(username, avatar_url)', { count: 'exact' })

      if (showDeleted) {
        query = query.not('deleted_at', 'is', null)
      } else {
        query = query.is('deleted_at', null)
      }

      if (searchQuery) {
        query = query.or(`content.ilike.%${searchQuery}%,location_name.ilike.%${searchQuery}%`)
      }

      if (filterPrivacy !== 'all') {
        query = query.eq('privacy', filterPrivacy)
      }

      const from = (currentPage - 1) * POSTS_PER_PAGE
      query = query.range(from, from + POSTS_PER_PAGE - 1).order('created_at', { ascending: false })

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

  const handleDelete = async (postId: string) => {
    if (!confirm('Permanently delete this post? This cannot be undone.')) return
    setActionLoading(postId)
    try {
      const res = await fetch(`/api/admin/posts/${postId}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to delete post')
      }
      loadPosts()
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to delete post')
    } finally {
      setActionLoading(null)
    }
  }

  const handleRestore = async (postId: string) => {
    setActionLoading(postId)
    try {
      const res = await fetch(`/api/admin/posts/${postId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'restore' }),
      })
      if (!res.ok) throw new Error('Failed to restore post')
      loadPosts()
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to restore post')
    } finally {
      setActionLoading(null)
    }
  }

  const totalPages = Math.ceil(totalPosts / POSTS_PER_PAGE)

  const privacyBadge = (privacy: string) => {
    const map: Record<string, { icon: React.ReactNode; cls: string; label: string }> = {
      public: { icon: <Globe className="h-3 w-3" />, cls: 'bg-green-100 text-green-800', label: 'Public' },
      friends: { icon: <Users className="h-3 w-3" />, cls: 'bg-blue-100 text-blue-800', label: 'Friends' },
      private: { icon: <Lock className="h-3 w-3" />, cls: 'bg-gray-100 text-gray-800', label: 'Private' },
    }
    const p = map[privacy] || map.private
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${p.cls}`}>
        {p.icon}{p.label}
      </span>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Posts Management</h1>
        <p className="text-gray-600 mt-1">Manage all user posts</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by content or location..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1) }}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Privacy</label>
            <select
              value={filterPrivacy}
              onChange={(e) => { setFilterPrivacy(e.target.value as any); setCurrentPage(1) }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              <option value="all">All</option>
              <option value="public">Public</option>
              <option value="friends">Friends</option>
              <option value="private">Private</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={showDeleted ? 'deleted' : 'active'}
              onChange={(e) => { setShowDeleted(e.target.value === 'deleted'); setCurrentPage(1) }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              <option value="active">Active</option>
              <option value="deleted">Soft-deleted</option>
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 border-t text-sm text-gray-600">
          <span>Showing {posts.length} of {totalPosts} posts</span>
          <span>Page {currentPage} of {Math.max(1, totalPages)}</span>
        </div>
      </div>

      {/* Table */}
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
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Content</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">Privacy</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {posts.map((post) => {
                const isActing = actionLoading === post.id
                return (
                  <tr key={post.id} className={post.deleted_at ? 'bg-red-50' : 'hover:bg-gray-50'}>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-sm font-medium text-gray-900">
                        @{post.users?.username || 'unknown'}
                      </span>
                    </td>
                    <td className="px-4 py-3 max-w-xs">
                      <p className="text-sm text-gray-700 truncate">
                        {post.content || <span className="text-gray-400 italic">No text</span>}
                      </p>
                      {post.location_name && (
                        <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                          <MapPin className="h-3 w-3" />{post.location_name}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-500 hidden md:table-cell">
                      {new Date(post.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap hidden sm:table-cell">
                      {privacyBadge(post.privacy)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => window.open(`/post/${post.id}`, '_blank')}
                          className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
                          title="View post"
                        >
                          <Eye className="h-4 w-4" />
                        </button>

                        {post.deleted_at ? (
                          <>
                            <button
                              onClick={() => handleRestore(post.id)}
                              disabled={isActing}
                              className="p-1.5 text-green-600 hover:text-green-800 hover:bg-green-50 rounded disabled:opacity-50"
                              title="Restore post"
                            >
                              {isActing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
                            </button>
                            <button
                              onClick={() => handleDelete(post.id)}
                              disabled={isActing}
                              className="p-1.5 text-red-600 hover:text-red-800 hover:bg-red-50 rounded disabled:opacity-50"
                              title="Permanently delete"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => handleDelete(post.id)}
                            disabled={isActing}
                            className="p-1.5 text-red-600 hover:text-red-800 hover:bg-red-50 rounded disabled:opacity-50"
                            title="Delete post"
                          >
                            {isActing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
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
              if (totalPages <= 5) pageNum = i + 1
              else if (currentPage <= 3) pageNum = i + 1
              else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i
              else pageNum = currentPage - 2 + i

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
