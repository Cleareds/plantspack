import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { type } = await request.json()

    const validTypes = ['confirmed', 'permanently_closed', 'hours_wrong', 'not_fully_vegan', 'not_vegan_friendly']
    if (!validTypes.includes(type)) {
      return NextResponse.json({ error: 'Invalid report type' }, { status: 400 })
    }

    const supabase = createAdminClient()

    if (type === 'confirmed') {
      // Just update timestamp — user confirms place is correct
      await supabase.from('places').update({ updated_at: new Date().toISOString() }).eq('id', id)
      return NextResponse.json({ success: true })
    }

    const { data: place, error: fetchError } = await supabase
      .from('places')
      .select('tags')
      .eq('id', id)
      .single()

    if (fetchError || !place) {
      return NextResponse.json({ error: 'Place not found' }, { status: 404 })
    }

    const tags = place.tags || []
    const reportTag = `community_report:${type}`

    if (!tags.includes(reportTag)) {
      const { error: updateError } = await supabase
        .from('places')
        .update({
          tags: [...tags, reportTag],
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)

      if (updateError) {
        return NextResponse.json({ error: 'Failed to save report' }, { status: 500 })
      }
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Failed to submit report' }, { status: 500 })
  }
}
