import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createAuthClient } from '@/lib/supabase-server'
import { slugifyCityOrCountry, slugToDisplay } from '@/lib/places/slugify'

function admin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

// GET — public. Returns paginated experiences for a city + aggregate summary.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ country: string; city: string }> }
) {
  const { country, city } = await params
  const countrySlug = slugifyCityOrCountry(country)
  const citySlug = slugifyCityOrCountry(city)

  const url = new URL(request.url)
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'))
  const pageSize = 20
  const offset = (page - 1) * pageSize

  const supa = admin()

  // Resolve a canonical display-cased city + country using the directory view
  // so the response carries the right casing for the UI.
  const { data: cityRow } = await supa
    .from('directory_cities')
    .select('city, country')
    .eq('city_slug', citySlug)
    .ilike('country', slugToDisplay(countrySlug))
    .order('place_count', { ascending: false })
    .limit(1)

  const canonicalCity = cityRow?.[0]?.city || slugToDisplay(citySlug)
  const canonicalCountry = cityRow?.[0]?.country || slugToDisplay(countrySlug)

  const [{ data: experiences, count }, { data: summaryRows }] = await Promise.all([
    supa
      .from('city_experiences')
      .select(
        `id, user_id, overall_rating, eating_out_rating, grocery_rating,
         summary, tips, best_neighborhoods, visited_period, images,
         edited_at, edit_count, created_at,
         users:user_id (id, username, first_name, last_name, avatar_url, subscription_tier)`,
        { count: 'exact' }
      )
      .eq('city_slug', citySlug)
      .eq('country_slug', countrySlug)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .range(offset, offset + pageSize - 1),
    supa
      .from('city_experiences_summary')
      .select('experience_count, avg_overall_rating, avg_eating_out_rating, avg_grocery_rating')
      .eq('city_slug', citySlug)
      .eq('country_slug', countrySlug)
      .limit(1),
  ])

  const summary = summaryRows?.[0] || {
    experience_count: 0,
    avg_overall_rating: null,
    avg_eating_out_rating: null,
    avg_grocery_rating: null,
  }

  return NextResponse.json({
    city: canonicalCity,
    country: canonicalCountry,
    citySlug,
    countrySlug,
    experiences: experiences || [],
    total: count || 0,
    page,
    pageSize,
    summary,
  })
}

// POST — authenticated. Upsert a city experience by (user_id, city_slug, country_slug).
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ country: string; city: string }> }
) {
  const { country, city } = await params
  const countrySlug = slugifyCityOrCountry(country)
  const citySlug = slugifyCityOrCountry(city)

  const authSupa = await createAuthClient()
  const { data: { session } } = await authSupa.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supa = admin()

  const { data: profile } = await supa.from('users').select('is_banned').eq('id', session.user.id).single()
  if (profile?.is_banned) return NextResponse.json({ error: 'Your account has been suspended' }, { status: 403 })

  const body = await request.json().catch(() => ({}))
  const overall = parseInt(body?.overall_rating)
  const eatingOut = body?.eating_out_rating == null ? null : parseInt(body.eating_out_rating)
  const grocery = body?.grocery_rating == null ? null : parseInt(body.grocery_rating)
  const summary = typeof body?.summary === 'string' ? body.summary.trim() : ''
  const tipsRaw: unknown[] = Array.isArray(body?.tips) ? body.tips : []
  const bestNeighborhoods = typeof body?.best_neighborhoods === 'string' ? body.best_neighborhoods.trim() : null
  const visitedPeriod = typeof body?.visited_period === 'string' ? body.visited_period.trim() : null

  // Validation
  if (!Number.isInteger(overall) || overall < 1 || overall > 5) {
    return NextResponse.json({ error: 'overall_rating must be an integer 1–5' }, { status: 400 })
  }
  for (const [k, v] of [['eating_out_rating', eatingOut], ['grocery_rating', grocery]] as const) {
    if (v !== null && (!Number.isInteger(v) || v < 1 || v > 5)) {
      return NextResponse.json({ error: `${k} must be an integer 1–5 or omitted` }, { status: 400 })
    }
  }
  if (summary.length < 30) {
    return NextResponse.json({ error: 'summary_too_short', message: 'Summary must be at least 30 characters.' }, { status: 400 })
  }
  if (summary.length > 1200) {
    return NextResponse.json({ error: 'summary_too_long', message: 'Summary must be 1200 characters or fewer.' }, { status: 400 })
  }
  const tips = tipsRaw
    .filter((t): t is string => typeof t === 'string' && t.trim().length > 0)
    .map(t => t.trim().slice(0, 200))
    .slice(0, 5)

  // Resolve canonical city+country names from directory_cities so stored
  // rows match the casing in the `places` table.
  const { data: cityRow } = await supa
    .from('directory_cities')
    .select('city, country')
    .eq('city_slug', citySlug)
    .ilike('country', slugToDisplay(countrySlug))
    .order('place_count', { ascending: false })
    .limit(1)

  const canonicalCity = cityRow?.[0]?.city || slugToDisplay(citySlug)
  const canonicalCountry = cityRow?.[0]?.country || slugToDisplay(countrySlug)

  // Upsert by (user_id, city_slug, country_slug).
  const { data: existing } = await supa
    .from('city_experiences')
    .select('id, edit_count')
    .eq('user_id', session.user.id)
    .eq('city_slug', citySlug)
    .eq('country_slug', countrySlug)
    .is('deleted_at', null)
    .maybeSingle()

  if (existing) {
    const { data, error } = await supa
      .from('city_experiences')
      .update({
        overall_rating: overall,
        eating_out_rating: eatingOut,
        grocery_rating: grocery,
        summary,
        tips,
        best_neighborhoods: bestNeighborhoods,
        visited_period: visitedPeriod,
        edited_at: new Date().toISOString(),
        edit_count: (existing.edit_count || 0) + 1,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id)
      .select('*')
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ experience: data, updated: true })
  }

  const { data, error } = await supa
    .from('city_experiences')
    .insert({
      user_id: session.user.id,
      city: canonicalCity,
      country: canonicalCountry,
      city_slug: citySlug,
      country_slug: countrySlug,
      overall_rating: overall,
      eating_out_rating: eatingOut,
      grocery_rating: grocery,
      summary,
      tips,
      best_neighborhoods: bestNeighborhoods,
      visited_period: visitedPeriod,
    })
    .select('*')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Revalidate the city page so the new experience + aggregate show up.
  const { revalidatePath } = await import('next/cache')
  revalidatePath(`/vegan-places/${countrySlug}/${citySlug}`)

  return NextResponse.json({ experience: data, updated: false })
}

// DELETE — authenticated. Soft-deletes the caller's own experience.
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ country: string; city: string }> }
) {
  const { country, city } = await params
  const countrySlug = slugifyCityOrCountry(country)
  const citySlug = slugifyCityOrCountry(city)

  const authSupa = await createAuthClient()
  const { data: { session } } = await authSupa.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supa = admin()
  const { error } = await supa
    .from('city_experiences')
    .update({ deleted_at: new Date().toISOString() })
    .eq('user_id', session.user.id)
    .eq('city_slug', citySlug)
    .eq('country_slug', countrySlug)
    .is('deleted_at', null)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { revalidatePath } = await import('next/cache')
  revalidatePath(`/vegan-places/${countrySlug}/${citySlug}`)

  return NextResponse.json({ success: true })
}
