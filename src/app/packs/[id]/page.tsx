'use client'

import { useState, useEffect, use } from 'react'
import { useAuth } from '@/lib/auth'
import { PackWithStats, PackPostWithPost } from '@/types/packs'
import PackHeader from '@/components/packs/PackHeader'
import PostCard from '@/components/posts/PostCard'
import PackPlacesTab from '@/components/packs/PackPlacesTab'
import { useRouter, useSearchParams } from 'next/navigation'
import { CheckCircle, AlertCircle } from 'lucide-react'

type TabType = 'posts' | 'places' | 'members'

export default function PackDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useAuth()
  const [pack, setPack] = useState<PackWithStats | null>(null)
  const [posts, setPosts] = useState<PackPostWithPost[]>([])
  const [loading, setLoading] = useState(true)
  const [postsLoading, setPostsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<TabType>((searchParams.get('tab') as TabType) || 'posts')
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

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

      const data = await response.json()

      if (response.ok) {
        setSuccessMessage('✅ Successfully joined the pack!')
        setTimeout(() => setSuccessMessage(''), 3000)
        fetchPack() // Refresh pack data
      } else {
        setErrorMessage(data.message || data.error || 'Failed to join pack')
        setTimeout(() => setErrorMessage(''), 5000)
      }
    } catch (error) {
      console.error('Error joining pack:', error)
      setErrorMessage('Failed to join pack. Please try again.')
      setTimeout(() => setErrorMessage(''), 5000)
    }
  }

  const handleLeave = async () => {
    try {
      const response = await fetch(`/api/packs/${id}/members`, {
        method: 'DELETE'
      })

      if (response.ok) {
        setSuccessMessage('✅ Successfully left the pack')
        setTimeout(() => setSuccessMessage(''), 3000)
        fetchPack() // Refresh pack data
      } else {
        const data = await response.json()
        setErrorMessage(data.error || 'Failed to leave pack')
        setTimeout(() => setErrorMessage(''), 5000)
      }
    } catch (error) {
      console.error('Error leaving pack:', error)
      setErrorMessage('Failed to leave pack. Please try again.')
      setTimeout(() => setErrorMessage(''), 5000)
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

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab)
    const url = new URL(window.location.href)
    url.searchParams.set('tab', tab)
    window.history.pushState({}, '', url.toString())
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Success Message */}
      {successMessage && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-[9999] animate-fade-in">
          <div className="bg-green-50 border border-green-200 rounded-lg shadow-lg px-6 py-3 flex items-center gap-3">
            <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
            <p className="text-sm font-medium text-green-800">{successMessage}</p>
          </div>
        </div>
      )}

      {/* Error Message */}
      {errorMessage && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-[9999] animate-fade-in">
          <div className="bg-red-50 border border-red-200 rounded-lg shadow-lg px-6 py-3 flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
            <p className="text-sm font-medium text-red-800">{errorMessage}</p>
          </div>
        </div>
      )}

      <PackHeader
        pack={pack}
        onJoin={handleJoin}
        onLeave={handleLeave}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tab Navigation */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => handleTabChange('posts')}
              className={`
                py-4 px-1 border-b-2 font-medium text-sm transition-colors
                ${activeTab === 'posts'
                  ? 'border-green-500 text-green-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
            >
              Posts ({pack.post_count})
            </button>
            <button
              onClick={() => handleTabChange('places')}
              className={`
                py-4 px-1 border-b-2 font-medium text-sm transition-colors
                ${activeTab === 'places'
                  ? 'border-green-500 text-green-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
            >
              Places ({pack.places_count || 0})
            </button>
            <button
              onClick={() => handleTabChange('members')}
              className={`
                py-4 px-1 border-b-2 font-medium text-sm transition-colors
                ${activeTab === 'members'
                  ? 'border-green-500 text-green-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
            >
              Members ({pack.member_count})
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'posts' && (
          <div className="mb-6">
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
                    onUpdate={fetchPosts}
                    packContext={{
                      packId: id,
                      userRole: pack.user_role
                    }}
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
        )}

        {activeTab === 'places' && (
          <PackPlacesTab
            packId={id}
            userRole={pack.user_role}
            userId={user?.id || null}
          />
        )}

        {activeTab === 'members' && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <div className="text-6xl mb-4">👥</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Members Tab
            </h3>
            <p className="text-gray-600">
              Members list coming soon
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
