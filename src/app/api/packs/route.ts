import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { PACK_LIMITS, type PackCategory, type SubscriptionTier } from '@/types/packs'

/**
 * GET /api/packs - List all packs with filters
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)

    // Get filter parameters
    const category = searchParams.get('category') as PackCategory | null
    const search = searchParams.get('search')
    const creatorId = searchParams.get('creator_id')
    const sort = searchParams.get('sort') || 'recent'
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Get current user for membership/follow info
    const { data: { session } } = await supabase.auth.getSession()
    const userId = session?.user?.id

    // Build query
    let query = supabase
      .from('packs')
      .select(`
        id,
        creator_id,
        title,
        description,
        banner_url,
        category,
        categories,
        is_published,
        view_count,
        created_at,
        updated_at,
        users:creator_id (
          id,
          username,
          first_name,
          last_name,
          avatar_url,
          subscription_tier
        )
      `, { count: 'exact' })
      .eq('is_published', true)

    // Apply filters
    if (category) {
      query = query.contains('categories', [category])
    }

    if (search) {
      query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`)
    }

    if (creatorId) {
      query = query.eq('creator_id', creatorId)
    }

    // Apply sorting
    switch (sort) {
      case 'popular':
        query = query.order('view_count', { ascending: false })
        break
      case 'posts':
        // TODO: Need to join with pack_posts count
        query = query.order('created_at', { ascending: false })
        break
      case 'recent':
      default:
        query = query.order('created_at', { ascending: false })
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1)

    const { data: packs, error, count } = await query

    if (error) {
      console.error('[Packs API] Error fetching packs:', error)
      throw error
    }

    // For each pack, get member count, post count, and user's membership status
    const packsWithStats = await Promise.all(
      (packs || []).map(async (pack) => {
        const [memberCount, postCount, membership, isFollowing] = await Promise.all([
          // Get member count
          supabase
            .from('pack_members')
            .select('*', { count: 'exact', head: true })
            .eq('pack_id', pack.id)
            .then(({ count }) => count || 0),

          // Get post count
          supabase
            .from('pack_posts')
            .select('*', { count: 'exact', head: true })
            .eq('pack_id', pack.id)
            .then(({ count }) => count || 0),

          // Check if user is a member
          userId
            ? supabase
                .from('pack_members')
                .select('role')
                .eq('pack_id', pack.id)
                .eq('user_id', userId)
                .maybeSingle()
            : Promise.resolve({ data: null }),

          // Check if user is following
          userId
            ? supabase
                .from('pack_follows')
                .select('id')
                .eq('pack_id', pack.id)
                .eq('user_id', userId)
                .maybeSingle()
                .then(({ data }) => !!data)
            : Promise.resolve(false)
        ])

        return {
          ...pack,
          member_count: memberCount,
          post_count: postCount,
          is_member: !!membership.data,
          is_following: isFollowing,
          user_role: membership.data?.role || null
        }
      })
    )

    return NextResponse.json({
      packs: packsWithStats,
      total: count,
      hasMore: (offset + limit) < (count || 0)
    })
  } catch (error) {
    console.error('[Packs API] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch packs' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/packs - Create a new pack
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check authentication
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id

    // Get user's subscription tier
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('subscription_tier')
      .eq('id', userId)
      .single()

    if (userError) {
      console.error('[Packs API] Error fetching user:', userError)
      throw userError
    }

    const tier = (user?.subscription_tier || 'free') as SubscriptionTier

    // Check pack limit
    const { count: existingPacksCount } = await supabase
      .from('packs')
      .select('*', { count: 'exact', head: true })
      .eq('creator_id', userId)

    const limit = PACK_LIMITS[tier]

    if ((existingPacksCount || 0) >= limit) {
      return NextResponse.json(
        {
          error: `Pack limit reached. ${tier} tier allows ${limit} pack${limit === 1 ? '' : 's'}.`,
          tier,
          limit,
          current: existingPacksCount
        },
        { status: 403 }
      )
    }

    // Get request body
    const body = await request.json()
    const {
      title,
      description,
      banner_url,
      website_url,
      facebook_url,
      twitter_url,
      instagram_url,
      tiktok_url,
      category,
      categories,
      is_published
    } = body

    // Validate required fields
    if (!title || title.trim().length < 3) {
      return NextResponse.json(
        { error: 'Title must be at least 3 characters' },
        { status: 400 }
      )
    }

    // Create pack
    const resolvedCategories = Array.isArray(categories) && categories.length > 0
      ? categories
      : (category ? [category] : [])

    const { data: pack, error: createError } = await supabase
      .from('packs')
      .insert({
        creator_id: userId,
        title: title.trim(),
        description: description?.trim() || null,
        banner_url: banner_url || null,
        website_url: website_url || null,
        facebook_url: facebook_url || null,
        twitter_url: twitter_url || null,
        instagram_url: instagram_url || null,
        tiktok_url: tiktok_url || null,
        category: resolvedCategories[0] || null,
        categories: resolvedCategories,
        is_published: is_published || false
      })
      .select()
      .single()

    if (createError) {
      console.error('[Packs API] Error creating pack:', createError)
      throw createError
    }

    console.log('[Packs API] Pack created:', pack.id)

    return NextResponse.json({ pack }, { status: 201 })
  } catch (error) {
    console.error('[Packs API] Error:', error)
    return NextResponse.json(
      { error: 'Failed to create pack' },
      { status: 500 }
    )
  }
}
