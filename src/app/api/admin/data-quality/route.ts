import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'
import { createClient } from '@/lib/supabase-server'
import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, timeout: 25000, maxRetries: 1 })

function parseVerdict(text: string): 'fully_vegan' | 'not_fully_vegan' | 'closed' | 'uncertain' {
  const first = text.split('\n')[0].toUpperCase()
  if (first.includes('FULLY_VEGAN') && !first.includes('NOT')) return 'fully_vegan'
  if (first.includes('NOT_FULLY_VEGAN')) return 'not_fully_vegan'
  if (first.includes('CLOSED')) return 'closed'
  return 'uncertain'
}

/**
 * Verify a single place's vegan status. Tier 1 (gpt-4o-mini, description) first
 * for places with a usable description; escalate to Tier 2 (web-search) if Tier 1
 * comes back uncertain or no description. Returns the verdict + which tier was used.
 * Cost: ~$0.0001 (Tier 1 only) to ~$0.012 (Tier 1 uncertain → Tier 2).
 */
async function verifyVeganStatus(p: { name: string; description: string | null; city: string | null; country: string | null }): Promise<{ verdict: string; tier: 'tier1' | 'tier2' | 'error'; evidence: string }> {
  const location = [p.city, p.country].filter(Boolean).join(', ')
  const hasDesc = p.description && p.description.trim().length >= 30

  if (hasDesc) {
    const prompt = `Classify this place into one vegan category based only on the information provided.

Name: ${p.name}${location ? ` (${location})` : ''}
Description: ${(p.description || '').slice(0, 500)}

Rules:
- FULLY_VEGAN: description clearly states 100% vegan / plant-based only / no animal products
- NOT_FULLY_VEGAN: description mentions dairy, eggs, honey, meat, fish, or vegetarian options alongside vegan
- CLOSED: description or name indicates permanently closed
- UNCERTAIN: not enough information to decide confidently

Reply with exactly one of: FULLY_VEGAN / NOT_FULLY_VEGAN / CLOSED / UNCERTAIN
Then a one-sentence reason on the next line.`
    try {
      const r = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 80,
        temperature: 0,
      })
      const text = r.choices[0]?.message?.content?.trim() ?? ''
      const v = parseVerdict(text)
      if (v !== 'uncertain') {
        return { verdict: v, tier: 'tier1', evidence: text.split('\n').slice(1).join(' ').slice(0, 200) }
      }
    } catch (e: any) {
      return { verdict: 'uncertain', tier: 'error', evidence: e?.message?.slice(0, 200) || 'tier1-error' }
    }
  }

  // Escalate to Tier 2 web-search
  const prompt = `Is "${p.name}"${location ? ` in ${location}` : ''} a 100% fully vegan establishment (no animal products of any kind on the menu)?

Search for this specific place and check:
1. Is it confirmed 100% vegan (no meat, dairy, eggs, honey)?
2. Is it still open, or permanently closed?

Reply with exactly one of these verdicts on the first line, then a one-sentence reason:
FULLY_VEGAN - confirmed 100% vegan, currently open
NOT_FULLY_VEGAN - serves or sells animal products (even dairy/eggs)
CLOSED - permanently closed
UNCERTAIN - cannot find reliable information`
  try {
    const r = await openai.chat.completions.create({
      model: 'gpt-4o-mini-search-preview',
      messages: [{ role: 'user', content: prompt }],
    })
    const text = r.choices[0]?.message?.content?.trim() ?? ''
    return { verdict: parseVerdict(text), tier: 'tier2', evidence: text.split('\n').slice(1).join(' ').slice(0, 300) }
  } catch (e: any) {
    return { verdict: 'uncertain', tier: 'error', evidence: e?.message?.slice(0, 200) || 'tier2-error' }
  }
}

async function checkAdmin() {
  const supabaseUser = await createClient()
  const { data: { session } } = await supabaseUser.auth.getSession()
  if (!session) return null
  const supabase = createAdminClient()
  const { data: profile } = await supabase.from('users').select('role').eq('id', session.user.id).single()
  if (profile?.role !== 'admin') return null
  return supabase
}

const VEGAN_REPORT_TAGS = [
  'community_report:not_fully_vegan',
  'community_report:not_vegan_friendly',
  'community_report:non_vegan_chain',
  'community_report:vegan_friendly_chain',
  'community_report:few_vegan_options',
  'community_report:actually_fully_vegan',
  'google_review_flag',
]

