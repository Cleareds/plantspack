'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useAuth } from '@/lib/auth'
import { Menu, X, Home, Map, User, LogOut, Crown } from 'lucide-react'
import SearchBar from '@/components/search/SearchBar'
import NotificationBell from '@/components/notifications/NotificationBell'

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const { user, profile, signOut } = useAuth()
  
  // Get username from profile or fall back to user metadata
  const username = profile?.username || user?.user_metadata?.username

  const handleSignOut = async () => {
    await signOut()
    setIsMenuOpen(false)
  }

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-3">
            <Image
              src="/plantspack9.png"
              alt="PlantsPack Logo"
              width={40}
              height={40}
              className="object-contain"
            />
            <div className="flex flex-col">
              <span className="text-xl font-bold text-gray-900 leading-[1.1]">PLANTS PACK</span>
              <span className="text-sm font-light text-gray-600 leading-[1.1]">vegan syndicate</span>
            </div>
            <span className="text-xs font-semibold text-white bg-orange-500 px-2 py-1 rounded-full">
              BETA
            </span>
          </Link>

          {/* Search Bar - Only for logged in users */}
          {user && (
            <div className="hidden md:block flex-1 max-w-lg mx-8">
              <SearchBar />
            </div>
          )}

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <Link
              href="/"
              className="flex items-center space-x-1 text-gray-700 hover:text-green-600 transition-colors"
            >
              <Home className="h-5 w-5" />
              <span>Feed</span>
            </Link>
            <Link
              href="/map"
              className="flex items-center space-x-1 text-gray-700 hover:text-green-600 transition-colors"
            >
              <Map className="h-5 w-5" />
              <span>Map</span>
            </Link>
            <Link
              href="/support"
              className="flex items-center space-x-1 text-gray-700 hover:text-green-600 transition-colors"
            >
              <Crown className="h-5 w-5" />
              <span>Support Us</span>
            </Link>
            {user && username && (
              <>
                <NotificationBell />
                <Link
                  href={`/profile/${username}`}
                  className="flex items-center space-x-1 text-gray-700 hover:text-green-600 transition-colors"
                >
                  <User className="h-5 w-5" />
                  <span>Profile</span>
                </Link>
                <button
                  onClick={handleSignOut}
                  className="flex items-center space-x-1 text-gray-700 hover:text-red-600 transition-colors"
                >
                  <LogOut className="h-5 w-5" />
                  <span>Sign Out</span>
                </button>
              </>
            )}
            {!user && (
              <Link
                href="/auth"
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md font-medium transition-colors"
              >
                Sign In
              </Link>
            )}
          </nav>

          {/* Mobile menu button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
          >
            {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation */}
      {isMenuOpen && (
        <div className="md:hidden bg-white border-t border-gray-200">
          <div className="px-2 pt-2 pb-3 space-y-1">
            {/* Mobile Search Bar - Only for logged in users */}
            {user && (
              <div className="px-3 py-2">
                <SearchBar />
              </div>
            )}
            <Link
              href="/"
              onClick={() => setIsMenuOpen(false)}
              className="flex items-center space-x-2 px-3 py-2 rounded-md text-gray-700 hover:text-green-600 hover:bg-gray-50"
            >
              <Home className="h-5 w-5" />
              <span>Feed</span>
            </Link>
            <Link
              href="/map"
              onClick={() => setIsMenuOpen(false)}
              className="flex items-center space-x-2 px-3 py-2 rounded-md text-gray-700 hover:text-green-600 hover:bg-gray-50"
            >
              <Map className="h-5 w-5" />
              <span>Map</span>
            </Link>
            <Link
              href="/support"
              onClick={() => setIsMenuOpen(false)}
              className="flex items-center space-x-2 px-3 py-2 rounded-md text-gray-700 hover:text-green-600 hover:bg-gray-50"
            >
              <Crown className="h-5 w-5" />
              <span>Support Us</span>
            </Link>
            {user && username && (
              <>
                <div className="px-3 py-2">
                  <NotificationBell />
                </div>
                <Link
                  href={`/profile/${username}`}
                  onClick={() => setIsMenuOpen(false)}
                  className="flex items-center space-x-2 px-3 py-2 rounded-md text-gray-700 hover:text-green-600 hover:bg-gray-50"
                >
                  <User className="h-5 w-5" />
                  <span>Profile</span>
                </Link>
                <button
                  onClick={handleSignOut}
                  className="flex items-center space-x-2 px-3 py-2 rounded-md text-gray-700 hover:text-red-600 hover:bg-gray-50 w-full text-left"
                >
                  <LogOut className="h-5 w-5" />
                  <span>Sign Out</span>
                </button>
              </>
            )}
            {!user && (
              <Link
                href="/auth"
                onClick={() => setIsMenuOpen(false)}
                className="block px-3 py-2 rounded-md text-center bg-green-600 hover:bg-green-700 text-white font-medium"
              >
                Sign In
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  )
}