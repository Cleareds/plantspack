import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Create Supabase client
const getSupabase = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// GET /api/recipes/[id]/reviews - Fetch reviews for a recipe
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')

    const supabase = getSupabase()

    const { data: reviews, error, count } = await supabase
      .from('recipe_reviews')
      .select(`
        *,
        users (
          id,
          username,
          first_name,
          last_name,
          avatar_url
        )
      `, { count: 'exact' })
      .eq('post_id', id)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) throw error

    return NextResponse.json({
      reviews,
      total: count,
      hasMore: (offset + limit) < (count || 0)
    })
  } catch (error) {
    console.error('[Recipe Reviews API] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch reviews' },
      { status: 500 }
    )
  }
}

// POST /api/recipes/[id]/reviews - Create or update a review
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Create Supabase client with cookies for auth
    const cookieStore = await cookies()

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          },
        },
      }
    )

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check if user is banned
    const { data: profile } = await supabase
      .from('users')
      .select('is_banned')
      .eq('id', session.user.id)
      .single()

    if (profile?.is_banned) {
      return NextResponse.json(
        { error: 'Your account has been suspended' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { rating, content, images, video_url } = body

    // Validation
    if (!rating || !content) {
      return NextResponse.json(
        { error: 'Rating and content are required' },
        { status: 400 }
      )
    }

    if (rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: 'Rating must be between 1 and 5' },
        { status: 400 }
      )
    }

    if (content.length < 1 || content.length > 500) {
      return NextResponse.json(
        { error: 'Content must be between 1 and 500 characters' },
        { status: 400 }
      )
    }

    // Validate images array and video
    const reviewImages: string[] = Array.isArray(images) ? images.slice(0, 5) : []
    const reviewVideo: string | null = typeof video_url === 'string' && video_url.startsWith('http') ? video_url : null

    // Check if user already has a review for this recipe
    const { data: existingReview } = await supabase
      .from('recipe_reviews')
      .select('id, edit_count')
      .eq('post_id', id)
      .eq('user_id', session.user.id)
      .maybeSingle()

    let review
    let isUpdate = false

    if (existingReview) {
      // Update existing review
      const { data, error } = await supabase
        .from('recipe_reviews')
        .update({
          rating,
          content,
          images: reviewImages,
          video_url: reviewVideo,
          edited_at: new Date().toISOString(),
          edit_count: (existingReview.edit_count || 0) + 1,
          deleted_at: null // Restore if soft-deleted
        })
        .eq('id', existingReview.id)
        .select(`
          *,
          users (
            id,
            username,
            first_name,
            last_name,
            avatar_url
          )
        `)
        .single()

      if (error) throw error
      review = data
      isUpdate = true
    } else {
      // Create new review
      const { data, error } = await supabase
        .from('recipe_reviews')
        .insert({
          post_id: id,
          user_id: session.user.id,
          rating,
          content,
          images: reviewImages,
          video_url: reviewVideo,
        })
        .select(`
          *,
          users (
            id,
            username,
            first_name,
            last_name,
            avatar_url
          )
        `)
        .single()

      if (error) throw error
      review = data
    }

    return NextResponse.json(
      { review, updated: isUpdate },
      { status: isUpdate ? 200 : 201 }
    )
  } catch (error: any) {
    console.error('[Recipe Reviews API] Error:', error)
    console.error('[Recipe Reviews API] Error code:', error?.code)
    console.error('[Recipe Reviews API] Error details:', error?.details)
    console.error('[Recipe Reviews API] Error hint:', error?.hint)
    console.error('[Recipe Reviews API] Full error:', JSON.stringify(error, null, 2))

    return NextResponse.json(
      {
        error: 'Failed to create review',
        message: error?.message || String(error),
        code: error?.code,
        details: error?.details,
        hint: error?.hint
      },
      { status: 500 }
    )
  }
}

// DELETE /api/recipes/[id]/reviews - Soft delete a review
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Get auth session
    const cookieStore = await cookies()
    const authSupabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll() {},
        },
      }
    )

    const { data: { session } } = await authSupabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Use admin client to bypass RLS for the soft delete
    const adminSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { error } = await adminSupabase
      .from('recipe_reviews')
      .update({ deleted_at: new Date().toISOString() })
      .eq('post_id', id)
      .eq('user_id', session.user.id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('[Recipe Reviews API] Delete error:', error?.message || error)
    return NextResponse.json({ error: 'Failed to delete review' }, { status: 500 })
  }
}
