import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase-server'
import { revalidatePath } from 'next/cache'
import { toSlug } from '@/lib/slug'

/**
 * Admin city-label fix from the country audit table. Imports leave labels
 * like "Lviv Urban Hromada" or "Kreis Wesel"; the public hub for the town
 * only lists the row once the city reads "Lviv". Revalidates the old and
 * the new city hub plus the place page.
 *
 * POST /api/admin/places/[id]/city
 *   body: { city: string }
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
  const city = typeof body.city === 'string' ? body.city.trim().replace(/\s+/g, ' ') : ''
  if (city.length < 2 || city.length > 80) {
    return NextResponse.json({ error: 'city must be 2-80 characters' }, { status: 400 })
  }

  const admin = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
  const { data: place } = await admin.from('places').select('slug, country, city').eq('id', id).maybeSingle()
  if (!place) return NextResponse.json({ error: 'not found' }, { status: 404 })
  if (place.city === city) return NextResponse.json({ ok: true, city })

  const { error } = await admin.from('places').update({ city }).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (place.slug) revalidatePath(`/place/${place.slug}`)
  if (place.country) {
    const cs = toSlug(place.country)
    revalidatePath(`/vegan-places/${cs}`)
    if (place.city) revalidatePath(`/vegan-places/${cs}/${toSlug(place.city)}`)
    revalidatePath(`/vegan-places/${cs}/${toSlug(city)}`)
  }
  return NextResponse.json({ ok: true, city, previous: place.city })
}
