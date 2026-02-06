import { notFound } from 'next/navigation'
import { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import PostPageContent from '@/components/posts/PostPageContent'
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

async function getPost(id: string): Promise<Post | null> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://plantspack.com'
    const response = await fetch(`${baseUrl}/api/posts/${id}`, {
      next: { revalidate: 60 }
    })

    if (!response.ok) {
      return null
    }

    const data = await response.json()
    return data.post
  } catch (error) {
    console.error('Error fetching post:', error)
    return null
  }
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  const post = await getPost(id)

  if (!post) {
    return {
      title: 'Post Not Found - PlantsPack'
    }
  }

  const username = post.users.first_name
    ? `${post.users.first_name} ${post.users.last_name || ''}`.trim()
    : `@${post.users.username}`

  const contentPreview = post.content.length > 160
    ? post.content.substring(0, 160) + '...'
    : post.content

  const description = `${username}: ${contentPreview}`

  return {
    title: `${username} on PlantsPack`,
    description,
    openGraph: {
      title: `${username} on PlantsPack`,
      description,
      type: 'article',
      siteName: 'PlantsPack',
      images: post.image_url ? [post.image_url] : undefined
    }
  }
}

export default async function PostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const post = await getPost(id)

  if (!post) {
    notFound()
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
        <PostPageContent post={post} />
      </div>
    </div>
  )
}
