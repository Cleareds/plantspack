import { NextRequest, NextResponse } from 'next/server'
import { getCityPlacesDirect, getCountryPlacesDirect } from '@/lib/directory-data'
import { toLightPlace } from '@/lib/city-list-light'

/**
 * GET /api/places/light?country=<slug>[&city=<slug>]
 * Light rows (id, slug, name, category, level, coords, rating) for every
 * place in a city or country. The hubs no longer embed these in the HTML;
 * the client list fetches them the first time it needs to filter, sort,
 * page or draw the map. Edge-cached for an hour (next.config headers).
 */
const SLUG = /^[\w.'%-]{1,100}$/i

export async function GET(request: NextRequest) {
  const sp = new URL(request.url).searchParams
  const country = sp.get('country') || ''
  const city = sp.get('city') || ''
  if (!SLUG.test(country) || (city && !SLUG.test(city))) return NextResponse.json({ places: [] }, { status: 400 })
  try {
    const { places } = city ? await getCityPlacesDirect(country, city) : await getCountryPlacesDirect(country, 3000)
    return NextResponse.json(
      { places: places.map(toLightPlace) },
      { headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' } },
    )
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Failed' }, { status: 500 })
  }
}
