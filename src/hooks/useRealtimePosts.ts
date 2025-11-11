'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Tables } from '@/lib/supabase'

type Post = Tables<'posts'>

export function useRealtimePosts() {
  const [newPosts, setNewPosts] = useState<Post[]>([])

  useEffect(() => {
    // Subscribe to new public posts
    const subscription = supabase
      .channel('public:posts')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'posts',
          filter: 'privacy=eq.public'
        },
        (payload) => {
          // Add new post to the queue
          setNewPosts(prev => [payload.new as Post, ...prev])
        }
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const clearNew = () => {
    setNewPosts([])
  }

  return {
    newPosts,
    clearNew,
    hasNewPosts: newPosts.length > 0,
    newPostCount: newPosts.length
  }
}
