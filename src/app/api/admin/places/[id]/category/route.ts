import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase-server'
import { revalidatePath } from 'next/cache'

const VALID_CATEGORIES = new Set(['eat', 'hotel', 'store', 'organisation', 'event', 'community', 'other'])
const VALID_SUBCATEGORIES: Record<string, Set<string>> = {
  eat: new Set(['restaurant', 'cafe', 'fast_food', 'bar', 'bakery', 'ice_cream']),
  store: new Set(['grocery', 'bakery', 'health_food', 'specialty', 'other_shop']),
  hotel: new Set(['hotel', 'hostel', 'bnb', 'retreat', 'other_stay']),
}

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
  const update: Record<string, any> = {}

  if (typeof body.category === 'string') {
    if (!VALID_CATEGORIES.has(body.category)) {
      return NextResponse.json({ error: `category must be one of ${[...VALID_CATEGORIES].join(', ')}` }, { status: 400 })
    }
    update.category = body.category
  }

  if ('subcategory' in body) {
    const sub = body.subcategory
    if (sub === null || sub === '') {
      update.subcategory = null
    } else if (typeof sub === 'string') {
      const cat = (update.category || body.parent_category) as string | undefined
      if (cat && VALID_SUBCATEGORIES[cat] && !VALID_SUBCATEGORIES[cat].has(sub)) {
        return NextResponse.json({ error: `subcategory '${sub}' not valid for category '${cat}'` }, { status: 400 })
      }
      update.subcategory = sub
    }
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'no category/subcategory provided' }, { status: 400 })
  }

  const admin = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
  const { data: place } = await admin.from('places').select('slug, country, city').eq('id', id).maybeSingle()
  const { error } = await admin.from('places').update(update).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (place?.slug) revalidatePath(`/place/${place.slug}`)
  if (place?.country) {
    const cs = place.country.toLowerCase().replace(/\s+/g, '-')
    revalidatePath(`/vegan-places/${cs}`)
    if (place.city) revalidatePath(`/vegan-places/${cs}/${place.city.toLowerCase().replace(/\s+/g, '-')}`)
  }
  return NextResponse.json({ ok: true, ...update })
}
