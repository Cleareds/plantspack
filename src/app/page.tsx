'use client'

import { useState } from 'react'
import Feed from "@/components/posts/Feed"
import CreatePost from "@/components/posts/CreatePost"
import { useAuth } from "@/lib/auth"
import { MessageSquare, X } from 'lucide-react'

export default function Home() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const { user, profile } = useAuth()

  const handlePostCreated = () => {
    // This will be passed to the Feed component to refresh
    setIsSidebarOpen(false) // Close sidebar on mobile after posting
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex gap-6">
          {/* Main Feed - Left Side */}
          <div className="flex-1 min-w-0">
            <div className="max-w-2xl">
              <Feed onPostCreated={handlePostCreated} />
            </div>
          </div>

          {/* Desktop Sidebar - Right Side */}
          <div className="hidden lg:block w-96 flex-shrink-0">
            <div className="sticky top-20 space-y-6">
              {user && (
                <>
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
                </>
              )}

              {!user && (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 text-center">
                  <h2 className="text-xl font-semibold text-gray-900 mb-3">
                    Welcome to PlantsPack! 🌱
                  </h2>
                  <p className="text-gray-600 mb-4">
                    Connect with fellow plant-based enthusiasts, share your green journey, and discover amazing vegan places.
                  </p>
                  <a
                    href="/auth"
                    className="inline-block bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-md font-medium transition-colors"
                  >
                    Join PlantsPack
                  </a>
                </div>
              )}
            </div>
          </div>

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
