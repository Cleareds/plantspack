'use client'

import { useState, useRef, useEffect } from 'react'
import { Search, X, User, MessageSquare, MapPin, Loader2 } from 'lucide-react'
import { useSearch } from '@/hooks/useSearch'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { formatDistanceToNow } from 'date-fns'

interface SearchBarProps {
  className?: string
}

export default function SearchBar({ className = '' }: SearchBarProps) {
  const [query, setQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  const { posts, users, places, categories, loading, error } = useSearch(query)

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

  const highlightMatch = (text: string, searchQuery: string) => {
    if (!searchQuery) return text
    const regex = new RegExp(`(${searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
    const parts = text.split(regex)

    return parts.map((part, index) =>
      regex.test(part) ? (
        <mark key={index} className="bg-yellow-200/50 text-on-surface">{part}</mark>
      ) : part
    )
  }

  const hasResults = posts.length > 0 || users.length > 0 || places.length > 0 || categories.length > 0
  const showNoResults = query.length >= 3 && !loading && !hasResults && !error

  return (
    <div ref={searchRef} className={`relative w-full ${className}`}>
      {/* Search Input */}
      <div className="w-full">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-outline" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search posts, places, users..."
          className="w-full pl-10 pr-10 py-2 bg-surface-container-low border-0 ghost-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent placeholder-outline text-sm"
        />
        {query && (
          <button
            onClick={clearSearch}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-outline hover:text-on-surface-variant transition-colors"
            aria-label="Clear search"
            data-testid="clear-search-button"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Dropdown Results */}
      {isOpen && (
        <div className="sm:min-w-[480px] absolute top-full left-0 right-0 mt-1 bg-surface-container-lowest glass-float shadow-ambient rounded-lg z-50 max-h-[28rem] overflow-y-auto" data-testid="search-dropdown">
          {loading && (
            <div className="p-4 text-center">
              <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2 text-primary" />
              <p className="text-sm text-outline">Searching...</p>
            </div>
          )}

          {error && (
            <div className="p-4 text-center text-error text-sm">
              <p>Error: {error}</p>
            </div>
          )}

          {showNoResults && (
            <div className="p-4 text-center text-outline text-sm">
              <p>No results found for &quot;{query}&quot;</p>
            </div>
          )}

          {!loading && !error && hasResults && (
            <div className="divide-y divide-outline-variant/15">
              {/* Categories Section */}
              {categories.length > 0 && (
                <div>
                  <div className="sticky top-0 bg-surface-container-low px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: '16px' }}>category</span>
                      <span className="text-xs font-semibold text-on-surface-variant uppercase tracking-wide">
                        Categories ({categories.length})
                      </span>
                    </div>
                  </div>
                  <div>
                    {categories.map((cat) => (
                      <button
                        key={cat.slug}
                        onClick={() => {
                          handleResultClick()
                          router.push(`/?category=${cat.slug}`)
                        }}
                        className="w-full flex items-center gap-3 p-3 hover:bg-surface-container-low transition-colors text-left"
                      >
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                          <span className="material-symbols-outlined text-primary" style={{ fontSize: '18px' }}>{cat.icon_name}</span>
                        </div>
                        <div>
                          <div className="text-sm font-medium text-on-surface">
                            {highlightMatch(cat.display_name, query)}
                          </div>
                          <div className="text-xs text-outline">Category</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Places Section */}
              {places.length > 0 && (
                <div>
                  <div className="sticky top-0 bg-surface-container-low px-3 py-2">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-on-surface-variant" />
                      <span className="text-xs font-semibold text-on-surface-variant uppercase tracking-wide">
                        Places ({places.length})
                      </span>
                    </div>
                  </div>
                  <div>
                    {places.map((place) => (
                      <Link
                        key={place.id}
                        href={`/place/${(place as any).slug || place.id}`}
                        onClick={handleResultClick}
                        className="flex items-center gap-3 p-3 hover:bg-surface-container-low transition-colors"
                      >
                        <div className="w-8 h-8 rounded-lg bg-secondary/10 flex items-center justify-center">
                          <MapPin className="h-4 w-4 text-secondary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-on-surface truncate">
                            {highlightMatch(place.name, query)}
                          </div>
                          <div className="text-xs text-outline truncate">
                            {place.address}
                          </div>
                        </div>
                        {place.average_rating > 0 && (
                          <div className="text-xs text-on-surface-variant flex items-center gap-0.5">
                            <span className="material-symbols-outlined" style={{ fontSize: '14px', fontVariationSettings: "'FILL' 1" }}>star</span>
                            {place.average_rating.toFixed(1)}
                          </div>
                        )}
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Posts Section */}
              {posts.length > 0 && (
                <div>
                  <div className="sticky top-0 bg-surface-container-low px-3 py-2">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="h-4 w-4 text-on-surface-variant" />
                      <span className="text-xs font-semibold text-on-surface-variant uppercase tracking-wide">
                        Posts ({posts.length})
                      </span>
                    </div>
                  </div>
                  <div>
                    {posts.map((post) => (
                      <Link
                        key={post.id}
                        href={`/post/${post.id}`}
                        onClick={handleResultClick}
                        className="block p-3 hover:bg-surface-container-low transition-colors"
                      >
                        <div className="flex items-start gap-2">
                          <div className="flex-shrink-0">
                            {post.users.avatar_url ? (
                              <img
                                src={post.users.avatar_url}
                                alt={post.users.username}
                                className="h-6 w-6 rounded-full object-cover"
                              />
                            ) : (
                              <div className="h-6 w-6 rounded-full bg-surface-container-low flex items-center justify-center">
                                <span className="text-primary text-xs font-medium">
                                  {post.users.first_name?.[0] || post.users.username[0].toUpperCase()}
                                </span>
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1 mb-1">
                              <span className="text-xs font-medium text-on-surface truncate">
                                {post.users.first_name && post.users.last_name
                                  ? `${post.users.first_name} ${post.users.last_name}`
                                  : post.users.username}
                              </span>
                              <span className="text-xs text-outline">·</span>
                              <span className="text-xs text-outline">
                                {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                              </span>
                            </div>
                            <p className="text-xs text-on-surface-variant line-clamp-2">
                              {highlightMatch(truncateText(post.content, 100), query)}
                            </p>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Users Section */}
              {users.length > 0 && (
                <div>
                  <div className="sticky top-0 bg-surface-container-low px-3 py-2">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-on-surface-variant" />
                      <span className="text-xs font-semibold text-on-surface-variant uppercase tracking-wide">
                        Users ({users.length})
                      </span>
                    </div>
                  </div>
                  <div>
                    {users.map((user) => (
                      <Link
                        key={user.id}
                        href={`/user/${user.username}`}
                        onClick={handleResultClick}
                        className="flex items-center gap-3 p-3 hover:bg-surface-container-low transition-colors"
                      >
                        <div className="flex-shrink-0">
                          {user.avatar_url ? (
                            <img
                              src={user.avatar_url}
                              alt={user.username}
                              className="h-8 w-8 rounded-full object-cover"
                            />
                          ) : (
                            <div className="h-8 w-8 rounded-full bg-surface-container-low flex items-center justify-center">
                              <span className="text-primary text-sm font-medium">
                                {user.first_name?.[0] || user.username[0].toUpperCase()}
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-on-surface truncate">
                            {highlightMatch(
                              user.first_name && user.last_name
                                ? `${user.first_name} ${user.last_name}`
                                : user.username,
                              query
                            )}
                          </div>
                          <div className="text-xs text-outline truncate">
                            @{highlightMatch(user.username, query)}
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
