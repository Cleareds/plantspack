import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'

/**
 * GET /api/export/packs?format=csv|gpx — Supporter perk.
 *
 * Exports the signed-in user's Packs (their saved place collections) as a CSV
 * spreadsheet or a GPX file of waypoints they can load into Google Maps,
 * Organic Maps, maps.me, etc. for offline / on-the-road vegan travel.
 *
 * Auth comes from the session cookie (never a body param). Gated to paying
 * supporters (subscription_tier medium/premium).
 */
const SITE = 'https://www.plantspack.com'

function csvCell(v: unknown): string {
  const s = v == null ? '' : String(v)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}
function xmlEscape(v: unknown): string {
  return String(v ?? '').replace(/[<>&'"]/g, (c) => (
    { '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c] as string
  ))
}

export async function GET(req: NextRequest) {
  const format = (req.nextUrl.searchParams.get('format') || 'csv').toLowerCase()

  // Identify the caller from the session (cookie), not from any input.
  const authClient = await createClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Sign in to export your packs.' }, { status: 401 })
  }

  const admin = createAdminClient()
  const { data: me } = await admin
    .from('users')
    .select('subscription_tier, subscription_status')
    .eq('id', user.id)
    .maybeSingle()
  const isSupporter = ['medium', 'premium'].includes(me?.subscription_tier || '')
  if (!isSupporter) {
    return NextResponse.json({ error: 'Exporting packs is a Supporter perk.' }, { status: 403 })
  }

  const { data: packs } = await admin
    .from('packs')
    .select('id, title')
    .eq('creator_id', user.id)
  const packIds = (packs || []).map((p) => p.id)
  const titleById = new Map((packs || []).map((p) => [p.id, p.title]))

  type Row = {
    pack_id: string
    position: number | null
    places: {
      name: string | null; address: string | null; city: string | null; country: string | null
      latitude: number | null; longitude: number | null; website: string | null
      vegan_level: string | null; slug: string | null
    } | null
  }
  let rows: Row[] = []
  if (packIds.length) {
    const { data } = await admin
      .from('pack_places')
      .select('pack_id, position, places(name, address, city, country, latitude, longitude, website, vegan_level, slug)')
      .in('pack_id', packIds)
      .order('position', { ascending: true })
    rows = (data as unknown as Row[]) || []
  }

  const stamp = req.nextUrl.searchParams.get('t') || 'export'

  if (format === 'gpx') {
    const wpts = rows
      .filter((r) => r.places?.latitude != null && r.places?.longitude != null)
      .map((r) => {
        const p = r.places!
        const desc = [titleById.get(r.pack_id), p.vegan_level, [p.address, p.city, p.country].filter(Boolean).join(', '), p.slug ? `${SITE}/place/${p.slug}` : '']
          .filter(Boolean).join(' — ')
        return `  <wpt lat="${p.latitude}" lon="${p.longitude}">\n    <name>${xmlEscape(p.name)}</name>\n    <desc>${xmlEscape(desc)}</desc>\n  </wpt>`
      })
      .join('\n')
    const gpx = `<?xml version="1.0" encoding="UTF-8"?>\n<gpx version="1.1" creator="Plants Pack" xmlns="http://www.topografix.com/GPX/1/1">\n${wpts}\n</gpx>\n`
    return new NextResponse(gpx, {
      headers: {
        'Content-Type': 'application/gpx+xml; charset=utf-8',
        'Content-Disposition': `attachment; filename="plantspack-packs-${stamp}.gpx"`,
        'Cache-Control': 'no-store',
      },
    })
  }

  // CSV (default)
  const header = ['Pack', 'Name', 'Vegan level', 'Address', 'City', 'Country', 'Latitude', 'Longitude', 'Website', 'Plants Pack URL']
  const lines = [header.join(',')]
  for (const r of rows) {
    const p = r.places
    if (!p) continue
    lines.push([
      titleById.get(r.pack_id) ?? '', p.name ?? '', p.vegan_level ?? '', p.address ?? '', p.city ?? '',
      p.country ?? '', p.latitude ?? '', p.longitude ?? '', p.website ?? '', p.slug ? `${SITE}/place/${p.slug}` : '',
    ].map(csvCell).join(','))
  }
  return new NextResponse(lines.join('\n'), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="plantspack-packs-${stamp}.csv"`,
      'Cache-Control': 'no-store',
    },
  })
}
