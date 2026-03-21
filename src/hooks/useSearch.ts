'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { Tables } from '@/lib/supabase'
import type { PostCategory } from '@/lib/database.types'

type User = Tables<'users'>
type Post = Tables<'posts'> & {
  users: Tables<'users'>
}
type Place = Tables<'places'>

const ALL_CATEGORIES: { slug: PostCategory; display_name: string; icon_name: string }[] = [
  { slug: 'recipe', display_name: 'Recipes', icon_name: 'restaurant_menu' },
  { slug: 'place', display_name: 'Places', icon_name: 'location_on' },
  { slug: 'event', display_name: 'Events', icon_name: 'event' },
  { slug: 'lifestyle', display_name: 'Lifestyle', icon_name: 'self_improvement' },
  { slug: 'activism', display_name: 'Activism', icon_name: 'campaign' },
  { slug: 'question', display_name: 'Questions', icon_name: 'help' },
  { slug: 'product', display_name: 'Products', icon_name: 'shopping_bag' },
  { slug: 'hotel', display_name: 'Hotels', icon_name: 'hotel' },
  { slug: 'organisation', display_name: 'Organisations', icon_name: 'corporate_fare' },
  { slug: 'general', display_name: 'General', icon_name: 'article' },
]

export interface SearchCategory {
  slug: PostCategory
  display_name: string
  icon_name: string
}

export interface SearchResults {
  posts: Post[]
  users: User[]
  places: Place[]
  categories: SearchCategory[]
  loading: boolean
  error: string | null
}

export function useSearch(query: string, minLength: number = 3) {
  const [results, setResults] = useState<SearchResults>({
    posts: [],
    users: [],
    places: [],
    categories: [],
    loading: false,
    error: null
  })
  const [debouncedQuery, setDebouncedQuery] = useState('')

  // Debounce the search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query)
    }, 300)

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
          ),
          place:place_id (
            id, name, address, category, images, average_rating, is_pet_friendly, website
          )
        `)
        .eq('privacy', 'public')
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

  const searchPlaces = useCallback(async (searchTerm: string) => {
    try {
      const { data, error } = await supabase
        .from('places')
        .select('*')
        .ilike('name', `%${searchTerm}%`)
        .order('average_rating', { ascending: false })
        .limit(5)

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error searching places:', error)
      return []
    }
  }, [])

  const matchCategories = useCallback((searchTerm: string): SearchCategory[] => {
    const term = searchTerm.toLowerCase()
    return ALL_CATEGORIES.filter(c =>
      c.display_name.toLowerCase().includes(term) || c.slug.includes(term)
    )
  }, [])

  // Perform search when debounced query changes
  useEffect(() => {
    const performSearch = async () => {
      if (!debouncedQuery || debouncedQuery.length < minLength) {
        setResults({
          posts: [],
          users: [],
          places: [],
          categories: [],
          loading: false,
          error: null
        })
        return
      }

      setResults(prev => ({ ...prev, loading: true, error: null }))

      try {
        const categories = matchCategories(debouncedQuery)
        const [posts, users, places] = await Promise.all([
          searchPosts(debouncedQuery),
          searchUsers(debouncedQuery),
          searchPlaces(debouncedQuery),
        ])

        setResults({
          posts,
          users,
          places,
          categories,
          loading: false,
          error: null
        })
      } catch (error) {
        setResults({
          posts: [],
          users: [],
          places: [],
          categories: [],
          loading: false,
          error: error instanceof Error ? error.message : 'Search failed'
        })
      }
    }

    performSearch()
  }, [debouncedQuery, minLength, searchPosts, searchUsers, searchPlaces, matchCategories])

  return results
}
