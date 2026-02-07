import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

/**
 * GET /api/packs/[id]/members - Get pack members
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    // Check if id is UUID or slug
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)

    let packId = id

    // If it's a slug, resolve to UUID
    if (!isUUID) {
      const { data: pack, error: packError } = await supabase
        .from('packs')
        .select('id')
        .eq('slug', id)
        .single()

      if (packError || !pack) {
        return NextResponse.json(
          { error: 'Pack not found' },
          { status: 404 }
        )
      }

      packId = pack.id
    }

    const { data: members, error } = await supabase
      .from('pack_members')
      .select(`
        id,
        role,
        joined_at,
        users:user_id (
          id,
          username,
          first_name,
          last_name,
          avatar_url,
          subscription_tier
        )
      `)
      .eq('pack_id', packId)
      .order('joined_at', { ascending: false })

    if (error) throw error

    return NextResponse.json({ members })
  } catch (error) {
    console.error('[Pack Members API] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch members' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/packs/[id]/members - Join pack
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if id is UUID or slug
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)

    let packId = id

    // If it's a slug, resolve to UUID
    if (!isUUID) {
      const { data: pack, error: packError } = await supabase
        .from('packs')
        .select('id')
        .eq('slug', id)
        .single()

      if (packError || !pack) {
        return NextResponse.json(
          { error: 'Pack not found' },
          { status: 404 }
        )
      }

      packId = pack.id
    }

    // Check if already a member (including admin/moderator)
    const { data: existing } = await supabase
      .from('pack_members')
      .select('id, role')
      .eq('pack_id', packId)
      .eq('user_id', session.user.id)
      .maybeSingle()

    if (existing) {
      return NextResponse.json(
        {
          error: 'Already a member',
          role: existing.role,
          message: existing.role === 'admin'
            ? 'You are the pack creator/admin'
            : `You are already a ${existing.role} of this pack`
        },
        { status: 400 }
      )
    }

    // Join pack
    const { data: member, error } = await supabase
      .from('pack_members')
      .insert({
        pack_id: packId,
        user_id: session.user.id,
        role: 'member'
      })
      .select()
      .single()

    if (error) {
      console.error('[Pack Members API] Insert error:', {
        error,
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      })
      throw error
    }

    return NextResponse.json({ member }, { status: 201 })
  } catch (error: any) {
    console.error('[Pack Members API] Error:', {
      error,
      message: error?.message,
      stack: error?.stack
    })
    return NextResponse.json(
      { error: error?.message || 'Failed to join pack' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/packs/[id]/members - Leave pack
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if id is UUID or slug
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)

    let packId = id

    // If it's a slug, resolve to UUID
    if (!isUUID) {
      const { data: pack, error: packError } = await supabase
        .from('packs')
        .select('id')
        .eq('slug', id)
        .single()

      if (packError || !pack) {
        return NextResponse.json(
          { error: 'Pack not found' },
          { status: 404 }
        )
      }

      packId = pack.id
    }

    // Delete membership
    const { error } = await supabase
      .from('pack_members')
      .delete()
      .eq('pack_id', packId)
      .eq('user_id', session.user.id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Pack Members API] Error:', error)
    return NextResponse.json(
      { error: 'Failed to leave pack' },
      { status: 500 }
    )
  }
}
