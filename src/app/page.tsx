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
    // Trigger feed refresh by changing key
    setRefreshKey(prev => prev + 1)
    setIsSidebarOpen(false) // Close sidebar on mobile after posting
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className={user ? "flex gap-3" : "flex justify-center"}>
          {/* Main Feed */}
          <div className={user ? "flex-1 min-w-0" : "w-full max-w-2xl"}>
            <div className={user ? "max-w-2xl" : ""}>
              {/* Guest Welcome - Show above feed for unauthorized users */}
              {!user && <GuestWelcome />}
              <Feed key={refreshKey} onPostCreated={handlePostCreated} />
            </div>
          </div>

          {/* Desktop Sidebar - Right Side - Only for authenticated users */}
          {user && (
            <div className="hidden lg:block w-[480px] flex-shrink-0">
              <div className="sticky top-20 space-y-4">
                {/* Welcome Message */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                  <h2 className="text-lg font-semibold text-gray-900 mb-2">
                    Hello, {profile?.first_name || profile?.username || 'Friend'}! 👋
                  </h2>
                  <p className="text-sm text-gray-600">
                    Share your plant-based animal-friendly journey with the PlantsPack community
                  </p>
                </div>

                {/* Create Post Form */}
                <CreatePost onPostCreated={handlePostCreated} />
              </div>
            </div>
          )}

          {/* Mobile Post Button */}
          {user && (
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden fixed bottom-6 right-6 bg-green-600 hover:bg-green-700 text-white p-4 rounded-full shadow-lg transition-colors z-40"
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
              <div className="lg:hidden fixed top-0 right-0 h-full w-full max-w-sm bg-white z-50 shadow-xl">
                <div className="flex items-center justify-between p-4 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900">
                    Hello, {profile?.first_name || profile?.username || 'Friend'}!
                  </h2>
                  <button
                    onClick={() => setIsSidebarOpen(false)}
                    className="p-2 hover:bg-gray-100 rounded-md transition-colors"
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
