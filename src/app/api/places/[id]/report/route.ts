import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'
import { revalidatePath } from 'next/cache'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { type } = await request.json()

    const validTypes = ['confirmed', 'permanently_closed', 'hours_wrong', 'not_fully_vegan', 'not_vegan_friendly', 'non_vegan_chain', 'vegan_friendly_chain', 'few_vegan_options', 'actually_fully_vegan']
    if (!validTypes.includes(type)) {
      return NextResponse.json({ error: 'Invalid report type' }, { status: 400 })
    }

    const supabase = createAdminClient()

    if (type === 'confirmed') {
      // User confirms → promote to community_verified so the amber "help
      // verify" banner disappears on next page load.
      await supabase.from('places').update({
        verification_status: 'community_verified',
        updated_at: new Date().toISOString(),
      }).eq('id', id)
      const { data } = await supabase.from('places').select('slug').eq('id', id).single()
      if (data?.slug) revalidatePath(`/place/${data.slug}`)
      return NextResponse.json({ success: true })
    }

    const { data: place, error: fetchError } = await supabase
      .from('places')
      .select('tags, slug')
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

    if (place.slug) revalidatePath(`/place/${place.slug}`)

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Failed to submit report' }, { status: 500 })
  }
}
