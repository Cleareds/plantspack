import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Create Supabase client
const getSupabase = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// GET /api/places/[id]/reviews - Fetch reviews for a place
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
      .from('place_reviews')
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
      .eq('place_id', id)
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
    console.error('[Place Reviews API] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch reviews' },
      { status: 500 }
    )
  }
}

// POST /api/places/[id]/reviews - Create or update a review
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
    const { rating, content } = body

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

    // Check if user already has a review for this place
    const { data: existingReview } = await supabase
      .from('place_reviews')
      .select('id, edit_count')
      .eq('place_id', id)
      .eq('user_id', session.user.id)
      .maybeSingle()

    let review
    let isUpdate = false

    if (existingReview) {
      // Update existing review
      const { data, error } = await supabase
        .from('place_reviews')
        .update({
          rating,
          content,
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
        .from('place_reviews')
        .insert({
          place_id: id,
          user_id: session.user.id,
          rating,
          content
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
    console.error('[Place Reviews API] Error:', error)
    console.error('[Place Reviews API] Error code:', error?.code)
    console.error('[Place Reviews API] Error details:', error?.details)
    console.error('[Place Reviews API] Error hint:', error?.hint)
    console.error('[Place Reviews API] Full error:', JSON.stringify(error, null, 2))

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

// DELETE /api/places/[id]/reviews - Soft delete a review
export async function DELETE(
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

    // Soft delete the review
    const { error } = await supabase
      .from('place_reviews')
      .update({ deleted_at: new Date().toISOString() })
      .eq('place_id', id)
      .eq('user_id', session.user.id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Place Reviews API] Error:', error)
    return NextResponse.json(
      { error: 'Failed to delete review' },
      { status: 500 }
    )
  }
}
