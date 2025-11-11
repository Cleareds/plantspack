'use client'

import { useState } from 'react'
import { X, Save } from 'lucide-react'

interface EditPostProps {
  post: {
    id: string
    content: string
    privacy: 'public' | 'friends'
  }
  isOpen: boolean
  onClose: () => void
  onSaved: () => void
}

export default function EditPost({ post, isOpen, onClose, onSaved }: EditPostProps) {
  const [content, setContent] = useState(post.content)
  const [privacy, setPrivacy] = useState<'public' | 'friends'>(post.privacy)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!content.trim()) {
      setError('Content cannot be empty')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/posts/${post.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          content: content.trim(),
          privacy
        })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to update post')
      }

      onSaved()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update post')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center p-4 z-50" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[80vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Edit Post</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* Content */}
          <div>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
              rows={6}
              maxLength={500}
              placeholder="What's on your mind?"
            />
            <div className="flex justify-between items-center mt-1">
              <span className={`text-xs ${content.length > 450 ? 'text-red-500' : 'text-gray-400'}`}>
                {content.length}/500
              </span>
            </div>
          </div>

          {/* Privacy */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Who can see this?
            </label>
            <select
              value={privacy}
              onChange={(e) => setPrivacy(e.target.value as 'public' | 'friends')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              <option value="public">Everyone</option>
              <option value="friends">Friends only</option>
            </select>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !content.trim()}
              className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-md font-medium transition-colors"
            >
              <Save className="h-4 w-4" />
              <span>{loading ? 'Saving...' : 'Save Changes'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
