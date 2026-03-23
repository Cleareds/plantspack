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
  title?: string | null
  slug?: string | null
}

async function getPost(id: string): Promise<Post | null> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://plantspack.com'

    // Try fetching by slug first (for SEO-friendly URLs), then by UUID
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
    const endpoint = isUUID
      ? `${baseUrl}/api/posts/${id}`
      : `${baseUrl}/api/posts/by-slug/${id}`

    const response = await fetch(endpoint, {
      next: { revalidate: 60 }
    })

    if (!response.ok) {
      // If slug lookup fails, try as UUID anyway
      if (!isUUID) {
        const fallbackResponse = await fetch(`${baseUrl}/api/posts/${id}`, {
          next: { revalidate: 60 }
        })
        if (fallbackResponse.ok) {
          const data = await fallbackResponse.json()
          return data.post
        }
      }
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

  // Use title if available, otherwise fall back to content preview
  const pageTitle = post.title || `${username} on PlantsPack`

  const contentPreview = post.content.length > 160
    ? post.content.substring(0, 160) + '...'
    : post.content

  const description = post.title
    ? `${contentPreview} — by ${username}`
    : `${username}: ${contentPreview}`

  return {
    title: pageTitle,
    description,
    openGraph: {
      title: pageTitle,
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
    <div className="min-h-screen bg-surface">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <Link
            href="/"
            className="inline-flex items-center space-x-2 text-primary hover:text-primary-container transition-colors"
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
