'use client'

import { useState, useEffect } from 'react'
import Feed from "@/components/posts/Feed"
import CreatePostModal from "@/components/posts/CreatePostModal"
import CategoryTabs from "@/components/posts/CategoryTabs"
import GuestWelcome from "@/components/guest/GuestWelcome"
import { useAuth } from "@/lib/auth"
import { supabase } from "@/lib/supabase"
import type { PostCategory } from '@/lib/database.types'
import Link from 'next/link'

export default function Home() {
  const [isCreatePostOpen, setIsCreatePostOpen] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const [activeCategory, setActiveCategory] = useState<PostCategory | 'all'>('all')
  const [userCategories, setUserCategories] = useState<string[]>([])
  const { user, profile } = useAuth()

  // Load user's feed preferences
  useEffect(() => {
    async function loadPreferences() {
      if (!user) return
      const { data } = await supabase
        .from('user_preferences')
        .select('feed_categories')
        .eq('user_id', user.id)
        .single()
      if (data?.feed_categories) {
        setUserCategories(data.feed_categories)
      }
    }
    loadPreferences()
  }, [user])

  const handlePostCreated = () => {
    setRefreshKey(prev => prev + 1)
    setIsCreatePostOpen(false)
  }

  return (
    <div className="min-h-screen bg-surface">
      <div className="max-w-6xl mx-auto px-4 md:px-8 py-8">
        <div className={user ? "flex gap-8" : "flex justify-center"}>
          {/* Main Feed */}
          <div className={user ? "flex-1 min-w-0" : "w-full max-w-2xl"}>
            <div className={user ? "max-w-2xl" : ""}>
              {!user && <GuestWelcome />}

              {/* Category Tabs */}
              <div className="mb-4">
                <CategoryTabs
                  activeCategory={activeCategory}
                  onCategoryChange={(cat) => {
                    setActiveCategory(cat)
                    setRefreshKey(prev => prev + 1)
                  }}
                  userCategories={userCategories.length > 0 ? userCategories : undefined}
                />
              </div>

              <Feed
                key={`${refreshKey}-${activeCategory}`}
                onPostCreated={handlePostCreated}
                category={activeCategory === 'all' ? undefined : activeCategory}
              />
            </div>
          </div>

          {/* Desktop Right Sidebar */}
          {user && (
            <div className="hidden xl:block w-80 flex-shrink-0">
              <div className="sticky top-24 space-y-6">
                {/* Greeting + Create Post Button */}
                <div className="bg-surface-container-lowest rounded-3xl editorial-shadow p-6">
                  <h2 className="font-headline font-bold text-on-surface text-lg tracking-tight mb-1">
                    Hello, {profile?.first_name || profile?.username || 'Friend'}!
                  </h2>
                  <p className="text-sm text-on-surface-variant mb-4">
                    Share your plant-based journey
                  </p>
                  <button
                    onClick={() => setIsCreatePostOpen(true)}
                    className="w-full flex items-center justify-center gap-2 silk-gradient text-on-primary-btn px-5 py-3 rounded-xl font-medium hover:opacity-90 transition-all"
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>edit_square</span>
                    Create Post
                  </button>
                </div>

                {/* Edit Your Feed */}
                <div className="bg-surface-container-lowest rounded-3xl editorial-shadow p-6">
                  <h3 className="font-headline font-bold text-on-surface text-sm tracking-tight mb-2">
                    Personalize Your Feed
                  </h3>
                  <p className="text-xs text-on-surface-variant mb-3">
                    Choose which categories you want to see
                  </p>
                  <Link
                    href="/feed/edit"
                    className="flex items-center gap-2 px-4 py-2 bg-surface-container-low hover:bg-surface-container rounded-xl text-sm font-medium text-on-surface-variant transition-colors"
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>tune</span>
                    Edit Your Feed
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* Mobile Post FAB */}
          {user && (
            <button
              onClick={() => setIsCreatePostOpen(true)}
              className="xl:hidden fixed bottom-24 right-6 lg:bottom-6 bg-primary text-on-primary-btn p-4 rounded-full shadow-editorial transition-all hover:opacity-90 active:scale-95 z-40"
            >
              <span className="material-symbols-outlined text-2xl">edit_square</span>
            </button>
          )}

          {/* Create Post Modal */}
          <CreatePostModal
            isOpen={isCreatePostOpen}
            onClose={() => setIsCreatePostOpen(false)}
            onPostCreated={handlePostCreated}
          />
        </div>
      </div>
    </div>
  )
}
