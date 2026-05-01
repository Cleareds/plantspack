import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase-server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { slugifyCityOrCountry, slugToDisplay } from '@/lib/places/slugify'
import VerifyPlaceButton from '@/components/admin/VerifyPlaceButton'
import { VEGAN_LEVEL_LABEL, veganLevelOrder } from '@/lib/vegan-level'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ country: string }>
}

interface PlaceRow {
  id: string
  slug: string | null
  name: string
  city: string | null
  vegan_level: string | null
  category: string | null
  website: string | null
  address: string | null
  verification_level: number | null
  verification_method: string | null
  verification_status: string | null
  source: string | null
}

const veganOrderDesc = (a: string | null, b: string | null) =>
  veganLevelOrder(b) - veganLevelOrder(a)

export default async function CountryDataQuality({ params }: PageProps) {
  const { country: countrySlug } = await params

  // Auth — admin only
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/login')
  const { data: profile } = await supabase.from('users').select('role').eq('id', session.user.id).single()
  if (profile?.role !== 'admin') redirect('/')

  const admin = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  // Resolve slug → display country name (matches places.country casing)
  const countryName = slugToDisplay(countrySlug)

  // Pull every active place in the country. Belgium is ~565 rows so 2000
  // is plenty; for larger countries we'll paginate by city later.
  const { data: places, error } = await admin
    .from('places')
    .select('id, slug, name, city, vegan_level, category, website, address, verification_level, verification_method, verification_status, source')
    .ilike('country', countryName)
    .is('archived_at', null)
    .limit(3000)
  if (error) {
    return <div className="p-8 text-red-600">Error: {error.message}</div>
  }

  const rows = (places || []) as PlaceRow[]

  // Group by city, sort cities by row count desc, sort rows inside each
  // city by vegan_level desc then name.
  const byCity = new Map<string, PlaceRow[]>()
  for (const r of rows) {
    const c = r.city || '(no city)'
    if (!byCity.has(c)) byCity.set(c, [])
    byCity.get(c)!.push(r)
  }
  const cities = [...byCity.entries()]
    .sort((a, b) => b[1].length - a[1].length)
    .map(([city, list]) => ({
      city,
      list: list.sort((a, b) => veganOrderDesc(a.vegan_level, b.vegan_level) || a.name.localeCompare(b.name)),
    }))

  const total = rows.length
  const verified = rows.filter(r => (r.verification_level ?? 0) >= 3).length
  const level2 = rows.filter(r => r.verification_level === 2).length
  const level1 = rows.filter(r => r.verification_level === 1).length
  const fv = rows.filter(r => r.vegan_level === 'fully_vegan').length
  const fvVerified = rows.filter(r => r.vegan_level === 'fully_vegan' && (r.verification_level ?? 0) >= 3).length
  const noWebsite = rows.filter(r => !r.website).length

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <nav className="text-sm text-on-surface-variant mb-4">
        <Link href="/admin" className="hover:text-primary">Admin</Link>
        <span className="mx-2">/</span>
        <Link href="/admin/data-quality" className="hover:text-primary">Data Quality</Link>
        <span className="mx-2">/</span>
        <span className="font-medium">{countryName}</span>
      </nav>

      <h1 className="text-2xl font-bold mb-2">Data Quality — {countryName}</h1>

      <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-6">
        <Stat label="Total" value={total} />
        <Stat label="Fully vegan" value={fv} />
        <Stat label="✓ Admin verified" value={verified} valueClass="text-emerald-600" />
        <Stat label="FV admin-verified" value={`${fvVerified} / ${fv}`} />
        <Stat label="AI-verified (lvl 2)" value={level2} />
        <Stat label="No website" value={noWebsite} valueClass="text-amber-600" />
      </div>

      <p className="text-sm text-on-surface-variant mb-6 max-w-3xl">
        This view lists every active place in {countryName}, grouped by city
        (most-populated first), then by vegan level (fully vegan first). Use
        the <strong>Confirm exists</strong> button after you have done what
        you can to verify the place: opened the website, checked Google
        Maps, looked at recent reviews. Confirming sets the verification
        ladder to level 3 (the maximum), and the place page will display a
        "Verified by PlantsPack" badge.
      </p>

      {cities.map(({ city, list }) => {
        const cityFv = list.filter(r => r.vegan_level === 'fully_vegan').length
        const cityVerified = list.filter(r => (r.verification_level ?? 0) >= 3).length
        return (
          <section key={city} className="mb-8">
            <h2 className="text-lg font-semibold mb-2">
              {city} <span className="text-sm font-normal text-on-surface-variant">— {list.length} places · {cityFv} fully vegan · {cityVerified} ✓ admin-verified</span>
            </h2>
            <div className="overflow-x-auto ghost-border rounded-lg">
              <table className="min-w-full text-sm">
                <thead className="bg-surface-container-low text-xs uppercase text-on-surface-variant">
                  <tr>
                    <th className="px-3 py-2 text-left">Place</th>
                    <th className="px-3 py-2 text-left">Vegan level</th>
                    <th className="px-3 py-2 text-left">Website</th>
                    <th className="px-3 py-2 text-left">Source</th>
                    <th className="px-3 py-2 text-left">Verification</th>
                    <th className="px-3 py-2 text-left">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map(p => {
                    const lvl = p.verification_level ?? 0
                    const isVerified = lvl >= 3
                    return (
                      <tr key={p.id} className={`border-t border-outline-variant/15 ${isVerified ? 'bg-emerald-50/40' : ''}`}>
                        <td className="px-3 py-2">
                          <Link href={`/place/${p.slug || p.id}`} target="_blank" className="font-medium text-on-surface hover:text-primary">{p.name}</Link>
                          {p.address && <div className="text-xs text-on-surface-variant truncate max-w-xs">{p.address}</div>}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          {p.vegan_level
                            ? <span className={`text-xs px-2 py-0.5 rounded ${p.vegan_level === 'fully_vegan' ? 'bg-emerald-100 text-emerald-800' : p.vegan_level === 'mostly_vegan' ? 'bg-teal-100 text-teal-800' : 'bg-stone-100 text-stone-700'}`}>{VEGAN_LEVEL_LABEL[p.vegan_level] || p.vegan_level}</span>
                            : <span className="text-xs text-on-surface-variant">—</span>}
                        </td>
                        <td className="px-3 py-2 max-w-[14rem] truncate">
                          {p.website
                            ? <a href={p.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline text-xs">{p.website.replace(/^https?:\/\//, '').slice(0, 30)}</a>
                            : <span className="text-xs text-amber-600">— no website</span>}
                        </td>
                        <td className="px-3 py-2 text-xs text-on-surface-variant whitespace-nowrap">{p.source || '—'}</td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          <span className="text-xs">lvl {lvl}</span>
                          {p.verification_method && <span className="text-[10px] text-on-surface-variant ml-1">({p.verification_method})</span>}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          <VerifyPlaceButton placeId={p.id} initialVerified={isVerified} />
                        </td>
                      </tr>
                    )
                  })}
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
