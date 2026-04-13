import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'

// POST /api/places/[id]/corrections - Submit a correction
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

    const body = await request.json()
    const { corrections, note } = body

    if (!corrections || typeof corrections !== 'object' || Object.keys(corrections).length === 0) {
      return NextResponse.json({ error: 'No corrections provided' }, { status: 400 })
    }

    const admin = createAdminClient()

    // Verify place exists
    const { data: place } = await admin.from('places').select('id').eq('id', id).single()
    if (!place) {
      return NextResponse.json({ error: 'Place not found' }, { status: 404 })
    }

    // Insert correction
    const { data, error } = await admin
      .from('place_corrections')
      .insert({
        place_id: id,
        user_id: session.user.id,
        corrections,
        note: note || null,
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ correction: data })
  } catch (error) {
    console.error('[Corrections API] Error:', error)
    return NextResponse.json({ error: 'Failed to submit correction' }, { status: 500 })
  }
}
