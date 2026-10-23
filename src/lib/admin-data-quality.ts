import { createAdminClient } from './supabase-admin'
import { toSlug } from './slug'

/**
 * Server-side stats helpers behind /api/admin/data-quality/coverage[/<country>].
 *
 * Not exposed publicly — the API routes that import this module enforce
 * admin auth before responding. Countries come from the live DB (any
 * country with a place), not a hard-coded list.
 */

export type CountrySummary = {
  country: string
  total: number
  fully_vegan: number
  fv_checked: number
  mostly_vegan: number
  checked: number
  human_verified: number
  no_website: number
  no_image: number
  odd_city: number
  community: number
  last_verified_at: string | null
  cities: number
}

/**
 * Every country with at least one live place, with its data-quality
 * rollup. One aggregate RPC (admin_country_dq_summary, service role only)
 * instead of paging 52K rows. Cached for 60 s per server instance so the
 * admin page and the per-country resolver do not re-run it on every hit.
 */
let summaryCache: { at: number; rows: CountrySummary[] } | null = null
export async function getCountrySummaries(force = false): Promise<CountrySummary[]> {
  if (!force && summaryCache && Date.now() - summaryCache.at < 60_000) return summaryCache.rows
  const sb = createAdminClient()
  const { data, error } = await sb.rpc('admin_country_dq_summary')
  if (error) {
    console.error('[admin-data-quality] summary', error.message)
    return summaryCache?.rows ?? []
  }
  const rows = ((data ?? []) as any[]).map(r => ({
    country: r.country,
    total: Number(r.total),
    fully_vegan: Number(r.fully_vegan),
    fv_checked: Number(r.fv_checked),
    mostly_vegan: Number(r.mostly_vegan),
    checked: Number(r.checked),
    human_verified: Number(r.human_verified),
    no_website: Number(r.no_website),
    no_image: Number(r.no_image),
    odd_city: Number(r.odd_city),
    community: Number(r.community),
    last_verified_at: r.last_verified_at ?? null,
    cities: Number(r.cities),
  }))
  summaryCache = { at: Date.now(), rows }
  return rows
}

/**
 * Resolve a URL slug ("ukraine", "bosnia-and-herzegovina", "Ukraine") to
 * the exact country value stored in places.country. Title-casing the slug
 * breaks on "and", "of", "d'Ivoire" and similar, so match against the
 * live country list instead.
 */
export async function matchCountry(input: string): Promise<string | null> {
  const want = toSlug(decodeURIComponent(input))
  const rows = await getCountrySummaries()
  const hit = rows.find(r => toSlug(r.country) === want)
    ?? rows.find(r => r.country.toLowerCase() === input.toLowerCase())
  return hit?.country ?? null
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

export async function getCountryCoverage(country: string) {
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
  const summaries = await getCountrySummaries()
  const audited = summaries.filter(s => s.checked > 0 || s.total >= 200).map(s => s.country)
  for (const c of audited) {
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
