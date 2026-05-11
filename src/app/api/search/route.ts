import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'

// 10s edge cache + 60s SWR. Search queries repeat heavily across users
// ("vegan bakery berlin", "bodhi"…), so even short caching cuts Supabase
// hits meaningfully.
export const revalidate = 10

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const q = (url.searchParams.get('q') || '').trim()
  if (q.length < 2) {
    return NextResponse.json({ q, places: [], cities: [], recipes: [] })
  }

  const vl   = url.searchParams.get('vl')   || null
  const cat  = url.searchParams.get('cat')  || null
  const near = url.searchParams.get('near') || ''
  let nearLat: number | null = null
  let nearLng: number | null = null
  if (near) {
    const parts = near.split(',').map((s) => Number(s))
    if (parts.length === 2 && Number.isFinite(parts[0]) && Number.isFinite(parts[1])) {
      nearLat = parts[0]
      nearLng = parts[1]
    }
  }

  const sb = createAdminClient()
  const [placesRes, citiesRes, recipesRes] = await Promise.all([
    sb.rpc('search_places', {
      q, vl, cat,
      near_lat: nearLat,
      near_lng: nearLng,
      result_limit: 12,
    }),
    sb.rpc('search_cities', { q, vl, result_limit: 6 }),
    sb.rpc('search_recipes', { q, result_limit: 6 }),
  ])

  return NextResponse.json(
    {
      q,
      places:  placesRes.data  || [],
      cities:  citiesRes.data  || [],
      recipes: recipesRes.data || [],
    },
    {
      headers: {
        'Cache-Control': 's-maxage=10, stale-while-revalidate=60',
      },
    },
  )
}
