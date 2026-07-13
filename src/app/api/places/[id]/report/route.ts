import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'
import { createClient } from '@/lib/supabase-server'
import { revalidatePath } from 'next/cache'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const type = body?.type as string
    // Optional "how do you know?" evidence note. Capped so it can't be abused.
    const note = typeof body?.note === 'string' && body.note.trim()
      ? body.note.trim().slice(0, 500)
      : null

    const validTypes = ['confirmed', 'permanently_closed', 'temporarily_closed', 'hours_wrong', 'not_fully_vegan', 'not_vegan_friendly', 'non_vegan_chain', 'vegan_friendly_chain', 'few_vegan_options', 'actually_fully_vegan', 'duplicate', 'no_vegan_options']
    if (!validTypes.includes(type)) {
      return NextResponse.json({ error: 'Invalid report type' }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Best-effort: record who is reporting, if signed in. Never blocks the report.
    let reporterId: string | null = null
    try {
      const ssr = await createClient()
      const { data: { session } } = await ssr.auth.getSession()
      reporterId = session?.user?.id ?? null
    } catch { /* anonymous report */ }

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

    // Record a structured report row capturing the reporter + optional evidence
    // note. Additive to the tag above. Best-effort: if the place_reports table
    // isn't present yet, this quietly no-ops and the tag-based flow is unaffected.
    try {
      await supabase.from('place_reports').insert({
        place_id: id,
        user_id: reporterId,
        type,
        note,
      })
    } catch { /* table may not exist yet — tag write already succeeded */ }

    if (place.slug) revalidatePath(`/place/${place.slug}`)

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Failed to submit report' }, { status: 500 })
  }
}
