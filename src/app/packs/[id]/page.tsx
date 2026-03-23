'use client'

import { useState, useEffect, useMemo, use } from 'react'
import { useAuth } from '@/lib/auth'
import { PackWithStats, PackPostWithPost } from '@/types/packs'
import PackHeader from '@/components/packs/PackHeader'
import PostCard from '@/components/posts/PostCard'
import PackPlacesTab from '@/components/packs/PackPlacesTab'
import { useRouter, useSearchParams } from 'next/navigation'
import { CheckCircle, AlertCircle } from 'lucide-react'

type TabType = 'posts' | 'recipes' | 'places' | 'events' | 'members'

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

  // Filter posts by category for dedicated tabs (must be before early returns — hooks rule)
  const recipePosts = useMemo(() => posts.filter(p => (p.posts as any)?.category === 'recipe'), [posts])
  const placePosts = useMemo(() => posts.filter(p => (p.posts as any)?.category === 'place' || (p.posts as any)?.place_id), [posts])
  const eventPosts = useMemo(() => posts.filter(p => (p.posts as any)?.category === 'event'), [posts])

  if (loading) {
    return (
      <div className="min-h-screen bg-surface-container-low flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-2"></div>
          <p className="text-on-surface-variant">Loading pack...</p>
        </div>
      </div>
    )
  }

  if (!pack) {
    return (
      <div className="min-h-screen bg-surface-container-low flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">📦</div>
          <h2 className="text-2xl font-bold text-on-surface mb-2">Pack not found</h2>
          <p className="text-on-surface-variant">This pack may have been deleted or made private.</p>
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
    <div className="min-h-screen bg-surface-container-low">
      {/* Success Message */}
      {successMessage && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-[9999] animate-fade-in">
          <div className="bg-primary/10 border border-primary/20 rounded-lg shadow-ambient px-6 py-3 flex items-center gap-3">
            <CheckCircle className="h-5 w-5 text-primary flex-shrink-0" />
            <p className="text-sm font-medium text-primary">{successMessage}</p>
          </div>
        </div>
      )}

      {/* Error Message */}
      {errorMessage && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-[9999] animate-fade-in">
          <div className="bg-error/10 border border-error/20 rounded-lg shadow-ambient px-6 py-3 flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-error flex-shrink-0" />
            <p className="text-sm font-medium text-error">{errorMessage}</p>
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
        <div className="border-b border-outline-variant/15 mb-6">
          <nav className="-mb-px flex space-x-6 overflow-x-auto">
            {([
              { key: 'posts' as TabType, label: 'All Posts', count: pack.post_count },
              ...(recipePosts.length > 0 ? [{ key: 'recipes' as TabType, label: 'Recipes', count: recipePosts.length }] : []),
              { key: 'places' as TabType, label: 'Places', count: (pack.places_count || 0) + placePosts.length },
              ...(eventPosts.length > 0 ? [{ key: 'events' as TabType, label: 'Events', count: eventPosts.length }] : []),
              { key: 'members' as TabType, label: 'Members', count: pack.member_count },
            ]).map((tab) => (
              <button
                key={tab.key}
                onClick={() => handleTabChange(tab.key)}
                className={`
                  py-4 px-1 border-b-2 font-medium text-sm transition-colors whitespace-nowrap
                  ${activeTab === tab.key
                    ? 'border-primary text-primary'
                    : 'border-transparent text-outline hover:text-on-surface-variant hover:border-outline-variant/30'
                  }
                `}
              >
                {tab.label} ({tab.count})
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'posts' && (
          <div className="mb-6">
            {postsLoading && (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                <p className="mt-2 text-on-surface-variant">Loading posts...</p>
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
              <div className="bg-surface-container-lowest rounded-lg editorial-shadow ghost-border p-12 text-center">
                <div className="text-6xl mb-4">📭</div>
                <h3 className="text-lg font-medium text-on-surface mb-2">
                  No posts yet
                </h3>
                <p className="text-on-surface-variant">
                  {pack.user_role === 'admin' || pack.user_role === 'moderator'
                    ? 'Start adding posts to this pack from the post menu'
                    : 'This pack is waiting for posts to be added'}
                </p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'recipes' && (
          <div className="mb-6">
            {recipePosts.length > 0 ? (
              <div className="space-y-6">
                {recipePosts.map((packPost) => (
                  <PostCard
                    key={packPost.id}
                    post={packPost.posts as any}
                    onUpdate={fetchPosts}
                    packContext={{ packId: id, userRole: pack.user_role }}
                  />
                ))}
              </div>
            ) : (
              <div className="bg-surface-container-lowest rounded-lg editorial-shadow ghost-border p-12 text-center">
                <div className="text-6xl mb-4">🍳</div>
                <h3 className="text-lg font-medium text-on-surface mb-2">No recipes yet</h3>
                <p className="text-on-surface-variant">Add posts with the Recipe category to see them here</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'events' && (
          <div className="mb-6">
            {eventPosts.length > 0 ? (
              <div className="space-y-6">
                {eventPosts.map((packPost) => (
                  <PostCard
                    key={packPost.id}
                    post={packPost.posts as any}
                    onUpdate={fetchPosts}
                    packContext={{ packId: id, userRole: pack.user_role }}
                  />
                ))}
              </div>
            ) : (
              <div className="bg-surface-container-lowest rounded-lg editorial-shadow ghost-border p-12 text-center">
                <div className="text-6xl mb-4">📅</div>
                <h3 className="text-lg font-medium text-on-surface mb-2">No events yet</h3>
                <p className="text-on-surface-variant">Add posts with the Event category to see them here</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'places' && (
          <div className="space-y-6">
            {/* Place posts from the pack */}
            {placePosts.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-on-surface-variant mb-3">Place posts</h3>
                <div className="space-y-6">
                  {placePosts.map((packPost) => (
                    <PostCard
                      key={packPost.id}
                      post={packPost.posts as any}
                      onUpdate={fetchPosts}
                      packContext={{ packId: id, userRole: pack.user_role }}
                    />
                  ))}
                </div>
              </div>
            )}
            {/* Dedicated pack places */}
            <PackPlacesTab
              packId={id}
              userRole={pack.user_role}
              userId={user?.id || null}
            />
          </div>
        )}

        {activeTab === 'members' && (
          <div className="bg-surface-container-lowest rounded-lg editorial-shadow ghost-border p-12 text-center">
            <div className="text-6xl mb-4">👥</div>
            <h3 className="text-lg font-medium text-on-surface mb-2">
              Members Tab
            </h3>
            <p className="text-on-surface-variant">
              Members list coming soon
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