export async function GET(request: NextRequest) {
  const supabase = await checkAdmin()
  if (!supabase) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const tab = searchParams.get('tab') || 'closed'
  const page = parseInt(searchParams.get('page') || '1')
  const limit = 30
  const offset = (page - 1) * limit

  if (tab === 'closed') {
    const { data, count } = await supabase
      .from('places')
      .select('id, name, slug, city, country, tags, website, updated_at', { count: 'exact' })
      .contains('tags', ['google_confirmed_closed'])
      .is('archived_at', null)
      .order('updated_at', { ascending: false })
      .range(offset, offset + limit - 1)
    return NextResponse.json({ places: data || [], total: count || 0 })
  }

  if (tab === 'temp_closed') {
    const { data, count } = await supabase
      .from('places')
      .select('id, name, slug, city, country, tags, website, updated_at', { count: 'exact' })
      .contains('tags', ['google_temporarily_closed'])
      .is('archived_at', null)
      .order('updated_at', { ascending: false })
      .range(offset, offset + limit - 1)
    return NextResponse.json({ places: data || [], total: count || 0 })
  }

  if (tab === 'unreachable') {
    const { data, count } = await supabase
      .from('places')
      .select('id, name, slug, city, country, tags, website, updated_at', { count: 'exact' })
      .contains('tags', ['website_unreachable'])
      .is('archived_at', null)
      .order('updated_at', { ascending: false })
      .range(offset, offset + limit - 1)
    return NextResponse.json({ places: data || [], total: count || 0 })
  }

  if (tab === 'reported_closed') {
    const { data, count } = await supabase
      .from('places')
      .select('id, name, slug, city, country, tags, website, updated_at', { count: 'exact' })
      .contains('tags', ['community_report:permanently_closed'])
      .is('archived_at', null)
      .order('updated_at', { ascending: false })
      .range(offset, offset + limit - 1)
    return NextResponse.json({ places: data || [], total: count || 0 })
  }

  if (tab === 'reported_hours') {
    const { data, count } = await supabase
      .from('places')
      .select('id, name, slug, city, country, tags, website, opening_hours, updated_at', { count: 'exact' })
      .contains('tags', ['community_report:hours_wrong'])
      .is('archived_at', null)
      .order('updated_at', { ascending: false })
      .range(offset, offset + limit - 1)
    return NextResponse.json({ places: data || [], total: count || 0 })
  }

  if (tab === 'not_vegan') {
    const { data, count } = await supabase
      .from('places')
      .select('id, name, slug, city, country, tags, vegan_level, website, updated_at', { count: 'exact' })
      .or(VEGAN_REPORT_TAGS.map(t => `tags.cs.{${t}}`).join(','))
      .is('archived_at', null)
      .order('updated_at', { ascending: false })
      .range(offset, offset + limit - 1)
    return NextResponse.json({ places: data || [], total: count || 0 })
  }

  if (tab === 'unverified_fv') {
    // 100% vegan places with no websearch verification tag yet. The long tail
    // after today's bulk verification - mostly small/local places where web
    // search couldn't find enough info to make a call.
    const { data, count } = await supabase
      .from('places')
      .select('id, name, slug, city, country, tags, vegan_level, website, updated_at, description', { count: 'exact' })
      .eq('vegan_level', 'fully_vegan')
      .is('archived_at', null)
      .not('tags', 'cs', '{websearch_confirmed_vegan}')
      .not('tags', 'cs', '{websearch_review_flag}')
      .not('tags', 'cs', '{websearch_confirmed_closed}')
      .order('updated_at', { ascending: false })
      .range(offset, offset + limit - 1)
    return NextResponse.json({ places: data || [], total: count || 0 })
  }

  if (tab === 'corrections') {
    const { data, count } = await supabase
      .from('place_corrections')
      .select('id, place_id, user_id, corrections, note, status, created_at, places(id, name, slug, city, country)', { count: 'exact' })
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (!data || data.length === 0) return NextResponse.json({ corrections: [], total: count || 0 })

    const userIds = [...new Set(data.map((r: any) => r.user_id).filter(Boolean))]
    const { data: users } = userIds.length
      ? await supabase.from('users').select('id, username').in('id', userIds)
      : { data: [] }
    const userMap = Object.fromEntries((users || []).map((u: any) => [u.id, u]))
    const enriched = data.map((r: any) => ({ ...r, users: userMap[r.user_id] || null }))
    return NextResponse.json({ corrections: enriched, total: count || 0 })
  }

  if (tab === 'stats') {
    const veganReportOr = VEGAN_REPORT_TAGS.map(t => `tags.cs.{${t}}`).join(',')
    const [
      { count: totalPlaces },
      { count: googleClosed },
      { count: googleTempClosed },
      { count: unreachable },
      { count: possiblyClosed },
      { count: reportedClosed },
      { count: reportedHours },
      { count: pendingCorrections },
      { count: googleNotFound },
      { count: reportedNotVegan },
      { count: unverifiedFullyVegan },
    ] = await Promise.all([
      supabase.from('places').select('id', { count: 'exact', head: true }).is('archived_at', null),
      supabase.from('places').select('id', { count: 'exact', head: true }).is('archived_at', null).contains('tags', ['google_confirmed_closed']),
      supabase.from('places').select('id', { count: 'exact', head: true }).is('archived_at', null).contains('tags', ['google_temporarily_closed']),
      supabase.from('places').select('id', { count: 'exact', head: true }).is('archived_at', null).contains('tags', ['website_unreachable']),
      supabase.from('places').select('id', { count: 'exact', head: true }).is('archived_at', null).contains('tags', ['possibly_closed']),
      supabase.from('places').select('id', { count: 'exact', head: true }).is('archived_at', null).contains('tags', ['community_report:permanently_closed']),
      supabase.from('places').select('id', { count: 'exact', head: true }).is('archived_at', null).contains('tags', ['community_report:hours_wrong']),
      supabase.from('place_corrections').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('places').select('id', { count: 'exact', head: true }).is('archived_at', null).contains('tags', ['google_not_found']),
      supabase.from('places').select('id', { count: 'exact', head: true }).is('archived_at', null).or(veganReportOr),
      supabase.from('places').select('id', { count: 'exact', head: true })
        .eq('vegan_level', 'fully_vegan').is('archived_at', null)
        .not('tags', 'cs', '{websearch_confirmed_vegan}')
        .not('tags', 'cs', '{websearch_review_flag}')
        .not('tags', 'cs', '{websearch_confirmed_closed}'),
    ])

    return NextResponse.json({
      stats: {
        totalPlaces: totalPlaces || 0,
        googleClosed: googleClosed || 0,
        googleTempClosed: googleTempClosed || 0,
        unreachable: unreachable || 0,
        possiblyClosed: possiblyClosed || 0,
        reportedClosed: reportedClosed || 0,
        reportedHours: reportedHours || 0,
        pendingCorrections: pendingCorrections || 0,
        googleNotFound: googleNotFound || 0,
        reportedNotVegan: reportedNotVegan || 0,
        unverifiedFullyVegan: unverifiedFullyVegan || 0,
      }
    })
  }

  return NextResponse.json({ error: 'Invalid tab' }, { status: 400 })
}

