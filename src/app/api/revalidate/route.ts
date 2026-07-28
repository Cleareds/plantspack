import { toSlug } from '@/lib/slug'
import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase-admin'

export async function POST(request: NextRequest) {
  try {
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

    // Revalidate a specific path if provided
    if (path) {
      revalidatePath(path)
      return NextResponse.json({ revalidated: true, path })
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
