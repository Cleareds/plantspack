import { ImageResponse } from 'next/og'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

export const runtime = 'edge'
export const alt = 'PlantsPack Post'
export const size = {
  width: 1200,
  height: 630,
}
export const contentType = 'image/png'

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey)

    const { data: post } = await supabase
      .from('posts')
      .select(`
        content,
        images,
        image_url,
        users (
          username,
          first_name,
          last_name,
          avatar_url
        )
      `)
      .eq('id', id)
      .single()

    if (!post) {
      return new ImageResponse(
        (
          <div
            style={{
              fontSize: 60,
              background: 'white',
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            PlantsPack
          </div>
        ),
        { ...size }
      )
    }

    const userName = (post.users as any)?.first_name
      ? `${(post.users as any).first_name} ${(post.users as any).last_name || ''}`.trim()
      : (post.users as any)?.username || 'PlantsPack User'

    // Get first image if available
    const postImage = post.images?.[0] || post.image_url

    return new ImageResponse(
      (
        <div
          style={{
            background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '60px',
          }}
        >
          {postImage ? (
            <img
              src={postImage}
              alt="Post"
              style={{
                width: '100%',
                height: '400px',
                objectFit: 'cover',
                borderRadius: '12px',
                marginBottom: '20px',
              }}
            />
          ) : (
            <div
              style={{
                background: 'white',
                borderRadius: '12px',
                padding: '40px',
                marginBottom: '20px',
                width: '100%',
                maxHeight: '400px',
                overflow: 'hidden',
              }}
            >
              <p
                style={{
                  fontSize: 32,
                  color: '#1f2937',
                  margin: 0,
                  lineHeight: 1.4,
                }}
              >
                {post.content.substring(0, 200)}{post.content.length > 200 ? '...' : ''}
              </p>
            </div>
          )}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '20px',
              background: 'rgba(255, 255, 255, 0.95)',
              padding: '30px',
              borderRadius: '12px',
              width: '100%',
            }}
          >
            <div
              style={{
                fontSize: 28,
                fontWeight: 600,
                color: '#1f2937',
              }}
            >
              {userName}
            </div>
            <div
              style={{
                fontSize: 28,
                color: '#16a34a',
                fontWeight: 700,
              }}
            >
              · PlantsPack
            </div>
          </div>
        </div>
      ),
      { ...size }
    )
  } catch (error) {
    console.error('Error generating OG image:', error)
    return new ImageResponse(
      (
        <div
          style={{
            fontSize: 60,
            background: 'white',
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          PlantsPack
        </div>
      ),
      { ...size }
    )
  }
}
