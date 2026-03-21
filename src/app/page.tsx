'use client'

import { useState } from 'react'
import Feed from "@/components/posts/Feed"
import CreatePost from "@/components/posts/CreatePost"
import GuestWelcome from "@/components/guest/GuestWelcome"
import { useAuth } from "@/lib/auth"
import { MessageSquare, X } from 'lucide-react'

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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className={user ? "flex gap-3" : "flex justify-center"}>
          {/* Main Feed */}
          <div className={user ? "flex-1 min-w-0" : "w-full max-w-2xl"}>
            <div className={user ? "max-w-2xl" : ""}>
              {!user && <GuestWelcome />}
              <Feed key={refreshKey} onPostCreated={handlePostCreated} />
            </div>
          </div>

          {/* Desktop Sidebar */}
          {user && (
            <div className="hidden lg:block w-[480px] flex-shrink-0">
              <div className="sticky top-20 space-y-4">
                <div className="bg-surface-container-lowest rounded-lg editorial-shadow p-4">
                  <h2 className="text-lg font-semibold text-on-surface tracking-editorial mb-2">
                    Hello, {profile?.first_name || profile?.username || 'Friend'}!
                  </h2>
                  <p className="text-sm text-on-surface-variant">
                    Share your plant-based animal-friendly journey with the PlantsPack community
                  </p>
                </div>
                <CreatePost onPostCreated={handlePostCreated} />
              </div>
            </div>
          )}

          {/* Mobile Post Button */}
          {user && (
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden fixed bottom-6 right-6 silk-gradient text-on-primary p-4 rounded-full shadow-ambient-lg transition-all hover:opacity-90 z-40"
            >
              <MessageSquare className="h-6 w-6" />
            </button>
          )}

          {/* Mobile Sidebar Overlay */}
          {isSidebarOpen && (
            <>
              <div
                className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
                onClick={() => setIsSidebarOpen(false)}
              />
              <div className="lg:hidden fixed top-0 right-0 h-full w-full max-w-sm bg-surface-container-lowest z-50 shadow-ambient-lg">
                <div className="flex items-center justify-between p-4 border-b border-outline-variant/15">
                  <h2 className="text-lg font-semibold text-on-surface tracking-editorial">
                    Hello, {profile?.first_name || profile?.username || 'Friend'}!
                  </h2>
                  <button
                    onClick={() => setIsSidebarOpen(false)}
                    className="p-2 hover:bg-surface-container-low rounded-md transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <div className="p-4">
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
