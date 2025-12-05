'use client'

import { useState, useEffect, use } from 'react'
import { useAuth } from '@/lib/auth'
import { PackWithStats, PackPostWithPost } from '@/types/packs'
import PackHeader from '@/components/packs/PackHeader'
import PostCard from '@/components/posts/PostCard'
import { useRouter } from 'next/navigation'

export default function PackDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { user } = useAuth()
  const [pack, setPack] = useState<PackWithStats | null>(null)
  const [posts, setPosts] = useState<PackPostWithPost[]>([])
  const [loading, setLoading] = useState(true)
  const [postsLoading, setPostsLoading] = useState(true)

  const fetchPack = async () => {
    try {
      const response = await fetch(`/api/packs/${id}`)
      const data = await response.json()

      if (response.ok) {
        setPack(data.pack)
      } else {
        console.error('Error fetching pack:', data.error)
        router.push('/packs')
      }
    } catch (error) {
      console.error('Error fetching pack:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchPosts = async () => {
    try {
      setPostsLoading(true)
      const response = await fetch(`/api/packs/${id}/posts?limit=50`)
      const data = await response.json()

      if (response.ok) {
        setPosts(data.posts)
      }
    } catch (error) {
      console.error('Error fetching pack posts:', error)
    } finally {
      setPostsLoading(false)
    }
  }

  useEffect(() => {
    fetchPack()
    fetchPosts()
  }, [id])

  const handleJoin = async () => {
    try {
      const response = await fetch(`/api/packs/${id}/members`, {
        method: 'POST'
      })

      if (response.ok) {
        fetchPack() // Refresh pack data
      }
    } catch (error) {
      console.error('Error joining pack:', error)
    }
  }

  const handleLeave = async () => {
    try {
      const response = await fetch(`/api/packs/${id}/members`, {
        method: 'DELETE'
      })

      if (response.ok) {
        fetchPack() // Refresh pack data
      }
    } catch (error) {
      console.error('Error leaving pack:', error)
    }
  }

  const handleFollow = async () => {
    try {
      const response = await fetch(`/api/packs/${id}/follow`, {
        method: 'POST'
      })

      if (response.ok) {
        fetchPack() // Refresh pack data
      }
    } catch (error) {
      console.error('Error following pack:', error)
    }
  }

  const handleUnfollow = async () => {
    try {
      const response = await fetch(`/api/packs/${id}/follow`, {
        method: 'DELETE'
      })

      if (response.ok) {
        fetchPack() // Refresh pack data
      }
    } catch (error) {
      console.error('Error unfollowing pack:', error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mb-2"></div>
          <p className="text-gray-600">Loading pack...</p>
        </div>
      </div>
    )
  }

  if (!pack) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">📦</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Pack not found</h2>
          <p className="text-gray-600">This pack may have been deleted or made private.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <PackHeader
        pack={pack}
        onJoin={handleJoin}
        onLeave={handleLeave}
        onFollow={handleFollow}
        onUnfollow={handleUnfollow}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Posts Section */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Posts ({pack.post_count})
          </h2>

          {postsLoading && (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
              <p className="mt-2 text-gray-600">Loading posts...</p>
            </div>
          )}

          {!postsLoading && posts.length > 0 && (
            <div className="space-y-6">
              {posts.map((packPost) => (
                <PostCard
                  key={packPost.id}
                  post={packPost.posts as any}
                  onDelete={() => fetchPosts()}
                  currentUserId={user?.id}
                />
              ))}
            </div>
          )}

          {!postsLoading && posts.length === 0 && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
              <div className="text-6xl mb-4">📭</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No posts yet
              </h3>
              <p className="text-gray-600">
                {pack.user_role === 'admin' || pack.user_role === 'moderator'
                  ? 'Start adding posts to this pack from the post menu'
                  : 'This pack is waiting for posts to be added'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
