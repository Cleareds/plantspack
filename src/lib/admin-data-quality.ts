import { createAdminClient } from './supabase-admin'

/**
 * Server-side stats helpers behind /api/admin/data-quality/coverage[/<country>].
 *
 * Not exposed publicly — the API routes that import this module enforce
 * admin auth before responding. The country list mirrors the cards on
 * /admin/data-quality so the admin page and API stay in sync.
 */

export const COVERED_COUNTRIES = [
  'Belgium',
  'Croatia',
  'Portugal',
  'Spain',
  'Italy',
  'Greece',
  'Turkey',
  'Germany',
  'Brazil',
] as const

export type CoveredCountry = (typeof COVERED_COUNTRIES)[number]

export function matchCountry(input: string): CoveredCountry | null {
  return COVERED_COUNTRIES.find(c => c.toLowerCase() === input.toLowerCase()) ?? null
}

type Row = {
  id: string
  slug: string | null
  name: string
  city: string | null
  vegan_level: string | null
  is_verified: boolean | null
  main_image_url: string | null
  website: string | null
  phone: string | null
  address: string | null
  verification_method: string | null
  verification_level: number | null
  last_verified_at: string | null
}

async function fetchCountry(country: string): Promise<Row[]> {
  const sb = createAdminClient()
  const rows: Row[] = []
  let from = 0
  while (true) {
    const { data, error } = await sb.from('places')
      .select('id, slug, name, city, vegan_level, is_verified, main_image_url, website, phone, address, verification_method, verification_level, last_verified_at')
      .eq('country', country)
      .is('archived_at', null)
      .order('id')
      .range(from, from + 999)
    if (error) {
      console.error('[admin-data-quality]', country, error.message)
      break
    }
    if (!data?.length) break
    rows.push(...(data as Row[]))
    if (data.length < 1000) break
    from += 1000
  }
  return rows
}

function summarize(rows: Row[]) {
  const total = rows.length
  const fv = rows.filter(r => r.vegan_level === 'fully_vegan')
  const verified_fv = fv.filter(r => r.is_verified)
  const fv_with_image = fv.filter(r => r.main_image_url)
  const fv_with_website = fv.filter(r => r.website)
  const fv_with_phone = fv.filter(r => r.phone)
  const fv_with_address = fv.filter(r => r.address && r.address !== `${rows[0]?.city ?? ''}, `)
  const last_verified_at = fv
    .map(r => r.last_verified_at)
    .filter((v): v is string => !!v)
    .sort()
    .reverse()[0] ?? null
  return {
    total_places: total,
    fully_vegan: fv.length,
    verified_fv: verified_fv.length,
    fv_with_image: fv_with_image.length,
    fv_with_website: fv_with_website.length,
    fv_with_phone: fv_with_phone.length,
    fv_with_address: fv_with_address.length,
    verified_pct_of_fv: fv.length ? Math.round(verified_fv.length / fv.length * 100) : 0,
    image_pct_of_fv: fv.length ? Math.round(fv_with_image.length / fv.length * 100) : 0,
    verified_pct_of_total: total ? Math.round(verified_fv.length / total * 100) : 0,
    last_verified_at,
  }
}

export async function getCountryCoverage(country: CoveredCountry) {
  const rows = await fetchCountry(country)
  if (!rows.length) return null
  const summary = summarize(rows)
  const fv = rows.filter(r => r.vegan_level === 'fully_vegan')
  // City rollup
  const cityMap = new Map<string, { city: string; fully_vegan: number; verified: number; with_image: number }>()
  for (const r of fv) {
    const k = r.city ?? '(unknown)'
    const c = cityMap.get(k) ?? { city: k, fully_vegan: 0, verified: 0, with_image: 0 }
    c.fully_vegan++
    if (r.is_verified) c.verified++
    if (r.main_image_url) c.with_image++
    cityMap.set(k, c)
  }
  const cities = Array.from(cityMap.values()).sort((a, b) => b.fully_vegan - a.fully_vegan)
  const places = fv
    .sort((a, b) => (a.city ?? '').localeCompare(b.city ?? '') || a.name.localeCompare(b.name))
    .map(r => ({
      id: r.id,
      slug: r.slug,
      name: r.name,
      city: r.city,
      vegan_level: r.vegan_level,
      is_verified: !!r.is_verified,
      verification_method: r.verification_method,
      verification_level: r.verification_level,
      last_verified_at: r.last_verified_at,
      has_image: !!r.main_image_url,
      main_image_url: r.main_image_url,
      has_website: !!r.website,
      website: r.website,
      has_phone: !!r.phone,
      phone: r.phone,
      has_address: !!r.address,
    }))
  return { country, ...summary, cities, places }
}

export async function getAllCoverages() {
  const out: Array<{
    country: string
    total_places: number
    fully_vegan: number
    verified_fv: number
    verified_pct_of_fv: number
    image_pct_of_fv: number
    fv_with_website: number
    fv_with_phone: number
    fv_with_address: number
    last_verified_at: string | null
    sample_cities: { city: string; fully_vegan: number }[]
  }> = []
  for (const c of COVERED_COUNTRIES) {
    const rows = await fetchCountry(c)
    if (!rows.length) continue
    const summary = summarize(rows)
    const fv = rows.filter(r => r.vegan_level === 'fully_vegan')
    const byCity = new Map<string, number>()
    for (const r of fv) if (r.city) byCity.set(r.city, (byCity.get(r.city) ?? 0) + 1)
    const sample_cities = Array.from(byCity.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([city, fully_vegan]) => ({ city, fully_vegan }))
    out.push({
      country: c,
      total_places: summary.total_places,
      fully_vegan: summary.fully_vegan,
      verified_fv: summary.verified_fv,
      verified_pct_of_fv: summary.verified_pct_of_fv,
      image_pct_of_fv: summary.image_pct_of_fv,
      fv_with_website: summary.fv_with_website,
      fv_with_phone: summary.fv_with_phone,
      fv_with_address: summary.fv_with_address,
      last_verified_at: summary.last_verified_at,
      sample_cities,
    })
  }
  return out
}
