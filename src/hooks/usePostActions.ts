'use client'

import { useState } from 'react'

export function usePostActions() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const deletePost = async (postId: string): Promise<boolean> => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/posts/${postId}`, {
        method: 'DELETE',
        credentials: 'include'
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to delete post')
      }

      return true
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete post'
      setError(errorMessage)
      return false
    } finally {
      setLoading(false)
    }
  }

  const editPost = async (postId: string, content: string, privacy: 'public' | 'friends'): Promise<boolean> => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/posts/${postId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ content, privacy })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to edit post')
      }

      return true
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to edit post'
      setError(errorMessage)
      return false
    } finally {
      setLoading(false)
    }
  }

  return {
    deletePost,
    editPost,
    loading,
    error,
    clearError: () => setError(null)
  }
}
