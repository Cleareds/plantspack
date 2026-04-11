'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Heart, MessageCircle, Share2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface CompactPost {
  id: string
  title: string | null
  content: string
  category: string
  images: string[]
  image_url: string | null
  created_at: string
  slug: string | null
  users: { username: string; first_name: string | null; avatar_url: string | null }
  post_reactions: { id: string }[]
  comments: { id: string }[]
}

const CATEGORY_EMOJI: Record<string, string> = {
  recipe: '🍽️', place: '📍', thought: '💬', event: '🎉', organisation: '🏢',
}

export default function CompactFeed() {
  const [posts, setPosts] = useState<CompactPost[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('posts')
        .select(`
          id, title, content, category, images, image_url, created_at, slug,
          users!inner(username, first_name, avatar_url),
          post_reactions(id),
          comments(id)
        `)
        .eq('privacy', 'public')
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(8)

      if (data) setPosts(data as unknown as CompactPost[])
      setLoading(false)
    }
    load()
  }, [])

  const handleShare = (e: React.MouseEvent, post: CompactPost) => {
    e.preventDefault()
    e.stopPropagation()
    const url = `${window.location.origin}/${post.category === 'recipe' && post.slug ? `recipe/${post.slug}` : `post/${post.id}`}`
    if (navigator.share) {
      navigator.share({ title: post.title || 'PlantsPack', url })
    } else {
      navigator.clipboard.writeText(url)
    }
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(4)].map((_, i) => <div key={i} className="h-20 bg-surface-container-low rounded-lg animate-pulse" />)}
      </div>
    )
  }

  if (posts.length === 0) {
    return <p className="text-xs text-on-surface-variant text-center py-4">No posts yet</p>
  }

  return (
    <div className="space-y-2">
      {posts.map(post => {
        const content = post.title || post.content || ''
        const truncated = content.length > 140 ? content.slice(0, 140) + '...' : content
        const postUrl = post.category === 'recipe' && post.slug
          ? `/recipe/${post.slug}`
          : `/post/${post.id}`
        const user = post.users as any
        const likeCount = post.post_reactions?.length || 0
        const commentCount = post.comments?.length || 0
        const timeAgo = getTimeAgo(post.created_at)
        const thumbImage = post.images?.[0] || post.image_url

        return (
          <Link key={post.id} href={postUrl}
            className="block p-2.5 bg-surface-container-lowest rounded-lg ghost-border hover:border-primary/15 transition-all">
            <div className="flex gap-2.5">
              {/* Thumbnail */}
              {thumbImage && (
                <img src={thumbImage} alt="" className="w-14 h-14 rounded-lg object-cover flex-shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                {/* Author + time */}
                <div className="flex items-center gap-1.5 mb-1">
                  {user?.avatar_url ? (
                    <img src={user.avatar_url} alt="" className="w-4 h-4 rounded-full object-cover" />
                  ) : (
                    <div className="w-4 h-4 rounded-full bg-surface-container-high flex items-center justify-center text-[8px] font-bold text-primary">
                      {(user?.first_name?.[0] || user?.username?.[0] || '?').toUpperCase()}
                    </div>
                  )}
                  <span className="text-[10px] font-medium text-on-surface-variant truncate">{user?.first_name || user?.username}</span>
                  <span className="text-[10px] text-on-surface-variant/50">·</span>
                  <span className="text-[10px] text-on-surface-variant/50">{timeAgo}</span>
                  {post.category && (
                    <span className="text-[10px] ml-auto">{CATEGORY_EMOJI[post.category] || ''}</span>
                  )}
                </div>
                {/* Content */}
                <p className="text-xs text-on-surface leading-relaxed">
                  {truncated}
                  {content.length > 140 && (
                    <span className="text-primary font-medium ml-1">more</span>
                  )}
                </p>
              </div>
            </div>
            {/* Actions bar */}
            <div className="flex items-center gap-4 mt-2 pl-1">
              <span className="flex items-center gap-1 text-[10px] text-on-surface-variant">
                <Heart className="h-3 w-3" /> {likeCount}
              </span>
              <span className="flex items-center gap-1 text-[10px] text-on-surface-variant">
                <MessageCircle className="h-3 w-3" /> {commentCount}
              </span>
              <button
                onClick={(e) => handleShare(e, post)}
                className="flex items-center gap-1 text-[10px] text-on-surface-variant hover:text-primary transition-colors"
              >
                <Share2 className="h-3 w-3" />
              </button>
            </div>
          </Link>
        )
      })}

      <Link href="/feed" className="block text-center text-xs text-primary font-medium hover:underline py-2">
        View full feed
      </Link>
    </div>
  )
}

function getTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h`
  const days = Math.floor(hrs / 24)
  if (days < 30) return `${days}d`
  return `${Math.floor(days / 30)}mo`
}
