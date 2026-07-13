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

    // Community auto-actions: once 2+ DISTINCT signed-in users file the same
    // report, act without waiting for admin. Anonymous reports only flag for
    // review — they never count toward the threshold (abuse resistance).
    // Everything is reversible from the admin queue; nothing is deleted.
    //   no_vegan_options / permanently_closed → soft-archive (hidden from
    //     map/lists pending review)
    //   temporarily_closed → business_status banner (place stays visible)
    try {
      const AUTO_HIDE = ['no_vegan_options', 'permanently_closed']
      const AUTO_BANNER = ['temporarily_closed']
      if (AUTO_HIDE.includes(type) || AUTO_BANNER.includes(type)) {
        const { data: reports } = await supabase
          .from('place_reports')
          .select('user_id')
          .eq('place_id', id)
          .eq('type', type)
          .not('user_id', 'is', null)
        const distinct = new Set((reports ?? []).map((r) => r.user_id))
        if (distinct.size >= 2) {
          if (AUTO_HIDE.includes(type)) {
            const reason = type === 'no_vegan_options'
              ? `auto-hidden: ${distinct.size} community reports of no vegan options`
              : `auto-hidden: ${distinct.size} community reports of permanently closed`
            await supabase.from('places').update({
              archived_at: new Date().toISOString(),
              archived_reason: reason,
              ...(type === 'permanently_closed' ? { business_status: 'permanently_closed' } : {}),
              updated_at: new Date().toISOString(),
            }).eq('id', id).is('archived_at', null)
          } else {
            // .or covers NULL business_status (a bare .neq would skip NULL rows)
            await supabase.from('places').update({
              business_status: 'temporarily_closed',
              updated_at: new Date().toISOString(),
            }).eq('id', id).is('archived_at', null)
              .or('business_status.is.null,business_status.neq.permanently_closed')
          }
        }
      }
    } catch { /* best-effort — the report itself is already recorded */ }

    if (place.slug) revalidatePath(`/place/${place.slug}`)

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Failed to submit report' }, { status: 500 })
  }
}
