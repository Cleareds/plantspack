import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'
import { createNotification } from '@/lib/notifications/server'

// GET /api/admin/corrections - List corrections (admin only)
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = createAdminClient()
    const { data: profile } = await admin.from('users').select('role').eq('id', session.user.id).single()
    if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || 'pending'

    // Only genuine user-submitted corrections. CLI/research audit items carry a
    // synthetic `proposed_action` key and live on the Data Quality → Research
    // Review tab instead, so this page stays true to its "user-submitted" title.
    const { data, error } = await admin
      .from('place_corrections')
      .select(`
        *,
        places:place_id (id, name, slug, address, city, country),
        users:user_id (id, username, first_name, last_name, avatar_url)
      `)
      .eq('status', status)
      .is('corrections->>proposed_action', null)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) throw error

    return NextResponse.json({ corrections: data })
  } catch (error) {
    console.error('[Admin Corrections] Error:', error)
    return NextResponse.json({ error: 'Failed to fetch corrections' }, { status: 500 })
  }
}

// PUT /api/admin/corrections - Approve or reject a correction
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = createAdminClient()
    const { data: profile } = await admin.from('users').select('role').eq('id', session.user.id).single()
    if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { id, action } = await request.json()
    if (!id || !['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }

    // Get the correction
    const { data: correction, error: fetchError } = await admin
      .from('place_corrections')
      .select('*, places:place_id (id, name, slug, city, country)')
      .eq('id', id)
      .single()

    if (fetchError || !correction) {
      return NextResponse.json({ error: 'Correction not found' }, { status: 404 })
    }

    if (action === 'approve') {
      // Apply corrections to the place
      const corrections = { ...correction.corrections }
      const updateData: Record<string, any> = { updated_at: new Date().toISOString() }

      // Handle image append separately — merge with existing images
      if (corrections.append_images && Array.isArray(corrections.append_images)) {
        const { data: currentPlace } = await admin.from('places').select('images, main_image_url').eq('id', correction.place_id).single()
        const existingImages = currentPlace?.images || []
        updateData.images = [...existingImages, ...corrections.append_images]
        // Set main image if none exists
        if (!currentPlace?.main_image_url && corrections.append_images.length > 0) {
          updateData.main_image_url = corrections.append_images[0]
        }
        delete corrections.append_images
      }

      // Apply remaining field corrections
      Object.assign(updateData, corrections)

      const { error: updateError } = await admin
        .from('places')
        .update(updateData)
        .eq('id', correction.place_id)

      if (updateError) throw updateError

      // Revalidate place page
      try {
        const place = correction.places as any
        revalidatePath(`/place/${place?.slug || correction.place_id}`)
        if (place?.city && place?.country) {
          revalidatePath(`/vegan-places/${place.country.toLowerCase().replace(/\s+/g, '-')}/${place.city.toLowerCase().replace(/\s+/g, '-')}`)
        }
      } catch {}
    }

    // Update correction status
    const { error: statusError } = await admin
      .from('place_corrections')
      .update({
        status: action === 'approve' ? 'approved' : 'rejected',
        reviewed_by: session.user.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (statusError) throw statusError

    // Notify the user their correction was applied. Skip our own CLI/research
    // audit rows (they carry a synthetic proposed_action and aren't real user
    // submissions) and the no-actor reject case.
    // Notify the person who submitted the correction — on approve (it's live)
    // and on reject (we reviewed it and kept the current info). Research/CLI
    // rows (proposed_action set) have no human submitter to notify.
    const isResearchRow = (correction.corrections as Record<string, unknown> | null)?.proposed_action != null
    if (correction.user_id && !isResearchRow) {
      const place = correction.places as { name?: string } | null
      const name = place?.name || 'a place'
      if (action === 'approve') {
        await createNotification({
          userId: correction.user_id,
          type: 'correction_approved',
          entityType: 'place',
          entityId: correction.place_id,
          message: `Thanks! Your correction to ${name} is now live.`,
        })
      } else if (action === 'reject') {
        await createNotification({
          userId: correction.user_id,
          type: 'correction_dismissed',
          entityType: 'place',
          entityId: correction.place_id,
          message: `We reviewed your correction to ${name} and kept the current info for now. Thanks for helping keep Plants Pack accurate.`,
        })
      }
    }

    return NextResponse.json({ success: true, action })
  } catch (error) {
    console.error('[Admin Corrections] Error:', error)
    return NextResponse.json({ error: 'Failed to process correction' }, { status: 500 })
  }
}
