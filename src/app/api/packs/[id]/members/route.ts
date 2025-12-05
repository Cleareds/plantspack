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
      .eq('pack_id', id)
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

    // Check if already a member
    const { data: existing } = await supabase
      .from('pack_members')
      .select('id')
      .eq('pack_id', id)
      .eq('user_id', session.user.id)
      .maybeSingle()

    if (existing) {
      return NextResponse.json(
        { error: 'Already a member' },
        { status: 400 }
      )
    }

    // Join pack
    const { data: member, error } = await supabase
      .from('pack_members')
      .insert({
        pack_id: id,
        user_id: session.user.id,
        role: 'member'
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ member }, { status: 201 })
  } catch (error) {
    console.error('[Pack Members API] Error:', error)
    return NextResponse.json(
      { error: 'Failed to join pack' },
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

    // Delete membership
    const { error } = await supabase
      .from('pack_members')
      .delete()
      .eq('pack_id', id)
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
