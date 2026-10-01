import { toSlug } from '@/lib/slug'
import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase-admin'
import { createClient } from '@/lib/supabase-server'
import { isAdmin } from '@/lib/place-owner'

export const dynamic = 'force-dynamic'

type Caller = 'secret' | 'admin' | 'user'

/**
 * Who is calling. This route used to be open to the world: anyone who knew
 * the URL could loop it to force materialized-view refreshes on Supabase and
 * mass ISR purges on Vercel (2026-09-17 cost audit). Now:
 *   - `Authorization: Bearer <REVALIDATE_SECRET>` (the place_reviews Postgres
 *     trigger reads it from Vault) or `<CRON_SECRET>` (CLI scripts) -> 'secret'
 *   - a signed-in admin -> 'admin'
 *   - any other signed-in user -> 'user' (AddPlaceModal after a place insert)
 *   - otherwise 401
 */
async function identifyCaller(request: NextRequest): Promise<Caller | null> {
  const auth = request.headers.get('authorization') ?? ''
  const secrets = [process.env.REVALIDATE_SECRET, process.env.CRON_SECRET].filter(Boolean) as string[]
  if (auth.startsWith('Bearer ') && secrets.some(s => auth === `Bearer ${s}`)) return 'secret'

  const supabaseUser = await createClient()
  const { data: { user } } = await supabaseUser.auth.getUser()
  if (!user) return null
  return (await isAdmin(createAdminClient(), user.id)) ? 'admin' : 'user'
}

export async function POST(request: NextRequest) {
  try {
    const caller = await identifyCaller(request)
    if (!caller) return NextResponse.json({ revalidated: false, error: 'Unauthorized' }, { status: 401 })

    const body = await request.json().catch(() => ({}))
    const { city, country, path, place_id, place_slug } = body

    // Place-page revalidation, called by the `place_reviews` Postgres trigger
    // (see supabase/migrations/20260728120000_place_review_revalidate.sql).
    //
    // The web review route already calls revalidatePath() itself, but the
    // mobile app upserts straight into `place_reviews` through the Supabase
    // client and never touches a Next route — so a mobile review stayed
    // invisible on the web for up to 24h (the place-page ISR window) while
    // showing up in the feed, which reads Supabase live. Doing this from a DB
    // trigger covers every client, present and future, with no app release.
    //
    // Deliberately narrower than the `path` branch below: it only ever
    // revalidates one place page, and the slug is re-resolved from the DB
    // rather than trusted from the payload.
    if (place_id || place_slug) {
      const supabase = createAdminClient()
      const isUuid = typeof place_id === 'string'
        && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(place_id)
      const { data } = await supabase
        .from('places')
        .select('id, slug')
        .eq(isUuid ? 'id' : 'slug', isUuid ? place_id : place_slug)
        .maybeSingle()
      if (!data) return NextResponse.json({ revalidated: false, reason: 'place not found' }, { status: 404 })
      if (data.slug) revalidatePath(`/place/${data.slug}`)
      revalidatePath(`/place/${data.id}`)
      return NextResponse.json({ revalidated: true, place: data.slug ?? data.id })
    }

    // Revalidate a specific path if provided. Arbitrary paths are a purge
    // primitive, so this stays with admins and server-to-server callers
    // (admin blog pages, CLI scripts).
    if (path) {
      if (caller === 'user') return NextResponse.json({ revalidated: false, error: 'Forbidden' }, { status: 403 })
      if (typeof path !== 'string' || !path.startsWith('/')) {
        return NextResponse.json({ revalidated: false, error: 'path must start with /' }, { status: 400 })
      }
      revalidatePath(path)
      return NextResponse.json({ revalidated: true, path })
    }

    // The directory refresh below is the expensive branch (a materialized
    // view refresh + purging every hub). A signed-in user reaches it only
    // right after adding a place (AddPlaceModal sends city + country); an
    // empty body is reserved for scripts and admins.
    if (caller === 'user' && !country) {
      return NextResponse.json({ revalidated: false, error: 'Forbidden' }, { status: 403 })
    }

    // Refresh materialized directory views so new cities/countries appear
    try {
      const supabase = createAdminClient()
      await supabase.rpc('refresh_directory_views')
    } catch {}

    // Always revalidate the main directory
    revalidatePath('/vegan-places')

    // Revalidate specific city/country pages if provided
    if (country) {
      const countrySlug = toSlug(country)
      revalidatePath(`/vegan-places/${countrySlug}`)
      if (city) {
        const citySlug = toSlug(city)
        revalidatePath(`/vegan-places/${countrySlug}/${citySlug}`)
      }
    }

    // Revalidate city ranks (scores change when places are added)
    revalidatePath('/city-ranks')

    return NextResponse.json({ revalidated: true })
  } catch {
    return NextResponse.json({ revalidated: false }, { status: 500 })
  }
}
