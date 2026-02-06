'use client'

import PostCard from '@/components/posts/PostCard'
import Comments from '@/components/posts/Comments'
import { Tables } from '@/lib/supabase'

type Post = Tables<'posts'> & {
  users: Tables<'users'> & {
    subscription_tier?: 'free' | 'medium' | 'premium'
  }
  post_likes: { id: string; user_id: string }[]
  comments: { id: string }[]
  parent_post?: (Tables<'posts'> & {
    users: Tables<'users'> & {
      subscription_tier?: 'free' | 'medium' | 'premium'
    }
  }) | null
  is_sensitive?: boolean
  content_warnings?: string[] | null
}

interface PostPageContentProps {
  post: Post
}

export default function PostPageContent({ post }: PostPageContentProps) {
  return (
    <div className="space-y-6">
      {/* Main Post */}
      <PostCard post={post} />

      {/* Comments Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Comments ({post.comments?.length || 0})
        </h3>
        <Comments
          postId={post.id}
          isOpen={true}
          onClose={() => {}}
          embedded={true}
        />
      </div>
    </div>
  )
}
