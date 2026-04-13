import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'

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

    const { data, error } = await admin
      .from('place_corrections')
      .select(`
        *,
        places:place_id (id, name, slug, address, city, country),
        users:user_id (id, username, first_name, last_name, avatar_url)
      `)
      .eq('status', status)
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
      const updateData: Record<string, any> = { ...correction.corrections, updated_at: new Date().toISOString() }

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

    return NextResponse.json({ success: true, action })
  } catch (error) {
    console.error('[Admin Corrections] Error:', error)
    return NextResponse.json({ error: 'Failed to process correction' }, { status: 500 })
  }
}
