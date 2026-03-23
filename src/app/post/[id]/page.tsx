import { notFound } from 'next/navigation'
import { Metadata } from 'next'
import Link from 'next/link'
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
    // The API handles both UUIDs and slugs
    const response = await fetch(`${baseUrl}/api/posts/${id}`, {
      next: { revalidate: 60 }
    })
    if (!response.ok) return null
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

  const image = post.images?.[0] || post.image_url
  return {
    title: pageTitle,
    description,
    alternates: { canonical: `https://plantspack.com/post/${post.slug || id}` },
    openGraph: {
      title: pageTitle,
      description,
      type: 'article',
      siteName: 'PlantsPack',
      ...(image ? { images: [image] } : {}),
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
        {/* Breadcrumbs */}
        <nav className="flex items-center gap-2 text-sm text-on-surface-variant mb-6">
          <Link href="/" className="hover:text-primary transition-colors">Home</Link>
          <span className="text-outline">/</span>
          <span className="text-on-surface font-medium truncate max-w-[300px]">
            {post.title || 'Post'}
          </span>
        </nav>

        {/* Post Content */}
        <PostPageContent post={post} />
      </div>
    </div>
  )
}
