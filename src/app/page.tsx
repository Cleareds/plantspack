'use client'

import { useState } from 'react'
import Feed from "@/components/posts/Feed"
import CreatePost from "@/components/posts/CreatePost"
import GuestWelcome from "@/components/guest/GuestWelcome"
import { useAuth } from "@/lib/auth"
import { MessageSquare, X } from 'lucide-react'
import TrendingHashtags from "@/components/hashtags/TrendingHashtags"

export default function Home() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const { user, profile } = useAuth()

  const handlePostCreated = () => {
    setRefreshKey(prev => prev + 1)
    setIsSidebarOpen(false)
  }

  return (
    <div className="min-h-screen bg-surface">
      <div className="max-w-6xl mx-auto px-4 md:px-8 py-8">
        <div className={user ? "flex gap-8" : "flex justify-center"}>
          {/* Main Feed */}
          <div className={user ? "flex-1 min-w-0" : "w-full max-w-2xl"}>
            <div className={user ? "max-w-2xl" : ""}>
              {!user && <GuestWelcome />}
              <Feed key={refreshKey} onPostCreated={handlePostCreated} />
            </div>
          </div>

          {/* Desktop Right Sidebar - Trending & Create Post */}
          {user && (
            <div className="hidden xl:block w-80 flex-shrink-0">
              <div className="sticky top-24 space-y-6">
                {/* Create Post Card */}
                <div className="bg-surface-container-lowest rounded-3xl editorial-shadow p-6">
                  <h2 className="font-headline font-bold text-on-surface text-lg tracking-tight mb-1">
                    Hello, {profile?.first_name || profile?.username || 'Friend'}!
                  </h2>
                  <p className="text-sm text-on-surface-variant mb-4">
                    Share your plant-based journey
                  </p>
                  <CreatePost onPostCreated={handlePostCreated} />
                </div>

                {/* Trending */}
                <TrendingHashtags />
              </div>
            </div>
          )}

          {/* Mobile Post FAB */}
          {user && (
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="xl:hidden fixed bottom-24 right-6 lg:bottom-6 bg-primary text-on-primary p-4 rounded-full shadow-editorial transition-all hover:opacity-90 active:scale-95 z-40"
            >
              <MessageSquare className="h-6 w-6" />
            </button>
          )}

          {/* Mobile Create Post Overlay */}
          {isSidebarOpen && (
            <>
              <div
                className="xl:hidden fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
                onClick={() => setIsSidebarOpen(false)}
              />
              <div className="xl:hidden fixed top-0 right-0 h-full w-full max-w-sm bg-surface-container-lowest z-50 shadow-editorial">
                <div className="flex items-center justify-between p-6 border-b border-outline-variant/15">
                  <h2 className="font-headline font-bold text-on-surface text-lg tracking-tight">
                    Create Post
                  </h2>
                  <button
                    onClick={() => setIsSidebarOpen(false)}
                    className="p-2 hover:bg-surface-container-low rounded-xl transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <div className="p-6">
                  <CreatePost onPostCreated={handlePostCreated} />
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
