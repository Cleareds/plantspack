'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Tables } from '@/lib/supabase'
import PostCard from '@/components/posts/PostCard'
import Comments from '@/components/posts/Comments'
import { ArrowLeft, Loader2, AlertCircle } from 'lucide-react'
import Link from 'next/link'

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
}

export default function PostPage() {
  const { id } = useParams()
  const router = useRouter()
  const [post, setPost] = useState<Post | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id || typeof id !== 'string') {
      setError('Invalid post ID')
      setLoading(false)
      return
    }

    const fetchPost = async () => {
      try {
        setLoading(true)
        setError(null)

        const { data, error: fetchError } = await supabase
          .from('posts')
          .select(`
            *,
            users (
              *
            ),
            post_likes (
              id,
              user_id
            ),
            comments (
              id
            ),
            parent_post:parent_post_id (
              id,
              user_id,
              content,
              images,
              image_url,
              created_at,
              users (
                id,
                username,
                first_name,
                last_name,
                avatar_url,
                subscription_tier
              )
            )
          `)
          .eq('id', id)
          .single()

        if (fetchError) {
          if (fetchError.code === 'PGRST116') {
            setError('Post not found')
          } else {
            throw fetchError
          }
          return
        }

        if (!data) {
          setError('Post not found')
          return
        }

        setPost(data as Post)
      } catch (err) {
        console.error('Error fetching post:', err)
        setError('Failed to load post. Please try again.')
      } finally {
        setLoading(false)
      }
    }

    fetchPost()
  }, [id])

  const handlePostUpdate = () => {
    // Refresh the post data
    if (id && typeof id === 'string') {
      const fetchPost = async () => {
        const { data, error: fetchError } = await supabase
          .from('posts')
          .select(`
            *,
            users (
              *
            ),
            post_likes (
              id,
              user_id
            ),
            comments (
              id
            ),
            parent_post:parent_post_id (
              id,
              user_id,
              content,
              images,
              image_url,
              created_at,
              users (
                id,
                username,
                first_name,
                last_name,
                avatar_url,
                subscription_tier
              )
            )
          `)
          .eq('id', id)
          .single()

        if (!fetchError && data) {
          setPost(data as Post)
        }
      }
      fetchPost()
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-6">
            <Link
              href="/"
              className="inline-flex items-center space-x-2 text-green-600 hover:text-green-700 transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
              <span>Back to Feed</span>
            </Link>
          </div>

          {/* Loading State */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
            <div className="flex items-center justify-center space-x-3">
              <Loader2 className="h-6 w-6 animate-spin text-green-600" />
              <span className="text-gray-600">Loading post...</span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-6">
            <Link
              href="/"
              className="inline-flex items-center space-x-2 text-green-600 hover:text-green-700 transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
              <span>Back to Feed</span>
            </Link>
          </div>

          {/* Error State */}
          <div className="bg-white rounded-lg shadow-sm border border-red-200 p-8">
            <div className="flex items-center space-x-3 text-red-600 mb-4">
              <AlertCircle className="h-6 w-6" />
              <h2 className="text-lg font-semibold">Unable to Load Post</h2>
            </div>
            <p className="text-gray-600 mb-4">{error}</p>
            <div className="space-x-3">
              <button
                onClick={() => router.back()}
                className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md font-medium transition-colors"
              >
                Go Back
              </button>
              <Link
                href="/"
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md font-medium transition-colors inline-block"
              >
                Home
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-6">
            <Link
              href="/"
              className="inline-flex items-center space-x-2 text-green-600 hover:text-green-700 transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
              <span>Back to Feed</span>
            </Link>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
            <p className="text-gray-500">Post not found</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <Link
            href="/"
            className="inline-flex items-center space-x-2 text-green-600 hover:text-green-700 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
            <span>Back to Feed</span>
          </Link>
        </div>

        {/* Post Content */}
        <div className="space-y-6">
          {/* Main Post */}
          <PostCard post={post} onUpdate={handlePostUpdate} />
          
          {/* Comments Section */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Comments ({post.comments?.length || 0})
            </h3>
            <Comments
              postId={post.id}
              isOpen={true}
              onClose={() => {}} // Not needed for dedicated page
              embedded={true} // New prop to indicate it's embedded in a page
            />
          </div>
        </div>
      </div>
    </div>
  )
}