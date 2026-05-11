import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'
import { normalizeQuery } from '@/lib/search/normalize'

// 10s edge cache + 60s SWR. Search queries repeat heavily across users
// ("vegan bakery berlin", "bodhi"…), so even short caching cuts Supabase
// hits meaningfully.
export const revalidate = 10

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const rawQ = (url.searchParams.get('q') || '').trim()
  if (rawQ.length < 2) {
    return NextResponse.json({ q: rawQ, places: [], cities: [], recipes: [] })
  }

  // Synonym + intent normalization: pull "100% vegan" -> vl filter,
  // map "roma" -> "Rome", "nyc" -> "New York", etc. URL ?vl / ?cat
  // params always win over inferred ones (the user clicked a chip).
  const normalized = normalizeQuery(rawQ, {
    existingVl: url.searchParams.get('vl'),
    existingCat: url.searchParams.get('cat'),
  })
  const q = normalized.q || rawQ
  const vl = normalized.vl || null
  const cat = normalized.cat || null

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
  const [placesRes, citiesRes, countriesRes, recipesRes] = await Promise.all([
    sb.rpc('search_places', {
      q, vl, cat,
      near_lat: nearLat,
      near_lng: nearLng,
      result_limit: 12,
    }),
    sb.rpc('search_cities', { q, vl, result_limit: 6 }),
    sb.rpc('search_countries', { q, vl, result_limit: 3 }),
    sb.rpc('search_recipes', { q, result_limit: 6 }),
  ])

  return NextResponse.json(
    {
      q: rawQ,
      normalized_q: q,
      inferred: { vl: normalized.vl || null, cat: normalized.cat || null },
      places:    placesRes.data    || [],
      cities:    citiesRes.data    || [],
      countries: countriesRes.data || [],
      recipes:   recipesRes.data   || [],
    },
    {
      headers: {
        'Cache-Control': 's-maxage=10, stale-while-revalidate=60',
      },
    },
  )
}
