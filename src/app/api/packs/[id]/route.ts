import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

/**
 * GET /api/packs/[id] - Get pack details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    // Get current user
    const { data: { session } } = await supabase.auth.getSession()
    const userId = session?.user?.id

    // Check if id is a UUID or a slug
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)

    // Get pack with creator info
    let query = supabase
      .from('packs')
      .select(`
        id,
        creator_id,
        title,
        slug,
        description,
        banner_url,
        website_url,
        facebook_url,
        twitter_url,
        instagram_url,
        tiktok_url,
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
      `)

    // Query by UUID or slug
    if (isUUID) {
      query = query.eq('id', id)
    } else {
      query = query.eq('slug', id)
    }

    const { data: pack, error } = await query.single()

    if (error || !pack) {
      return NextResponse.json(
        { error: 'Pack not found' },
        { status: 404 }
      )
    }

    // Use the pack's actual UUID for all queries (not the slug)
    const packId = pack.id

    // Get stats
    const [memberCount, postCount, placesCount, membership, isFollowing] = await Promise.all([
      // Member count
      supabase
        .from('pack_members')
        .select('*', { count: 'exact', head: true })
        .eq('pack_id', packId)
        .then(({ count }) => count || 0),

      // Post count
      supabase
        .from('pack_posts')
        .select('*', { count: 'exact', head: true })
        .eq('pack_id', packId)
        .then(({ count }) => count || 0),

      // Places count
      supabase
        .from('pack_places')
        .select('*', { count: 'exact', head: true })
        .eq('pack_id', packId)
        .then(({ count }) => count || 0),

      // User membership
      userId
        ? supabase
            .from('pack_members')
            .select('role')
            .eq('pack_id', packId)
            .eq('user_id', userId)
            .maybeSingle()
        : Promise.resolve({ data: null }),

      // User following
      userId
        ? supabase
            .from('pack_follows')
            .select('id')
            .eq('pack_id', packId)
            .eq('user_id', userId)
            .maybeSingle()
            .then(({ data }) => !!data)
        : Promise.resolve(false)
    ])

    const packWithStats = {
      ...pack,
      member_count: memberCount,
      post_count: postCount,
      places_count: placesCount,
      is_member: !!membership.data,
      is_following: isFollowing,
      user_role: membership.data?.role || null
    }

    return NextResponse.json({ pack: packWithStats })
  } catch (error) {
    console.error('[Pack API] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch pack' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/packs/[id] - Update pack
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    // Check authentication
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id

    // Check if id is a UUID or a slug
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)

    // Verify user is pack creator
    let query = supabase
      .from('packs')
      .select('id, creator_id')

    // Query by UUID or slug
    if (isUUID) {
      query = query.eq('id', id)
    } else {
      query = query.eq('slug', id)
    }

    const { data: pack, error: packError } = await query.single()

    if (packError || !pack) {
      return NextResponse.json(
        { error: 'Pack not found' },
        { status: 404 }
      )
    }

    if (pack.creator_id !== userId) {
      return NextResponse.json(
        { error: 'Forbidden: Only pack creator can update' },
        { status: 403 }
      )
    }

    // Get update data
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

    // Validate title if provided
    if (title !== undefined && title.trim().length < 3) {
      return NextResponse.json(
        { error: 'Title must be at least 3 characters' },
        { status: 400 }
      )
    }

    // Build update object
    const updates: any = {}
    if (title !== undefined) updates.title = title.trim()
    if (description !== undefined) updates.description = description?.trim() || null
    if (banner_url !== undefined) updates.banner_url = banner_url || null
    if (website_url !== undefined) updates.website_url = website_url || null
    if (facebook_url !== undefined) updates.facebook_url = facebook_url || null
    if (twitter_url !== undefined) updates.twitter_url = twitter_url || null
    if (instagram_url !== undefined) updates.instagram_url = instagram_url || null
    if (tiktok_url !== undefined) updates.tiktok_url = tiktok_url || null
    if (categories !== undefined) {
      updates.categories = Array.isArray(categories) ? categories : []
      updates.category = updates.categories[0] || null
    } else if (category !== undefined) {
      updates.category = category || null
    }
    if (is_published !== undefined) updates.is_published = is_published

    // Update pack using the actual UUID
    const { data: updatedPack, error: updateError } = await supabase
      .from('packs')
      .update(updates)
      .eq('id', pack.id)
      .select()
      .single()

    if (updateError) {
      console.error('[Pack API] Error updating pack:', updateError)
      throw updateError
    }

    console.log('[Pack API] Pack updated:', pack.id)

    return NextResponse.json({ pack: updatedPack })
  } catch (error) {
    console.error('[Pack API] Error:', error)
    return NextResponse.json(
      { error: 'Failed to update pack' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/packs/[id] - Delete pack
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    // Check authentication
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id

    // Check if id is a UUID or a slug
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)

    // Verify user is pack creator
    let query = supabase
      .from('packs')
      .select('id, creator_id')

    // Query by UUID or slug
    if (isUUID) {
      query = query.eq('id', id)
    } else {
      query = query.eq('slug', id)
    }

    const { data: pack, error: packError } = await query.single()

    if (packError || !pack) {
      return NextResponse.json(
        { error: 'Pack not found' },
        { status: 404 }
      )
    }

    if (pack.creator_id !== userId) {
      return NextResponse.json(
        { error: 'Forbidden: Only pack creator can delete' },
        { status: 403 }
      )
    }

    // Delete pack using the actual UUID (cascade will delete members, posts, follows)
    const { error: deleteError } = await supabase
      .from('packs')
      .delete()
      .eq('id', pack.id)

    if (deleteError) {
      console.error('[Pack API] Error deleting pack:', deleteError)
      throw deleteError
    }

    console.log('[Pack API] Pack deleted:', pack.id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Pack API] Error:', error)
    return NextResponse.json(
      { error: 'Failed to delete pack' },
      { status: 500 }
    )
  }
}