// DELETE: soft-archive a flagged place
export async function DELETE(request: NextRequest) {
  const supabase = await checkAdmin()
  if (!supabase) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { placeId, reason } = await request.json()
  if (!placeId) return NextResponse.json({ error: 'Missing placeId' }, { status: 400 })

  const { data: place } = await supabase.from('places').select('slug, city, country').eq('id', placeId).single()

  const { error } = await supabase
    .from('places')
    .update({ archived_at: new Date().toISOString(), archived_reason: reason || 'admin_removed' })
    .eq('id', placeId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { revalidatePath } = await import('next/cache')
  if (place?.slug) revalidatePath(`/place/${place.slug}`)
  revalidatePath('/vegan-places')
  if (place?.country) {
    const countrySlug = place.country.toLowerCase().replace(/\s+/g, '-')
    revalidatePath(`/vegan-places/${countrySlug}`)
    if (place.city) revalidatePath(`/vegan-places/${countrySlug}/${place.city.toLowerCase().replace(/\s+/g, '-')}`)
  }
  revalidatePath('/city-ranks')

  return NextResponse.json({ success: true })
}

// PUT: bulk archive or dismiss a list of places
export async function PUT(request: NextRequest) {
  const supabase = await checkAdmin()
  if (!supabase) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { placeIds, action, removeTag, reason } = body
  if (!Array.isArray(placeIds) || placeIds.length === 0)
    return NextResponse.json({ error: 'Missing placeIds' }, { status: 400 })

  const { revalidatePath } = await import('next/cache')

  if (action === 'verify_vegan') {
    // Run the verifier on each placeId. Tier 1 if description present, else
    // Tier 2 web-search. Updates tags + verification_status accordingly.
    // Cost guard: cap at 50 places per request to keep individual API calls bounded.
    if (placeIds.length > 50) return NextResponse.json({ error: 'Max 50 places per verify request' }, { status: 400 })
    const { data: places } = await supabase
      .from('places')
      .select('id, name, description, city, country, tags')
      .in('id', placeIds)
    const results: Array<{ id: string; verdict: string; tier: string }> = []
    for (const p of places || []) {
      const r = await verifyVeganStatus(p as any)
      // Apply tag updates per verdict (mirrors bulk-verify-vegan-fast behaviour)
      let tags = [...((p as any).tags || [])]
      const updates: Record<string, any> = { updated_at: new Date().toISOString() }
      if (r.verdict === 'fully_vegan') {
        if (!tags.includes('websearch_confirmed_vegan')) tags.push('websearch_confirmed_vegan')
        tags = tags.filter((t: string) => t !== 'websearch_review_flag')
        updates.tags = tags
        updates.verification_status = 'scraping_verified'
      } else if (r.verdict === 'not_fully_vegan') {
        if (!tags.includes('websearch_review_flag')) tags.push('websearch_review_flag')
        tags = tags.filter((t: string) => t !== 'websearch_confirmed_vegan')
        updates.tags = tags
      } else if (r.verdict === 'closed') {
        if (!tags.includes('websearch_confirmed_closed')) tags.push('websearch_confirmed_closed')
        updates.tags = tags
      }
      if (updates.tags) await supabase.from('places').update(updates).eq('id', (p as any).id)
      results.push({ id: (p as any).id, verdict: r.verdict, tier: r.tier })
    }
    return NextResponse.json({ success: true, results })
  }

  if (action === 'archive') {
    const { data: places } = await supabase
      .from('places')
      .select('slug, city, country')
      .in('id', placeIds)

    const { error } = await supabase
      .from('places')
      .update({ archived_at: new Date().toISOString(), archived_reason: reason || 'admin_removed' })
      .in('id', placeIds)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const pathsToRevalidate = new Set<string>(['/vegan-places', '/city-ranks'])
    for (const place of places || []) {
      if (place.slug) pathsToRevalidate.add(`/place/${place.slug}`)
      if (place.country) {
        const cs = place.country.toLowerCase().replace(/\s+/g, '-')
        pathsToRevalidate.add(`/vegan-places/${cs}`)
        if (place.city) pathsToRevalidate.add(`/vegan-places/${cs}/${place.city.toLowerCase().replace(/\s+/g, '-')}`)
      }
    }
    for (const path of pathsToRevalidate) revalidatePath(path)

    return NextResponse.json({ success: true, archived: placeIds.length })
  }

  if (action === 'dismiss' && removeTag) {
    const { data: places } = await supabase
      .from('places')
      .select('id, tags')
      .in('id', placeIds)

    const updates = (places || []).map((p: any) => ({
      id: p.id,
      tags: (p.tags || []).filter((t: string) => t !== removeTag),
      updated_at: new Date().toISOString(),
    }))

    for (const u of updates) {
      await supabase.from('places').update({ tags: u.tags, updated_at: u.updated_at }).eq('id', u.id)
    }

    return NextResponse.json({ success: true, dismissed: placeIds.length })
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
}

// PATCH: remove a tag and/or update vegan_level
export async function PATCH(request: NextRequest) {
  const supabase = await checkAdmin()
  if (!supabase) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { placeId, removeTag, setVeganLevel, clearVeganReportTags } = body
  if (!placeId) return NextResponse.json({ error: 'Missing placeId' }, { status: 400 })

  const { data: place } = await supabase.from('places').select('tags, slug, city, country').eq('id', placeId).single()
  if (!place) return NextResponse.json({ error: 'Place not found' }, { status: 404 })

  let tags: string[] = place.tags || []
  if (clearVeganReportTags) tags = tags.filter((t: string) => !VEGAN_REPORT_TAGS.includes(t))
  if (removeTag) tags = tags.filter((t: string) => t !== removeTag)

  const update: Record<string, any> = { tags, updated_at: new Date().toISOString() }
  if (setVeganLevel) update.vegan_level = setVeganLevel

  const { error } = await supabase.from('places').update(update).eq('id', placeId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (setVeganLevel || clearVeganReportTags) {
    const { revalidatePath } = await import('next/cache')
    if (place.slug) revalidatePath(`/place/${place.slug}`)
    if (place.country && place.city) {
      const cs = place.country.toLowerCase().replace(/\s+/g, '-')
      const ci = place.city.toLowerCase().replace(/\s+/g, '-')
      revalidatePath(`/vegan-places/${cs}/${ci}`)
    }
    revalidatePath('/city-ranks')
  }

  return NextResponse.json({ success: true })
}
