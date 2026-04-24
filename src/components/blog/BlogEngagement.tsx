'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import ReactionButtons from '@/components/reactions/ReactionButtons'
import { MessageCircle } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { useEffect } from 'react'

const Comments = dynamic(() => import('@/components/posts/Comments'), { ssr: false })

interface BlogEngagementProps {
  postId: string
}

export default function BlogEngagement({ postId }: BlogEngagementProps) {
  const { user } = useAuth()
  const [commentCount, setCommentCount] = useState(0)
  const [showComments, setShowComments] = useState(false)

  useEffect(() => {
    supabase
      .from('comments')
      .select('id', { count: 'exact', head: true })
      .eq('post_id', postId)
      .is('deleted_at', null)
      .then(({ count }) => setCommentCount(count ?? 0))
  }, [postId])

  return (
    <div className="mt-10 pt-6 border-t border-outline-variant/15">
      <div className="flex items-center gap-4">
        <ReactionButtons postId={postId} className="flex-1" />
        <button
          onClick={() => setShowComments(v => !v)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-on-surface-variant hover:bg-surface-container-low transition-colors"
        >
          <MessageCircle className="w-4 h-4" />
          {commentCount > 0 ? `${commentCount} comment${commentCount !== 1 ? 's' : ''}` : 'Comment'}
        </button>
      </div>

      {showComments && (
        <div className="mt-6">
          <Comments
            postId={postId}
            isOpen={true}
            onClose={() => setShowComments(false)}
            embedded={true}
          />
        </div>
      )}
    </div>
  )
}
