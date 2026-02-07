import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

// DELETE /api/packs/[id]/places/[placeId] - Remove place from pack
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; placeId: string }> }
) {
  try {
    const { id, placeId } = await params
    const supabase = await createClient()

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
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

    // Check if user is admin or moderator
    const { data: membership } = await supabase
      .from('pack_members')
      .select('role')
      .eq('pack_id', packId)
      .eq('user_id', session.user.id)
      .maybeSingle()

    if (!membership || !['admin', 'moderator'].includes(membership.role)) {
      return NextResponse.json(
        { error: 'Only admins and moderators can remove places' },
        { status: 403 }
      )
    }

    // Remove place from pack
    const { error } = await supabase
      .from('pack_places')
      .delete()
      .eq('id', placeId)
      .eq('pack_id', packId)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Pack Places API] Error:', error)
    return NextResponse.json(
      { error: 'Failed to remove place from pack' },
      { status: 500 }
    )
  }
}
