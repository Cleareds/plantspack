'use client'

import { useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Feed from "@/components/posts/Feed"
import CreatePostModal from "@/components/posts/CreatePostModal"
import CategoryTabs from "@/components/posts/CategoryTabs"
import { useAuth } from "@/lib/auth"
import type { PostCategory } from '@/lib/database.types'

export default function FeedPage() {
  return (
    <Suspense fallback={null}>
      <FeedPageContent />
    </Suspense>
  )
}

function FeedPageContent() {
  const searchParams = useSearchParams()
  const [isCreatePostOpen, setIsCreatePostOpen] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const [activeCategory, setActiveCategory] = useState<PostCategory | 'all'>('all')
  const { user } = useAuth()

  const handlePostCreated = () => { setRefreshKey(prev => prev + 1); setIsCreatePostOpen(false) }

  return (
    <div className="min-h-screen bg-surface">
      <div className="max-w-2xl mx-auto px-4 md:px-8 py-8">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-headline font-bold text-on-surface tracking-tight">Community Feed</h1>
          {user && (
            <button
              onClick={() => setIsCreatePostOpen(true)}
              className="flex items-center gap-2 silk-gradient text-on-primary-btn px-4 py-2 rounded-xl font-medium text-sm hover:opacity-90 transition-all"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>edit_square</span>
              Create Post
            </button>
          )}
        </div>

        <div className="mb-4">
          <CategoryTabs
            activeCategory={activeCategory}
            onCategoryChange={(cat) => { setActiveCategory(cat); setRefreshKey(prev => prev + 1) }}
          />
        </div>

        <Feed
          key={`${refreshKey}-${activeCategory}`}
          onPostCreated={handlePostCreated}
          category={activeCategory === 'all' ? undefined : activeCategory}
        />

        <CreatePostModal
          isOpen={isCreatePostOpen}
          onClose={() => setIsCreatePostOpen(false)}
          onPostCreated={handlePostCreated}
        />
      </div>
    </div>
  )
}
