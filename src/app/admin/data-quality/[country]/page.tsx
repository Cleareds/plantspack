import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase-server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { slugToDisplay } from '@/lib/places/slugify'
import { matchCountry } from '@/lib/admin-data-quality'
import { isOddCity, suggestCity } from '@/lib/places/odd-city'
import { toSlug } from '@/lib/slug'
import { veganLevelOrder } from '@/lib/vegan-level'
import DataQualityRow from '@/components/admin/DataQualityRow'
import DataQualityFilters from '@/components/admin/DataQualityFilters'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ country: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

interface PlaceRow {
  id: string
  slug: string | null
  name: string
  city: string | null
  country: string
  vegan_level: string | null
  category: string | null
  subcategory: string | null
  website: string | null
  phone: string | null
  address: string | null
  description: string | null
  main_image_url: string | null
  images: string[] | null
  opening_hours: any
  review_count: number | null
  average_rating: number | null
  latitude: number | null
  longitude: number | null
  verification_level: number | null
  verification_method: string | null
  verification_status: string | null
  last_verified_at: string | null
  source: string | null
  admin_notes: string | null
}

const veganOrderDesc = (a: string | null, b: string | null) => veganLevelOrder(b) - veganLevelOrder(a)

export default async function CountryDataQuality({ params, searchParams }: PageProps) {
  const { country: countrySlug } = await params
  const sp = await searchParams
  const filterVl = (typeof sp.vl === 'string' ? sp.vl : '') || ''
  const filterVerif = (typeof sp.verif === 'string' ? sp.verif : '') || ''
  const filterFlag = (typeof sp.flag === 'string' ? sp.flag : '') || ''
  const filterCity = (typeof sp.city === 'string' ? sp.city : '') || ''
  const showAllCities = sp.all === '1'

  // Auth
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/login')
  const { data: profile } = await supabase.from('users').select('role').eq('id', session.user.id).single()
  if (profile?.role !== 'admin') redirect('/')

  const admin = createServiceClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  // Resolve against the live country list: title-casing the slug breaks
  // on "Bosnia and Herzegovina", "Côte d'Ivoire" and similar.
  const countryName = (await matchCountry(countrySlug)) ?? slugToDisplay(countrySlug)

  // PostgREST caps every read at 1000 rows, so page by id. Germany has
  // 12K live rows; the old single .limit(3000) read silently showed 1000.
  let places: PlaceRow[] = []
  let migrationMissing = false
  const cols = 'id, slug, name, city, country, vegan_level, category, subcategory, website, phone, address, description, main_image_url, images, opening_hours, review_count, average_rating, latitude, longitude, verification_level, verification_method, verification_status, last_verified_at, source'
  const fetchAll = async (select: string) => {
    const out: any[] = []
    let lastId: string | null = null
    for (let i = 0; i < 40; i++) {
      let q = admin.from('places').select(select).eq('country', countryName).is('archived_at', null).order('id').limit(1000)
      if (lastId) q = q.gt('id', lastId)
      const res: any = await q
      if (res.error) return { error: res.error, data: out }
      const rows = res.data || []
      out.push(...rows)
      if (rows.length < 1000) break
      lastId = rows[rows.length - 1].id
    }
    return { error: null, data: out }
  }
  const initial: any = await fetchAll(`${cols}, admin_notes`)
  if (initial.error?.code === '42703' || /admin_notes/.test(initial.error?.message || '')) {
    migrationMissing = true
    const fallback: any = await fetchAll(cols)
    if (fallback.error) return <div className="p-8 text-red-600">Error: {fallback.error.message}</div>
    places = (fallback.data || []).map((r: any) => ({ ...r, admin_notes: null }))
  } else if (initial.error) {
    return <div className="p-8 text-red-600">Error: {initial.error.message}</div>
  } else {
    places = (initial.data || []) as PlaceRow[]
  }

  if (places.length === 0) {
    return (
      <div className="p-8 max-w-3xl mx-auto">
        <Link href="/admin/data-quality" className="text-sm text-primary hover:underline">← Data Quality</Link>
        <h1 className="text-2xl font-bold mt-3 mb-2">No live places for “{countryName}”</h1>
        <p className="text-sm text-on-surface-variant">The URL slug did not match any value in places.country. Pick the country from the Country audits table instead.</p>
      </div>
    )
  }

  // Apply filters
  const filtered = places.filter(p => {
    if (filterVl && p.vegan_level !== filterVl) return false
    if (filterVerif === 'unverified' && (p.verification_level ?? 0) >= 3) return false
    if (filterVerif === 'verified' && (p.verification_level ?? 0) < 3) return false
    if (filterCity && (p.city || '(no city)') !== filterCity) return false
    if (filterFlag === 'odd_city' && !isOddCity(p.city)) return false
    if (filterFlag === 'no_website' && p.website) return false
    if (filterFlag === 'no_image' && (p.main_image_url || (p.images && p.images.length > 0))) return false
    if (filterFlag === 'thin_desc' && (p.description || '').length > 120) return false
    // audit_flagged: places marked by an audit run (admin_notes starts with "audit-")
    if (filterFlag === 'audit_flagged' && !((p as any).admin_notes || '').startsWith('audit-')) return false
    // suspect_fv: fully_vegan that hasn't passed admin review (level<3 or method=ai_verified)
    if (filterFlag === 'suspect_fv') {
      if (p.vegan_level !== 'fully_vegan') return false
      if ((p.verification_level ?? 0) >= 3 && p.verification_method === 'admin_review') return false
    }
    return true
  })

  // Group by city, sort cities by row count desc, sort rows inside by vegan_level desc
  const byCity = new Map<string, PlaceRow[]>()
  for (const r of filtered) {
    const c = r.city || '(no city)'
    if (!byCity.has(c)) byCity.set(c, [])
    byCity.get(c)!.push(r)
  }
  const isAuditFlagged = (r: PlaceRow) => ((r as any).admin_notes || '').startsWith('audit-')
  const cities = [...byCity.entries()].sort((a, b) => b[1].length - a[1].length).map(([city, list]) => ({
    city,
    list: list.sort((a, b) => {
      // Audit-flagged rows pin to the top of each city.
      const af = (isAuditFlagged(a) ? 0 : 1) - (isAuditFlagged(b) ? 0 : 1)
      if (af !== 0) return af
      return veganOrderDesc(a.vegan_level, b.vegan_level) || a.name.localeCompare(b.name)
    }),
  }))

  const all = places.length
  const verified = places.filter(r => (r.verification_level ?? 0) >= 3).length
  const fv = places.filter(r => r.vegan_level === 'fully_vegan').length
  const fvVerified = places.filter(r => r.vegan_level === 'fully_vegan' && (r.verification_level ?? 0) >= 3).length
  const noWebsite = places.filter(r => !r.website).length
  const noImage = places.filter(r => !r.main_image_url && !(r.images && r.images.length > 0)).length
  const oddCities = places.filter(r => isOddCity(r.city)).length
  const humanVerified = places.filter(r => r.verification_method === 'admin_review').length
  const checkedPct = all ? Math.round((verified / all) * 100) : 0
  const fvOpen = fv - fvVerified

  // City index over ALL rows (not the filtered view) so the jump list stays stable.
  const cityIndex = new Map<string, { n: number; fvOpen: number; odd: boolean }>()
  for (const r of places) {
    const c = r.city || '(no city)'
    const e = cityIndex.get(c) ?? { n: 0, fvOpen: 0, odd: isOddCity(r.city) }
    e.n++
    if (r.vegan_level === 'fully_vegan' && (r.verification_level ?? 0) < 3) e.fvOpen++
    cityIndex.set(c, e)
  }
  const cityChips = [...cityIndex.entries()].sort((a, b) => b[1].n - a[1].n)

  // Big countries: render the top cities only unless a city is picked or
  // "all" is asked for, so a 12K-row page does not freeze the browser.
  const CITY_LIMIT = 12
  const bigView = !filterCity && !showAllCities && filtered.length > 1500
  const visibleCities = bigView ? cities.slice(0, CITY_LIMIT) : cities
  const qsWith = (patch: Record<string, string | null>) => {
    const p = new URLSearchParams()
    for (const [k, v] of Object.entries(sp)) if (typeof v === 'string' && v) p.set(k, v)
    for (const [k, v] of Object.entries(patch)) { if (v == null) p.delete(k); else p.set(k, v) }
    const q = p.toString()
    return `/admin/data-quality/${countrySlug}${q ? '?' + q : ''}`
  }

  return (
    <div className="p-6 max-w-[120rem] mx-auto">
      <nav className="text-sm text-on-surface-variant mb-4">
        <Link href="/admin" className="hover:text-primary">Admin</Link>
        <span className="mx-2">/</span>
        <Link href="/admin/data-quality" className="hover:text-primary">Data Quality</Link>
        <span className="mx-2">/</span>
        <span className="font-medium">{countryName}</span>
      </nav>

      <h1 className="text-2xl font-bold mb-2">Data Quality — {countryName}</h1>

      {migrationMissing && (
        <div className="mb-4 p-3 rounded bg-amber-50 border border-amber-200 text-xs text-amber-900">
          <strong>Migration pending:</strong> apply <code>20260501120000_admin_notes.sql</code> to enable per-place notes (textarea will be read-only until then).
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3 mb-3">
        <Stat label="Total" value={all} />
        <Stat label="Showing" value={filtered.length} valueClass="text-primary" />
        <Stat label="Checked (L3+)" value={`${verified} · ${checkedPct}%`} valueClass="text-emerald-600" />
        <Stat label="Human ✓ (admin_review)" value={humanVerified} valueClass="text-emerald-700" />
        <Stat label="FV checked" value={`${fvVerified}/${fv}`} />
        <Stat label="FV open" value={fvOpen} valueClass={fvOpen ? 'text-amber-600' : 'text-on-surface'} />
        <Stat label="No web · No img" value={`${noWebsite} · ${noImage}`} valueClass="text-amber-600" />
        <Stat label="Odd city labels" value={oddCities} valueClass={oddCities ? 'text-amber-600' : 'text-on-surface'} />
      </div>

      <div className="mb-4 flex flex-wrap gap-2 text-xs">
        <span className="text-on-surface-variant font-medium self-center">Start with:</span>
        <Link href={qsWith({ vl: 'fully_vegan', verif: 'unverified', flag: null })} className="px-2 py-1 rounded bg-amber-100 text-amber-900 hover:bg-amber-200">{fvOpen} unchecked fully vegan</Link>
        {oddCities > 0 && <Link href={qsWith({ flag: 'odd_city', vl: null, verif: null })} className="px-2 py-1 rounded bg-amber-100 text-amber-900 hover:bg-amber-200">{oddCities} odd city labels</Link>}
        <Link href={qsWith({ vl: 'mostly_vegan', verif: 'unverified', flag: null })} className="px-2 py-1 rounded bg-surface-container hover:bg-surface-container-high">unchecked mostly vegan</Link>
        <Link href={`/vegan-places/${toSlug(countryName)}`} target="_blank" className="px-2 py-1 rounded bg-surface-container hover:bg-surface-container-high">public country hub ↗</Link>
        {(filterCity || filterFlag || filterVl || filterVerif) && <Link href={`/admin/data-quality/${countrySlug}`} className="px-2 py-1 rounded text-primary hover:underline">clear all filters</Link>}
      </div>

      <details className="mb-4" open={cityChips.length <= 30}>
        <summary className="text-xs text-on-surface-variant cursor-pointer mb-2">Cities ({cityChips.length}) · amber = unchecked fully vegan · dashed = odd label</summary>
        <div className="flex flex-wrap gap-1.5">
          {cityChips.map(([c, e]) => (
            <Link key={c} href={qsWith({ city: filterCity === c ? null : c })}
              className={`px-2 py-0.5 rounded text-[11px] ${filterCity === c ? 'bg-primary text-on-primary-btn' : 'bg-surface-container hover:bg-surface-container-high'} ${e.odd ? 'border border-dashed border-amber-500' : ''}`}>
              {c} <span className="opacity-60">{e.n}</span>{e.fvOpen > 0 && <span className="ml-1 text-amber-700">·{e.fvOpen}</span>}
            </Link>
          ))}
        </div>
      </details>

      <Suspense fallback={null}>
        <DataQualityFilters />
      </Suspense>

      <p className="text-xs text-on-surface-variant mb-6 max-w-3xl">
        Use the quick-links per row to verify a place exists: <strong>Maps</strong> opens Google Maps at the geocoded coords (or a fallback search), <strong>Google</strong> searches the place name + city, <strong>HC</strong> opens HappyCow's search. Type notes into the textarea (auto-saves on blur). Click <strong>Confirm</strong> when you've done what you can to verify the place exists and the data looks good. Click <strong>Closed</strong> if the place is permanently closed (soft-archives the row). Odd city labels (amber) have a one-click fix to the suggested town name; the place then shows up on that town's public hub.
      </p>

      {bigView && (
        <p className="mb-4 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded p-2">
          Showing the {CITY_LIMIT} largest of {cities.length} cities to keep the page fast. Pick a city above or a filter, or <Link href={qsWith({ all: '1' })} className="underline">show every city</Link>.
        </p>
      )}

      {visibleCities.map(({ city, list }) => {
        const cityFv = list.filter(r => r.vegan_level === 'fully_vegan').length
        const cityVer = list.filter(r => (r.verification_level ?? 0) >= 3).length
        return (
          <section key={city} className="mb-8">
            <h2 className="text-lg font-semibold mb-2">
              {city} <span className="text-sm font-normal text-on-surface-variant">— {list.length} places · {cityFv} FV · {cityVer} ✓</span>
            </h2>
            <div className="overflow-x-auto ghost-border rounded-lg">
              <table className="min-w-full text-sm">
                <thead className="bg-surface-container-low text-xs uppercase text-on-surface-variant">
                  <tr>
                    <th className="px-3 py-2 text-left">Place</th>
                    <th className="px-3 py-2 text-left">Level / Data</th>
                    <th className="px-3 py-2 text-left">Verify links</th>
                    <th className="px-3 py-2 text-left">Notes</th>
                    <th className="px-3 py-2 text-left">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map(p => (
                    <DataQualityRow key={p.id} place={p as any} citySuggestion={isOddCity(p.city) ? (suggestCity(p.city!) ?? '') : null} />
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )
      })}
    </div>
  )
}

function Stat({ label, value, valueClass }: { label: string; value: string | number; valueClass?: string }) {
  return (
    <div className="bg-surface-container-lowest ghost-border rounded-lg p-3">
      <div className="text-xs text-on-surface-variant">{label}</div>
      <div className={`text-xl font-bold ${valueClass || 'text-on-surface'}`}>{value}</div>
    </div>
  )
}
