'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { Tables } from '@/lib/supabase'

type User = Tables<'users'>
type Post = Tables<'posts'> & {
  users: Tables<'users'>
}

interface SearchResults {
  posts: Post[]
  users: User[]
  loading: boolean
  error: string | null
}

export function useSearch(query: string, minLength: number = 3) {
  const [results, setResults] = useState<SearchResults>({
    posts: [],
    users: [],
    loading: false,
    error: null
  })
  const [debouncedQuery, setDebouncedQuery] = useState('')

  // Debounce the search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query)
    }, 300) // 300ms debounce

    return () => clearTimeout(timer)
  }, [query])

  const searchPosts = useCallback(async (searchTerm: string) => {
    try {
      const { data, error } = await supabase
        .from('posts')
        .select(`
          *,
          users (
            id,
            username,
            first_name,
            last_name,
            avatar_url
          )
        `)
        .eq('privacy', 'public') // Only search public posts for now
        .ilike('content', `%${searchTerm}%`)
        .order('created_at', { ascending: false })
        .limit(5)

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error searching posts:', error)
      return []
    }
  }, [])

  const searchUsers = useCallback(async (searchTerm: string) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .or(`username.ilike.%${searchTerm}%,first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%`)
        .order('username', { ascending: true })
        .limit(5)

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error searching users:', error)
      return []
    }
  }, [])

  // Perform search when debounced query changes
  useEffect(() => {
    const performSearch = async () => {
      if (!debouncedQuery || debouncedQuery.length < minLength) {
        setResults({
          posts: [],
          users: [],
          loading: false,
          error: null
        })
        return
      }

      setResults(prev => ({ ...prev, loading: true, error: null }))

      try {
        const [posts, users] = await Promise.all([
          searchPosts(debouncedQuery),
          searchUsers(debouncedQuery)
        ])

        setResults({
          posts,
          users,
          loading: false,
          error: null
        })
      } catch (error) {
        setResults({
          posts: [],
          users: [],
          loading: false,
          error: error instanceof Error ? error.message : 'Search failed'
        })
      }
    }

    performSearch()
  }, [debouncedQuery, minLength, searchPosts, searchUsers])

  return results
}