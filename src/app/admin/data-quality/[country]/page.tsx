import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase-server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { slugToDisplay } from '@/lib/places/slugify'
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

  // Auth
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/login')
  const { data: profile } = await supabase.from('users').select('role').eq('id', session.user.id).single()
  if (profile?.role !== 'admin') redirect('/')

  const admin = createServiceClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const countryName = slugToDisplay(countrySlug)

  // Try fetching with admin_notes; gracefully fall back if migration not applied.
  let places: PlaceRow[] = []
  let migrationMissing = false
  const cols = 'id, slug, name, city, country, vegan_level, category, subcategory, website, phone, address, description, main_image_url, images, opening_hours, review_count, average_rating, latitude, longitude, verification_level, verification_method, verification_status, last_verified_at, source'
  const initial: any = await admin
    .from('places')
    .select(`${cols}, admin_notes`)
    .eq('country', countryName)
    .is('archived_at', null)
    .limit(3000)
  if (initial.error?.code === '42703' || /admin_notes/.test(initial.error?.message || '')) {
    migrationMissing = true
    const fallback: any = await admin
      .from('places')
      .select(cols)
      .eq('country', countryName)
      .is('archived_at', null)
      .limit(3000)
    if (fallback.error) return <div className="p-8 text-red-600">Error: {fallback.error.message}</div>
    places = (fallback.data || []).map((r: any) => ({ ...r, admin_notes: null }))
  } else if (initial.error) {
    return <div className="p-8 text-red-600">Error: {initial.error.message}</div>
  } else {
    places = (initial.data || []) as PlaceRow[]
  }

  // Apply filters
  const filtered = places.filter(p => {
    if (filterVl && p.vegan_level !== filterVl) return false
    if (filterVerif === 'unverified' && (p.verification_level ?? 0) >= 3) return false
    if (filterVerif === 'verified' && (p.verification_level ?? 0) < 3) return false
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
  const cities = [...byCity.entries()].sort((a, b) => b[1].length - a[1].length).map(([city, list]) => ({
    city,
    list: list.sort((a, b) => veganOrderDesc(a.vegan_level, b.vegan_level) || a.name.localeCompare(b.name)),
  }))

  const all = places.length
  const verified = places.filter(r => (r.verification_level ?? 0) >= 3).length
  const fv = places.filter(r => r.vegan_level === 'fully_vegan').length
  const fvVerified = places.filter(r => r.vegan_level === 'fully_vegan' && (r.verification_level ?? 0) >= 3).length
  const noWebsite = places.filter(r => !r.website).length
  const noImage = places.filter(r => !r.main_image_url && !(r.images && r.images.length > 0)).length

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

      <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-4">
        <Stat label="Total" value={all} />
        <Stat label="Showing" value={filtered.length} valueClass="text-primary" />
        <Stat label="Fully vegan" value={fv} />
        <Stat label="✓ Verified" value={verified} valueClass="text-emerald-600" />
        <Stat label="FV verified" value={`${fvVerified}/${fv}`} />
        <Stat label="No web · No img" value={`${noWebsite} · ${noImage}`} valueClass="text-amber-600" />
      </div>

      <Suspense fallback={null}>
        <DataQualityFilters />
      </Suspense>

      <p className="text-xs text-on-surface-variant mb-6 max-w-3xl">
        Use the quick-links per row to verify a place exists: <strong>Maps</strong> opens Google Maps at the geocoded coords (or a fallback search), <strong>Google</strong> searches the place name + city, <strong>HC</strong> opens HappyCow's search. Type notes into the textarea (auto-saves on blur). Click <strong>Confirm</strong> when you've done what you can to verify the place exists and the data looks good. Click <strong>Closed</strong> if the place is permanently closed (soft-archives the row).
      </p>

      {cities.map(({ city, list }) => {
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
                    <DataQualityRow key={p.id} place={p as any} />
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
