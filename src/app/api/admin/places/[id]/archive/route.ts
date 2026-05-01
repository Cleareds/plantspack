import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase-server'
import { revalidatePath } from 'next/cache'

/**
 * Soft-archive a place. Used when admin verification surfaces a
 * permanently closed venue. Sets archived_at + archived_reason; the
 * row is NOT hard-deleted (project policy: never delete data).
 *
 * POST /api/admin/places/[id]/archive
 *   body: { reason?: string }   -- e.g. "permanently closed per Google"
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: profile } = await supabase.from('users').select('role').eq('id', session.user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json().catch(() => ({}))
  const reason: string = (typeof body.reason === 'string' && body.reason.trim()) || 'admin_marked_closed'

  const admin = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
  const { data: place } = await admin.from('places').select('slug, country, city').eq('id', id).maybeSingle()
  const { error } = await admin
    .from('places')
    .update({ archived_at: new Date().toISOString(), archived_reason: reason })
    .eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (place?.slug) revalidatePath(`/place/${place.slug}`)
  if (place?.country) {
    const cs = place.country.toLowerCase().replace(/\s+/g, '-')
    revalidatePath(`/vegan-places/${cs}`)
    if (place.city) revalidatePath(`/vegan-places/${cs}/${place.city.toLowerCase().replace(/\s+/g, '-')}`)
  }
  return NextResponse.json({ ok: true })
}
