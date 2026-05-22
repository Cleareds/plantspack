import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase-server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { veganLevelOrder } from '@/lib/vegan-level'
import DataQualityRow from '@/components/admin/DataQualityRow'
import DataQualityFilters from '@/components/admin/DataQualityFilters'

export const dynamic = 'force-dynamic'

interface PageProps {
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

// Match the destination list in src/app/vegan-summer-destinations/page.tsx
// plus the thin-but-targeted destinations we sourced new places for. These
// are the cities the summer hub either links to today or plans to link to
// after the batch import lands.
const HUB_CITIES: Array<[string, string]> = [
  // Italy
  ['Italy', 'Rome'], ['Italy', 'Florence'], ['Italy', 'Naples'], ['Italy', 'Venice'],
  ['Italy', 'Palermo'], ['Italy', 'Catania'], ['Italy', 'Amalfi Coast'], ['Italy', 'Capri'],
  // Spain
  ['Spain', 'Barcelona'], ['Spain', 'Madrid'], ['Spain', 'Valencia'], ['Spain', 'Ibiza'],
  ['Spain', 'Palma de Mallorca'], ['Spain', 'Santa Cruz de Tenerife'],
  // Greece
  ['Greece', 'Athens'], ['Greece', 'Santorini'], ['Greece', 'Mykonos'], ['Greece', 'Naxos'],
  ['Greece', 'Heraklion'], ['Greece', 'Corfu'],
  // Portugal
  ['Portugal', 'Lisbon'], ['Portugal', 'Porto'], ['Portugal', 'Faro'], ['Portugal', 'Lagos'],
  ['Portugal', 'Funchal'], ['Portugal', 'Albufeira'], ['Portugal', 'Tavira'],
  // Croatia
  ['Croatia', 'Zagreb'], ['Croatia', 'Split'], ['Croatia', 'Dubrovnik'], ['Croatia', 'Pula'],
  ['Croatia', 'Hvar'], ['Croatia', 'Korčula'], ['Croatia', 'Bol'], ['Croatia', 'Vis'],
  ['Croatia', 'Rovinj'], ['Croatia', 'Zadar'],
  // Turkey
  ['Turkey', 'Istanbul'], ['Turkey', 'Antalya'], ['Turkey', 'Kas'], ['Turkey', 'Fethiye'],
  ['Turkey', 'Bodrum'],
]

const veganOrderDesc = (a: string | null, b: string | null) => veganLevelOrder(b) - veganLevelOrder(a)

export default async function SummerHubDataQuality({ searchParams }: PageProps) {
  const sp = await searchParams
  const filterVl = (typeof sp.vl === 'string' ? sp.vl : '') || ''
  const filterVerif = (typeof sp.verif === 'string' ? sp.verif : '') || ''
  const filterFlag = (typeof sp.flag === 'string' ? sp.flag : '') || ''
  // Default to showing every place in the hub cities (not just FV/MV). The
  // page is the review surface for ALL hub-city venues. Opt into the
  // narrower "FV + MV only" curation view by passing ?fvmv=1.
  const fvmvOnly = sp.fvmv === '1'

  // Auth
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/login')
  const { data: profile } = await supabase.from('users').select('role').eq('id', session.user.id).single()
  if (profile?.role !== 'admin') redirect('/')

  const admin = createServiceClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

  const cols = 'id, slug, name, city, country, vegan_level, category, subcategory, website, phone, address, description, main_image_url, images, opening_hours, review_count, average_rating, latitude, longitude, verification_level, verification_method, verification_status, last_verified_at, source'

  // Fetch all hub cities in one round-trip per country. Each country query
  // restricts via .in('city', cityList) so Supabase only returns hub rows.
  // Using Record<> not Map<> per project deployment rule — TS `Map<string,X>`
  // crashes the build's TypeScript pass (memory: feedback_deployment.md).
  const byCountry: Record<string, string[]> = {}
  for (const [c, city] of HUB_CITIES) {
    if (!byCountry[c]) byCountry[c] = []
    byCountry[c].push(city)
  }

  let places: PlaceRow[] = []
  let migrationMissing = false
  for (const [country, cities] of Object.entries(byCountry)) {
    const r: any = await admin
      .from('places')
      .select(`${cols}, admin_notes`)
      .eq('country', country)
      .in('city', cities)
      .is('archived_at', null)
      .limit(3000)
    if (r.error?.code === '42703' || /admin_notes/.test(r.error?.message || '')) {
      migrationMissing = true
      const fb: any = await admin
        .from('places')
        .select(cols)
        .eq('country', country)
        .in('city', cities)
        .is('archived_at', null)
        .limit(3000)
      if (fb.error) return <div className="p-8 text-red-600">Error: {fb.error.message}</div>
      places = places.concat((fb.data || []).map((x: any) => ({ ...x, admin_notes: null })))
    } else if (r.error) {
      return <div className="p-8 text-red-600">Error: {r.error.message}</div>
    } else {
      places = places.concat(r.data || [])
    }
  }

  // Apply filters
  const filtered = places.filter(p => {
    // Optional priority filter: FV + MV only when ?fvmv=1 is set. By default,
    // every place in the hub cities is included.
    if (fvmvOnly && !filterVl) {
      if (p.vegan_level !== 'fully_vegan' && p.vegan_level !== 'mostly_vegan') return false
    }
    if (filterVl && p.vegan_level !== filterVl) return false
    if (filterVerif === 'unverified' && (p.verification_level ?? 0) >= 3) return false
    if (filterVerif === 'verified' && (p.verification_level ?? 0) < 3) return false
    if (filterFlag === 'no_website' && p.website) return false
    if (filterFlag === 'no_image' && (p.main_image_url || (p.images && p.images.length > 0))) return false
    if (filterFlag === 'thin_desc' && (p.description || '').length > 120) return false
    if (filterFlag === 'audit_flagged' && !((p as any).admin_notes || '').startsWith('audit-')) return false
    if (filterFlag === 'suspect_fv') {
      if (p.vegan_level !== 'fully_vegan') return false
      if ((p.verification_level ?? 0) >= 3 && p.verification_method === 'admin_review') return false
    }
    return true
  })

  // Group by destination (country + city) so islands stay separate even
  // when same country has multiple sections. Record over Map per project rule.
  const byDest: Record<string, PlaceRow[]> = {}
  for (const r of filtered) {
    const key = `${r.country} · ${r.city || '(no city)'}`
    if (!byDest[key]) byDest[key] = []
    byDest[key].push(r)
  }
  const isAuditFlagged = (r: PlaceRow) => ((r as any).admin_notes || '').startsWith('audit-')
  const dests = Object.entries(byDest)
    .sort((a, b) => b[1].length - a[1].length)
    .map(([key, list]) => ({
      key,
      list: list.sort((a, b) => {
        const af = (isAuditFlagged(a) ? 0 : 1) - (isAuditFlagged(b) ? 0 : 1)
        if (af !== 0) return af
        return veganOrderDesc(a.vegan_level, b.vegan_level) || a.name.localeCompare(b.name)
      }),
    }))

  const all = places.length
  const fv = places.filter(r => r.vegan_level === 'fully_vegan').length
  const mv = places.filter(r => r.vegan_level === 'mostly_vegan').length
  const verified = places.filter(r => (r.verification_level ?? 0) >= 3).length
  const fvVerified = places.filter(r => r.vegan_level === 'fully_vegan' && (r.verification_level ?? 0) >= 3).length
  const mvVerified = places.filter(r => r.vegan_level === 'mostly_vegan' && (r.verification_level ?? 0) >= 3).length
  const blogImports = places.filter(r => r.source?.startsWith('summer-blogs-')).length

  return (
    <div className="p-6 max-w-[120rem] mx-auto">
      <nav className="text-sm text-on-surface-variant mb-4">
        <Link href="/admin" className="hover:text-primary">Admin</Link>
        <span className="mx-2">/</span>
        <Link href="/admin/data-quality" className="hover:text-primary">Data Quality</Link>
        <span className="mx-2">/</span>
        <span className="font-medium">Summer Hub</span>
      </nav>

      <div className="flex items-baseline justify-between mb-2">
        <h1 className="text-2xl font-bold">Data Quality — Summer Hub Destinations</h1>
        <Link href="/vegan-summer-destinations" className="text-sm text-primary hover:underline">
          View live hub →
        </Link>
      </div>
      <p className="text-sm text-on-surface-variant mb-4">
        Aggregated review surface for every place in the {HUB_CITIES.length}{' '}
        Mediterranean destinations linked from <code>/vegan-summer-destinations</code>.
        Includes all vegan tiers across all sources (existing OSM imports,
        blog-sourced batch, manual additions).
        {' '}<Link href={fvmvOnly ? '?' : '?fvmv=1'} className="text-primary hover:underline font-medium">
          {fvmvOnly ? 'Show all tiers' : 'Show only fully-vegan + mostly-vegan (review priority)'}
        </Link>
      </p>

      {migrationMissing && (
        <div className="mb-4 p-3 rounded bg-amber-50 border border-amber-200 text-xs text-amber-900">
          <strong>Migration pending:</strong> apply <code>20260501120000_admin_notes.sql</code> to enable per-place notes.
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-7 gap-3 mb-4">
        <Stat label="Total in hub" value={all} />
        <Stat label="Showing" value={filtered.length} valueClass="text-primary" />
        <Stat label="Fully vegan" value={fv} />
        <Stat label="FV verified" value={`${fvVerified}/${fv}`} valueClass="text-emerald-600" />
        <Stat label="Mostly vegan" value={mv} />
        <Stat label="MV verified" value={`${mvVerified}/${mv}`} valueClass="text-emerald-600" />
        <Stat label="Blog-sourced" value={blogImports} valueClass="text-amber-600" />
      </div>

      <Suspense fallback={null}>
        <DataQualityFilters />
      </Suspense>

      <p className="text-xs text-on-surface-variant mb-6 max-w-4xl">
        Workflow: open <strong>Maps</strong> + <strong>HC</strong> to verify the
        place exists at its claimed city, sanity-check the vegan tier (FV =
        truly 100% vegan menu, MV = 85%+ with a few non-vegan items, never
        guess up). Add notes, then click <strong>Confirm</strong>. Use
        <strong> Closed</strong> for permanently-shut places (soft-archives
        the row). Blog-sourced rows ({blogImports}) carry{' '}
        <code>source=summer-blogs-2026-05</code> and start at verification
        level 2 — they show up here as &quot;unverified&quot; until you confirm.
      </p>

      {dests.length === 0 && (
        <p className="text-sm text-on-surface-variant italic">
          No rows match the current filters. Try <Link href="?all=1" className="text-primary underline">showing all tiers</Link>.
        </p>
      )}

      {dests.map(({ key, list }) => {
        const cityFv = list.filter(r => r.vegan_level === 'fully_vegan').length
        const cityVer = list.filter(r => (r.verification_level ?? 0) >= 3).length
        return (
          <section key={key} className="mb-8">
            <h2 className="text-lg font-semibold mb-2">
              {key} <span className="text-sm font-normal text-on-surface-variant">— {list.length} places · {cityFv} FV · {cityVer} ✓</span>
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
