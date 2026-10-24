import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/verify-queue?mode=fv|research&country=<name>&skip=<id,id,...>
 *
 * The "Fast verify" queue. One batch of up to 20 places the admin can decide
 * on with the keyboard:
 *   fv        fully_vegan rows nobody has confirmed through the UI yet
 *             (is_verified=false), strongest evidence first.
 *   research  places with an open CLI/research review row (proposed_action),
 *             any vegan level; the note is the evidence.
 * Rows acted on leave the queue by their own state change, so the client
 * reloads from the start and passes the ids it skipped instead of an offset.
 */
const BATCH = 20

async function checkAdmin() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return null
  const admin = createAdminClient()
  const { data: profile } = await admin.from('users').select('role').eq('id', session.user.id).single()
  return profile?.role === 'admin' ? admin : null
}

const PLACE_COLS = 'id, slug, name, city, country, address, website, phone, opening_hours, description, vegan_level, verification_level, verification_method, verification_status, is_verified, last_verified_at, source, tags, main_image_url, review_count, average_rating, created_at, updated_at'

export async function GET(request: NextRequest) {
  const admin = await checkAdmin()
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const sp = new URL(request.url).searchParams
  const mode = sp.get('mode') === 'research' ? 'research' : 'fv'
  const country = (sp.get('country') || '').trim()
  const skip = (sp.get('skip') || '').split(',').map(s => s.trim()).filter(s => /^[0-9a-f-]{36}$/i.test(s)).slice(0, 300)

  let places: any[] = []
  let total = 0
  const researchByPlace: Record<string, any[]> = {}

  if (mode === 'fv') {
    let q = admin
      .from('places')
      .select(PLACE_COLS, { count: 'exact' })
      .eq('vegan_level', 'fully_vegan')
      .eq('is_verified', false)
      .is('archived_at', null)
    if (country) q = q.eq('country', country)
    if (skip.length) q = q.not('id', 'in', `(${skip.join(',')})`)
    // Strongest evidence first: ladder level, then reviews, then websites.
    const { data, count, error } = await q
      .order('verification_level', { ascending: false })
      .order('review_count', { ascending: false })
      .order('updated_at', { ascending: false })
      .limit(BATCH)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    places = data || []
    total = count || 0
  } else {
    const q = admin
      .from('place_corrections')
      .select('id, place_id, note, corrections, created_at, places:place_id (' + PLACE_COLS + ')', { count: 'exact' })
      .eq('status', 'pending')
      .not('corrections->>proposed_action', 'is', null)
      .order('created_at', { ascending: true })
      .limit(200)
    const { data, count, error } = await q
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    total = count || 0
    const seen = new Set<string>()
    for (const row of (data || []) as any[]) {
      const pl = row.places as any
      if (!pl || pl.archived_at) continue
      if (country && pl.country !== country) continue
      if (skip.includes(pl.id)) continue
      if (!researchByPlace[pl.id]) researchByPlace[pl.id] = []
      researchByPlace[pl.id].push({ id: row.id, note: row.note, corrections: row.corrections, created_at: row.created_at })
      if (!seen.has(pl.id) && seen.size < BATCH) { seen.add(pl.id); places.push(pl) }
    }
  }

  const ids = places.map(p => p.id)
  if (ids.length) {
    // Open research rows + pending human reports for the batch, so the card
    // shows every signal we already hold before the admin opens anything.
    const [{ data: research }, { data: reports }] = await Promise.all([
      mode === 'fv'
        ? admin.from('place_corrections').select('id, place_id, note, corrections, created_at').eq('status', 'pending').not('corrections->>proposed_action', 'is', null).in('place_id', ids)
        : Promise.resolve({ data: [] as any[] }),
      admin.from('place_reports').select('id, place_id, type, note, created_at').eq('status', 'pending').in('place_id', ids),
    ])
    for (const r of research || []) {
      if (!researchByPlace[r.place_id]) researchByPlace[r.place_id] = []
      researchByPlace[r.place_id].push(r)
    }
    const reportsByPlace: Record<string, any[]> = {}
    for (const r of reports || []) (reportsByPlace[r.place_id] ||= []).push(r)
    places = places.map(p => ({ ...p, research: researchByPlace[p.id] || [], reports: reportsByPlace[p.id] || [] }))
  }

  return NextResponse.json({ mode, places, total })
}
