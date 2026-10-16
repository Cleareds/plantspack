import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'
import { PLACE_COLS, slimPlace } from '@/lib/directory-data'

/**
 * GET /api/places/cards?ids=<uuid>,<uuid>,... (max 60)
 * Full card data for the places the hub list shows on the current page.
 * The hubs ship only light records for the whole city (see
 * src/lib/city-list-light.ts); the client fetches a page of cards here.
 * Cached at the edge: card data changes rarely and the ids are stable.
 */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const MAX_IDS = 60

export async function GET(request: NextRequest) {
  const raw = new URL(request.url).searchParams.get('ids') || ''
  const ids = [...new Set(raw.split(',').map(s => s.trim()).filter(s => UUID.test(s)))].slice(0, MAX_IDS)
  if (ids.length === 0) return NextResponse.json({ places: [] }, { status: 400 })
  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase.from('places').select(PLACE_COLS).in('id', ids).is('archived_at', null)
    if (error) throw error
    return NextResponse.json(
      { places: (data || []).map(slimPlace) },
      { headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' } },
    )
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Failed' }, { status: 500 })
  }
}
