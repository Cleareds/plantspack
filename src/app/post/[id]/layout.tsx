import { Metadata } from 'next'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params

  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey)

    const { data: post, error } = await supabase
      .from('posts')
      .select(`
        content,
        images,
        image_url,
        created_at,
        users (
          username,
          first_name,
          last_name
        )
      `)
      .eq('id', id)
      .single()

    if (error || !post) {
      return {
        title: 'Post not found | PlantsPack',
        description: 'This post could not be found.',
      }
    }

    const userName = (post.users as any)?.first_name
      ? `${(post.users as any).first_name} ${(post.users as any).last_name || ''}`.trim()
      : (post.users as any)?.username || 'PlantsPack User'

    // Get content excerpt (first 160 characters)
    const contentExcerpt = post.content.length > 160
      ? post.content.substring(0, 160) + '...'
      : post.content

    // Get first image if available
    const postImage = post.images?.[0] || post.image_url

    const title = `${userName} on PlantsPack`
    const description = contentExcerpt

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        type: 'article',
        publishedTime: post.created_at,
        authors: [userName],
        images: postImage ? [
          {
            url: postImage,
            width: 1200,
            height: 630,
            alt: `Post by ${userName}`,
          }
        ] : [],
      },
      twitter: {
        card: postImage ? 'summary_large_image' : 'summary',
        title,
        description,
        images: postImage ? [postImage] : [],
      },
    }
  } catch (error) {
    console.error('Error generating metadata:', error)
    return {
      title: 'PlantsPack',
      description: 'Join the plant-based community on PlantsPack',
    }
  }
}

export default function PostLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
