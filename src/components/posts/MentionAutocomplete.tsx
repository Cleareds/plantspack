'use client'

import { useState, useEffect, useRef } from 'react'
import { User } from 'lucide-react'

interface MentionUser {
  id: string
  username: string
  first_name: string | null
  last_name: string | null
  avatar_url: string | null
}

interface MentionAutocompleteProps {
  searchQuery: string
  onSelect: (username: string) => void
  onClose: () => void
  cursorPosition: { top: number; left: number }
}

export default function MentionAutocomplete({
  searchQuery,
  onSelect,
  onClose,
  cursorPosition
}: MentionAutocompleteProps) {
  const [users, setUsers] = useState<MentionUser[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (searchQuery.length < 3) {
      setUsers([])
      return
    }

    const searchUsers = async () => {
      setLoading(true)
      try {
        const response = await fetch(`/api/users/search?q=${encodeURIComponent(searchQuery)}&limit=5`)
        const data = await response.json()
        setUsers(data.users || [])
        setSelectedIndex(0)
      } catch (error) {
        console.error('Error searching users:', error)
        setUsers([])
      } finally {
        setLoading(false)
      }
    }

    const debounce = setTimeout(searchUsers, 300)
    return () => clearTimeout(debounce)
  }, [searchQuery])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (users.length === 0) return

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          setSelectedIndex(prev => (prev + 1) % users.length)
          break
        case 'ArrowUp':
          e.preventDefault()
          setSelectedIndex(prev => (prev - 1 + users.length) % users.length)
          break
        case 'Enter':
          e.preventDefault()
          if (users[selectedIndex]) {
            onSelect(users[selectedIndex].username)
          }
          break
        case 'Escape':
          e.preventDefault()
          onClose()
          break
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [users, selectedIndex, onSelect, onClose])

  if (searchQuery.length < 3) {
    return null
  }

  if (loading) {
    return (
      <div
        ref={containerRef}
        className="absolute z-50 bg-white border border-gray-300 rounded-lg shadow-lg p-3 min-w-[200px]"
        style={{
          top: `${cursorPosition.top + 24}px`,
          left: `${cursorPosition.left}px`,
        }}
      >
        <p className="text-sm text-gray-500">Searching...</p>
      </div>
    )
  }

  if (users.length === 0) {
    return (
      <div
        ref={containerRef}
        className="absolute z-50 bg-white border border-gray-300 rounded-lg shadow-lg p-3 min-w-[200px]"
        style={{
          top: `${cursorPosition.top + 24}px`,
          left: `${cursorPosition.left}px`,
        }}
      >
        <p className="text-sm text-gray-500">No users found</p>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className="absolute z-50 bg-white border border-gray-300 rounded-lg shadow-lg overflow-hidden min-w-[250px] max-h-[200px] overflow-y-auto"
      style={{
        top: `${cursorPosition.top + 24}px`,
        left: `${cursorPosition.left}px`,
      }}
    >
      {users.map((user, index) => (
        <button
          key={user.id}
          onClick={() => onSelect(user.username)}
          className={`w-full flex items-center space-x-3 px-3 py-2 text-left transition-colors ${
            index === selectedIndex
              ? 'bg-green-50'
              : 'hover:bg-gray-50'
          }`}
        >
          {user.avatar_url ? (
            <img
              src={user.avatar_url}
              alt={user.username}
              className="h-8 w-8 rounded-full object-cover"
            />
          ) : (
            <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
              <User className="h-4 w-4 text-green-600" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {user.first_name && user.last_name
                ? `${user.first_name} ${user.last_name}`
                : user.username}
            </p>
            <p className="text-xs text-gray-500 truncate">@{user.username}</p>
          </div>
        </button>
      ))}
    </div>
  )
}
