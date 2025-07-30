'use client'

import { useState, useRef, useEffect } from 'react'
import { Search, X, User, MessageSquare, Loader2 } from 'lucide-react'
import { useSearch } from '@/hooks/useSearch'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'

interface SearchBarProps {
  className?: string
}

export default function SearchBar({ className = '' }: SearchBarProps) {
  const [query, setQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  
  const { posts, users, loading, error } = useSearch(query)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Open dropdown when there's a query
  useEffect(() => {
    setIsOpen(query.length >= 3)
  }, [query])

  const clearSearch = () => {
    setQuery('')
    setIsOpen(false)
    inputRef.current?.focus()
  }

  const handleResultClick = () => {
    setIsOpen(false)
    setQuery('')
  }

  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength) + '...'
  }

  const highlightMatch = (text: string, query: string) => {
    if (!query) return text
    const regex = new RegExp(`(${query})`, 'gi')
    const parts = text.split(regex)
    
    return parts.map((part, index) => 
      regex.test(part) ? (
        <mark key={index} className="bg-yellow-200 text-gray-900">{part}</mark>
      ) : part
    )
  }

  const hasResults = posts.length > 0 || users.length > 0
  const showNoResults = query.length >= 3 && !loading && !hasResults && !error

  return (
    <div ref={searchRef} className={`relative ${className}`}>
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search posts and users..."
          className="w-full pl-10 pr-10 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent placeholder-gray-500 text-sm"
        />
        {query && (
          <button
            onClick={clearSearch}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Clear search"
            data-testid="clear-search-button"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Dropdown Results */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-96 overflow-hidden" data-testid="search-dropdown">
          {loading && (
            <div className="p-4 text-center">
              <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2 text-green-600" />
              <p className="text-sm text-gray-500">Searching...</p>
            </div>
          )}

          {error && (
            <div className="p-4 text-center text-red-600 text-sm">
              <p>Error: {error}</p>
            </div>
          )}

          {showNoResults && (
            <div className="p-4 text-center text-gray-500 text-sm">
              <p>No results found for &quot;{query}&quot;</p>
            </div>
          )}

          {!loading && !error && hasResults && (
            <div className="grid grid-cols-2 divide-x divide-gray-200">
              {/* Posts Column */}
              <div className="max-h-96 overflow-y-auto">
                <div className="sticky top-0 bg-gray-50 px-3 py-2 border-b border-gray-200">
                  <div className="flex items-center space-x-2">
                    <MessageSquare className="h-4 w-4 text-gray-600" />
                    <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                      Posts ({posts.length})
                    </span>
                  </div>
                </div>
                
                {posts.length === 0 ? (
                  <div className="p-3 text-center text-gray-500 text-sm">
                    No posts found
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {posts.map((post) => (
                      <Link
                        key={post.id}
                        href={`/post/${post.id}`}
                        onClick={handleResultClick}
                        className="block p-3 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-start space-x-2">
                          <div className="flex-shrink-0">
                            {post.users.avatar_url ? (
                              <img
                                src={post.users.avatar_url}
                                alt={post.users.username}
                                className="h-6 w-6 rounded-full object-cover"
                              />
                            ) : (
                              <div className="h-6 w-6 rounded-full bg-green-100 flex items-center justify-center">
                                <span className="text-green-600 text-xs font-medium">
                                  {post.users.first_name?.[0] || post.users.username[0].toUpperCase()}
                                </span>
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-1 mb-1">
                              <span className="text-xs font-medium text-gray-900 truncate">
                                {post.users.first_name && post.users.last_name
                                  ? `${post.users.first_name} ${post.users.last_name}`
                                  : post.users.username}
                              </span>
                              <span className="text-xs text-gray-500">•</span>
                              <span className="text-xs text-gray-500">
                                {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                              </span>
                            </div>
                            <p className="text-xs text-gray-600 line-clamp-2">
                              {highlightMatch(truncateText(post.content, 100), query)}
                            </p>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              {/* Users Column */}
              <div className="max-h-96 overflow-y-auto">
                <div className="sticky top-0 bg-gray-50 px-3 py-2 border-b border-gray-200">
                  <div className="flex items-center space-x-2">
                    <User className="h-4 w-4 text-gray-600" />
                    <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                      Users ({users.length})
                    </span>
                  </div>
                </div>
                
                {users.length === 0 ? (
                  <div className="p-3 text-center text-gray-500 text-sm">
                    No users found
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {users.map((user) => (
                      <Link
                        key={user.id}
                        href={`/user/${user.username}`}
                        onClick={handleResultClick}
                        className="block p-3 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center space-x-3">
                          <div className="flex-shrink-0">
                            {user.avatar_url ? (
                              <img
                                src={user.avatar_url}
                                alt={user.username}
                                className="h-8 w-8 rounded-full object-cover"
                              />
                            ) : (
                              <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
                                <span className="text-green-600 text-sm font-medium">
                                  {user.first_name?.[0] || user.username[0].toUpperCase()}
                                </span>
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-gray-900 truncate">
                              {highlightMatch(
                                user.first_name && user.last_name
                                  ? `${user.first_name} ${user.last_name}`
                                  : user.username,
                                query
                              )}
                            </div>
                            <div className="text-xs text-gray-500 truncate">
                              @{highlightMatch(user.username, query)}
                            </div>
                            {user.bio && (
                              <div className="text-xs text-gray-600 truncate mt-1">
                                {highlightMatch(truncateText(user.bio, 50), query)}
                              </div>
                            )}
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}